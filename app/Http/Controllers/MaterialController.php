<?php

namespace App\Http\Controllers;

use App\Models\CashOut;
use App\Models\Material;
use App\Models\ProjectSupplier;
use App\Models\Supplier;
use App\Traits\ApiResponse;
use App\Traits\HasMainBalance;
use App\Traits\SyncsPartnerBalances;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class MaterialController extends Controller
{
    use ApiResponse, HasMainBalance, SyncsPartnerBalances;

    const PATH = '/materials';

    public function index(Request $request)
    {
        $search = $request->get('search', '');
        $projectId = $request->get('projectId');
        $supplierId = $request->get('supplierId');
        $page = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 10);
        $skip = ($page - 1) * $limit;
        $startDate = $request->get('startDate');
        $endDate = $request->get('endDate');

        $query = Material::with(['supplier:id,name', 'project:id,name,code', 'cashOut:id,materialId']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")->orWhere('category', 'like', "%{$search}%");
            });
        }
        if ($projectId) $query->where('projectId', $projectId);
        if ($supplierId) $query->where('supplierId', $supplierId);
        if ($startDate) $query->where('purchaseDate', '>=', \Carbon\Carbon::parse($startDate)->startOfDay());
        if ($endDate) $query->where('purchaseDate', '<=', \Carbon\Carbon::parse($endDate)->endOfDay());

        $total = $query->count();
        $materials = $query->orderBy('created_at', 'desc')->skip($skip)->take($limit)->get();

        return $this->apiPaginated('materials', $materials, $total, $page, $limit,
            'Materials retrieved successfully', self::PATH);
    }

    public function store(Request $request)
    {
        if (Auth::user()->role === 'ACCOUNTANT') {
            return $this->apiForbidden(self::PATH, 'Accountants are not permitted to register daily material inventory records');
        }

        $data = $request->validate([
            'name' => 'required|string',
            'category' => 'required|string',
            'quantity' => 'required|numeric|min:0',
            'unit' => 'required|string',
            'unitPrice' => 'required|numeric|min:0',
            'supplierId' => 'required|string',
            'newSupplierName' => 'required_if:supplierId,OTHER|nullable|string',
            'projectId' => 'required|uuid|exists:projects,id',
            'purchaseDate' => 'required|date',
            'invoiceNumber' => 'nullable|string',
            'paidNow' => 'nullable|boolean',
        ]);

        $paidNow = array_key_exists('paidNow', $data) ? (bool) $data['paidNow'] : true;
        unset($data['paidNow']);

        $isNewSupplier = $data['supplierId'] === 'OTHER';
        if ($isNewSupplier) {
            $newSupplier = Supplier::create([
                'name' => $data['newSupplierName'],
                'phoneNumber' => '',
            ]);
            $data['supplierId'] = $newSupplier->id;
        } else {
            Supplier::findOrFail($data['supplierId']);
        }
        unset($data['newSupplierName']);

        $total = (float) $data['quantity'] * (float) $data['unitPrice'];
        $data['totalPrice'] = $total;

        // A purchase bought on credit hasn't drawn any cash yet, so it
        // shouldn't be checked (or counted) against the project's balance
        // until it's actually settled via a Cash Out.
        if ($paidNow) {
            $available = $this->availableBalance($data['projectId'], 'MATERIALS');
            if ($total > $available) {
                return $this->apiBadRequest(
                    $this->insufficientBalanceMessage($available, $data['projectId'], 'MATERIALS'),
                    self::PATH
                );
            }
        }

        [$material, $cashOut] = DB::transaction(function () use ($data, $total, $isNewSupplier, $paidNow) {
            $material = Material::create($data);

            $cashOut = null;
            if ($paidNow) {
                $cashOut = CashOut::create([
                    'date' => $data['purchaseDate'],
                    'projectId' => $data['projectId'],
                    'expenseCategory' => 'MATERIALS',
                    'paidTo' => "Material Purchase: {$data['name']}",
                    'amount' => $total,
                    'paymentMethod' => 'CASH',
                    'referenceNumber' => $data['invoiceNumber'] ?? null,
                    'notes' => "Auto-generated from Material Purchase registry. Qty: {$data['quantity']} {$data['unit']} @ \${$data['unitPrice']}/{$data['unit']}",
                    'supplierId' => $data['supplierId'],
                    'materialId' => $material->id,
                ]);
            }

            // A brand-new ("Other") supplier has no project assignment yet —
            // link it to the project this purchase was made for, so the
            // project shows up on its card instead of looking unassigned.
            // Its currentDue is seeded with the same contract total, mirroring
            // SupplierController::store()'s currentDue = contractTotal, so the
            // payment sync below nets it correctly instead of drifting negative.
            if ($isNewSupplier) {
                ProjectSupplier::create([
                    'projectId' => $data['projectId'],
                    'supplierId' => $data['supplierId'],
                    'contractAmount' => $total,
                    'paidAmount' => 0,
                    'dueAmount' => $total,
                ]);

                $newSupplier = Supplier::find($data['supplierId']);
                $newSupplier->currentDue = $total;
                $newSupplier->save();
            }

            if ($paidNow) {
                // Auto-paid via cash on the spot, so it's a real payment: nets
                // currentDue back down for this amount and credits it against
                // the project's contract (paidAmount/dueAmount).
                $this->syncSupplierBalance($data['supplierId'], $data['projectId'], $total, +1, $cashOut->id);
            } else {
                // Bought on credit: only increases the outstanding debt, since
                // no cash has moved — paidAmount stays put. Settled later via a
                // normal Supplier Payment cash-out from the Transactions page.
                $this->adjustSupplierDue($data['supplierId'], $data['projectId'], $total, +1);
            }

            return [$material, $cashOut];
        });

        return $this->apiCreated(
            [
                'material' => $material->load(['supplier:id,name', 'project:id,name,code', 'cashOut:id,materialId']),
                'cashOut' => $cashOut,
            ],
            'Material purchase recorded successfully', self::PATH);
    }

    public function show(string $id)
    {
        $material = Material::with(['supplier:id,name', 'project:id,name,code', 'cashOut:id,materialId'])->findOrFail($id);
        return $this->apiSuccess(['material' => $material], 'Material retrieved successfully', self::PATH);
    }

    public function update(Request $request, string $id)
    {
        $material = Material::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string',
            'category' => 'sometimes|string',
            'quantity' => 'sometimes|numeric|min:0',
            'unit' => 'sometimes|string',
            'unitPrice' => 'sometimes|numeric|min:0',
            'supplierId' => 'sometimes|string',
            'newSupplierName' => 'required_if:supplierId,OTHER|nullable|string',
            'projectId' => 'sometimes|uuid|exists:projects,id',
            'purchaseDate' => 'sometimes|date',
            'invoiceNumber' => 'nullable|string',
            'paidNow' => 'sometimes|boolean',
        ]);

        $wasPaid = CashOut::where('materialId', $material->id)->exists();
        $paidNow = array_key_exists('paidNow', $data) ? (bool) $data['paidNow'] : $wasPaid;
        unset($data['paidNow']);

        if (array_key_exists('supplierId', $data)) {
            if ($data['supplierId'] === 'OTHER') {
                $newSupplier = Supplier::create([
                    'name' => $data['newSupplierName'],
                    'phoneNumber' => '',
                ]);
                $data['supplierId'] = $newSupplier->id;
            } else {
                Supplier::findOrFail($data['supplierId']);
            }
        }
        unset($data['newSupplierName']);

        // totalPrice is always server-derived, never trusted from the client.
        if (array_key_exists('quantity', $data) || array_key_exists('unitPrice', $data)) {
            $quantity = $data['quantity'] ?? $material->quantity;
            $unitPrice = $data['unitPrice'] ?? $material->unitPrice;
            $data['totalPrice'] = (float) $quantity * (float) $unitPrice;
        }

        // Only a purchase ending up paidNow=true draws against the project's
        // cash balance, so only check it in that case.
        if ($paidNow) {
            $newProjectId = $data['projectId'] ?? $material->projectId;
            $newTotalPrice = $data['totalPrice'] ?? (float) $material->totalPrice;
            $existingCashOutId = CashOut::where('materialId', $material->id)->value('id');
            $available = $this->availableBalance($newProjectId, 'MATERIALS', $existingCashOutId);
            if ($newTotalPrice > $available) {
                return $this->apiBadRequest(
                    $this->insufficientBalanceMessage($available, $newProjectId, 'MATERIALS'),
                    self::PATH
                );
            }
        }

        DB::transaction(function () use ($material, $data, $wasPaid, $paidNow) {
            $oldSupplierId = $material->supplierId;
            $oldProjectId = $material->projectId;
            $oldTotalPrice = (float) $material->totalPrice;
            $existingCashOut = CashOut::where('materialId', $material->id)->first();

            $material->update($data);
            $material->refresh();

            // Reverse whatever the old state (paid or on-credit) contributed,
            // then reapply against the new supplier/project/amount/paid-state —
            // mirrors the apply/reverse pattern Cash Out transactions use, so
            // paidAmount/dueAmount and currentDue can't drift across an edit.
            if ($wasPaid) {
                $this->syncSupplierBalance($oldSupplierId, $oldProjectId, $oldTotalPrice, -1, $existingCashOut?->id);
            } else {
                $this->adjustSupplierDue($oldSupplierId, $oldProjectId, $oldTotalPrice, -1);
            }

            if ($paidNow) {
                if ($existingCashOut) {
                    $existingCashOut->update([
                        'date' => $material->purchaseDate,
                        'projectId' => $material->projectId,
                        'paidTo' => "Material Purchase: {$material->name}",
                        'amount' => $material->totalPrice,
                        'referenceNumber' => $material->invoiceNumber,
                        'notes' => "Auto-generated from Material Purchase registry. Qty: {$material->quantity} {$material->unit} @ \${$material->unitPrice}/{$material->unit}",
                        'supplierId' => $material->supplierId,
                    ]);
                    $cashOutId = $existingCashOut->id;
                } else {
                    $cashOutId = CashOut::create([
                        'date' => $material->purchaseDate,
                        'projectId' => $material->projectId,
                        'expenseCategory' => 'MATERIALS',
                        'paidTo' => "Material Purchase: {$material->name}",
                        'amount' => $material->totalPrice,
                        'paymentMethod' => 'CASH',
                        'referenceNumber' => $material->invoiceNumber,
                        'notes' => "Auto-generated from Material Purchase registry. Qty: {$material->quantity} {$material->unit} @ \${$material->unitPrice}/{$material->unit}",
                        'supplierId' => $material->supplierId,
                        'materialId' => $material->id,
                    ])->id;
                }

                $this->syncSupplierBalance($material->supplierId, $material->projectId, (float) $material->totalPrice, +1, $cashOutId);
            } else {
                $existingCashOut?->delete();
                $this->adjustSupplierDue($material->supplierId, $material->projectId, (float) $material->totalPrice, +1);
            }
        });

        return $this->apiSuccess(['material' => $material->fresh(['supplier', 'project', 'cashOut'])],
            'Material updated successfully', self::PATH);
    }

    public function destroy(string $id)
    {
        if (!in_array(Auth::user()->role, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->apiForbidden(self::PATH, 'Forbidden: Only administrators can delete materials');
        }

        $material = Material::findOrFail($id);

        DB::transaction(function () use ($material) {
            $cashOuts = CashOut::where('materialId', $material->id)->get();

            if ($cashOuts->isNotEmpty()) {
                $this->syncSupplierBalance($material->supplierId, $material->projectId, (float) $material->totalPrice, -1, $cashOuts->first()->id);
            } else {
                $this->adjustSupplierDue($material->supplierId, $material->projectId, (float) $material->totalPrice, -1);
            }

            // Delete associated auto-generated CashOut record(s), loading models
            // individually so the Auditable model events (and thus audit log) fire.
            $cashOuts->each->delete();

            $material->delete();
        });

        return $this->apiSuccess(null, 'Material purchase record deleted successfully', self::PATH);
    }

    public function page()
    {
        return Inertia::render('Dashboard/Materials/Index');
    }
}
