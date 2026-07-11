<?php

namespace App\Http\Controllers;

use App\Models\CashOut;
use App\Models\Material;
use App\Models\ProjectSupplier;
use App\Models\Supplier;
use App\Traits\ApiResponse;
use App\Traits\HasMainBalance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class MaterialController extends Controller
{
    use ApiResponse, HasMainBalance;

    const PATH = '/materials';

    public function index(Request $request)
    {
        $search = $request->get('search', '');
        $projectId = $request->get('projectId');
        $supplierId = $request->get('supplierId');
        $page = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 10);
        $skip = ($page - 1) * $limit;

        $query = Material::with(['supplier:id,name', 'project:id,name,code']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")->orWhere('category', 'like', "%{$search}%");
            });
        }
        if ($projectId) $query->where('projectId', $projectId);
        if ($supplierId) $query->where('supplierId', $supplierId);

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
        ]);

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

        $available = $this->availableBalance($data['projectId'], 'MATERIALS');
        if ($total > $available) {
            return $this->apiBadRequest(
                $this->insufficientBalanceMessage($available, $data['projectId'], 'MATERIALS'),
                self::PATH
            );
        }

        [$material, $cashOut] = DB::transaction(function () use ($data, $total, $isNewSupplier) {
            $material = Material::create($data);

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

            $supplier = Supplier::findOrFail($data['supplierId']);
            $supplier->currentDue = (float) $supplier->currentDue + $total;
            $supplier->save();

            // A brand-new ("Other") supplier has no project assignment yet —
            // link it to the project this purchase was made for, so the
            // project shows up on its card instead of looking unassigned.
            if ($isNewSupplier) {
                ProjectSupplier::create([
                    'projectId' => $data['projectId'],
                    'supplierId' => $data['supplierId'],
                    'contractAmount' => $total,
                    'paidAmount' => 0,
                    'dueAmount' => $total,
                ]);
            }

            return [$material, $cashOut];
        });

        return $this->apiCreated(
            [
                'material' => $material->load(['supplier:id,name', 'project:id,name,code']),
                'cashOut' => $cashOut,
            ],
            'Material purchase recorded successfully', self::PATH);
    }

    public function show(string $id)
    {
        $material = Material::with(['supplier:id,name', 'project:id,name,code'])->findOrFail($id);
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
        ]);

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

        DB::transaction(function () use ($material, $data) {
            $oldSupplierId = $material->supplierId;
            $oldTotalPrice = (float) $material->totalPrice;

            $material->update($data);
            $material->refresh();

            // Reconcile the old and new supplier's currentDue against this
            // purchase, matching the store()/destroy() due-adjustment pattern.
            if ($oldSupplierId) {
                $oldSupplier = Supplier::find($oldSupplierId);
                if ($oldSupplier) {
                    $oldSupplier->currentDue = (float) $oldSupplier->currentDue - $oldTotalPrice;
                    $oldSupplier->save();
                }
            }
            if ($material->supplierId) {
                $newSupplier = Supplier::findOrFail($material->supplierId);
                $newSupplier->currentDue = (float) $newSupplier->currentDue + (float) $material->totalPrice;
                $newSupplier->save();
            }

            // Keep the auto-generated CashOut record in sync with the edited purchase.
            CashOut::where('materialId', $material->id)->get()->each(function ($cashOut) use ($material) {
                $cashOut->update([
                    'date' => $material->purchaseDate,
                    'projectId' => $material->projectId,
                    'paidTo' => "Material Purchase: {$material->name}",
                    'amount' => $material->totalPrice,
                    'referenceNumber' => $material->invoiceNumber,
                    'notes' => "Auto-generated from Material Purchase registry. Qty: {$material->quantity} {$material->unit} @ \${$material->unitPrice}/{$material->unit}",
                    'supplierId' => $material->supplierId,
                ]);
            });
        });

        return $this->apiSuccess(['material' => $material->fresh(['supplier', 'project'])],
            'Material updated successfully', self::PATH);
    }

    public function destroy(string $id)
    {
        if (!in_array(Auth::user()->role, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->apiForbidden(self::PATH, 'Forbidden: Only administrators can delete materials');
        }

        $material = Material::findOrFail($id);

        DB::transaction(function () use ($material) {
            if ($material->supplierId) {
                $supplier = Supplier::find($material->supplierId);
                if ($supplier) {
                    $supplier->currentDue = (float) $supplier->currentDue - (float) $material->totalPrice;
                    $supplier->save();
                }
            }

            // Delete associated auto-generated CashOut record(s), loading models
            // individually so the Auditable model events (and thus audit log) fire.
            CashOut::where('materialId', $material->id)->get()->each->delete();

            $material->delete();
        });

        return $this->apiSuccess(null, 'Material purchase record deleted successfully', self::PATH);
    }

    public function page()
    {
        return Inertia::render('Dashboard/Materials/Index');
    }
}
