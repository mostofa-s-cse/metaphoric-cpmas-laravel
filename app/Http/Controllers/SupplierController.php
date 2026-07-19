<?php

namespace App\Http\Controllers;

use App\Models\CashOut;
use App\Models\ProjectSupplier;
use App\Models\Supplier;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SupplierController extends Controller
{
    use ApiResponse;

    const PATH = '/suppliers';

    public function index(Request $request)
    {
        $search = $request->get('search', '');
        $projectId = $request->get('projectId');
        $page = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 10);
        $skip = ($page - 1) * $limit;
        $startDate = $request->get('startDate');
        $endDate = $request->get('endDate');

        $query = Supplier::query();
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('companyName', 'like', "%{$search}%");
            });
        }
        if ($projectId) {
            $query->whereHas('projectAssignments', function ($q) use ($projectId) {
                $q->where('projectId', $projectId);
            });
        }
        if ($startDate) $query->where('created_at', '>=', \Carbon\Carbon::parse($startDate)->startOfDay());
        if ($endDate) $query->where('created_at', '<=', \Carbon\Carbon::parse($endDate)->endOfDay());

        $total = $query->count();
        $suppliers = $query->orderBy('created_at', 'desc')
            ->skip($skip)->take($limit)
            ->with(['projectAssignments.project:id,name,code', 'materials:id,supplierId,totalPrice'])
            ->get();

        $suppliers->each(function (Supplier $supplier) {
            $supplier->setAttribute('contractAmount', $supplier->projectAssignments->sum('contractAmount'));
            $supplier->setAttribute('paidAmount', $supplier->projectAssignments->sum('paidAmount'));
            $supplier->setAttribute('dueAmount', $supplier->projectAssignments->sum('dueAmount'));
        });

        return $this->apiPaginated('suppliers', $suppliers, $total, $page, $limit,
            'Suppliers retrieved successfully', self::PATH);
    }

    /**
     * Lightweight, unpaginated list of all suppliers (id, name) for
     * assignment dropdowns (e.g. Cash Out supplier payment picker).
     */
    public function list(Request $request)
    {
        $projectId = $request->get('projectId');

        $query = Supplier::select('id', 'name')->orderBy('name');
        if ($projectId) {
            $query->whereHas('projectAssignments', function ($q) use ($projectId) {
                $q->where('projectId', $projectId);
            });
        }

        return $this->apiSuccess(['suppliers' => $query->get()], 'Suppliers list retrieved successfully', self::PATH);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'companyName' => 'nullable|string',
            'phoneNumber' => 'required|string',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'openingBalance' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'assignments' => 'nullable|array',
            'assignments.*.projectId' => 'required_with:assignments|string',
            'assignments.*.contractAmount' => 'nullable|numeric',
        ]);

        $assignments = $data['assignments'] ?? [];
        unset($data['assignments']);

        $openingBalance = (float) ($data['openingBalance'] ?? 0);
        $contractTotal = collect($assignments)->sum(fn ($a) => (float) ($a['contractAmount'] ?? 0));

        $data['openingBalance'] = $openingBalance;
        $data['currentDue'] = $contractTotal + $openingBalance;

        $supplier = Supplier::create($data);

        foreach ($assignments as $assignment) {
            $contractAmount = (float) ($assignment['contractAmount'] ?? 0);

            ProjectSupplier::create([
                'supplierId' => $supplier->id,
                'projectId' => $assignment['projectId'],
                'contractAmount' => $contractAmount,
                'paidAmount' => 0,
                'dueAmount' => $contractAmount,
            ]);
        }

        return $this->apiCreated(['supplier' => $supplier->fresh()], 'Supplier created successfully', self::PATH);
    }

    public function show(string $id)
    {
        $supplier = Supplier::with(['materials.project:id,name,code',
            'cashOuts', 'documents', 'projectAssignments.project:id,name,code'])->findOrFail($id);

        return $this->apiSuccess(['supplier' => $supplier], 'Supplier retrieved successfully', self::PATH);
    }

    public function update(Request $request, string $id)
    {
        $supplier = Supplier::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string',
            'companyName' => 'nullable|string',
            'phoneNumber' => 'sometimes|string',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
            'assignments' => 'nullable|array',
            'assignments.*.projectId' => 'required_with:assignments|string',
            'assignments.*.contractAmount' => 'nullable|numeric',
        ]);

        $hasAssignments = array_key_exists('assignments', $data);
        $assignments = $data['assignments'] ?? [];
        unset($data['assignments']);

        if ($hasAssignments) {
            // contractAmount is stored via an EncryptedFloat cast, so a SQL-level
            // sum() would aggregate ciphertext. Load rows and sum in PHP so the
            // cast is applied to each value first.
            $oldContractTotal = (float) $supplier->projectAssignments()->get()->sum('contractAmount');
            $newContractTotal = collect($assignments)->sum(fn ($a) => (float) ($a['contractAmount'] ?? 0));

            $data['currentDue'] = (float) $supplier->currentDue + ($newContractTotal - $oldContractTotal);
        }

        $supplier->update($data);

        if ($hasAssignments) {
            $existingByProject = ProjectSupplier::where('supplierId', $id)->get()->keyBy('projectId');
            $keepProjectIds = collect($assignments)->pluck('projectId')->all();

            foreach ($assignments as $assignment) {
                $contractAmount = (float) ($assignment['contractAmount'] ?? 0);
                $existingPaid = (float) ($existingByProject->get($assignment['projectId'])?->paidAmount ?? 0);

                ProjectSupplier::updateOrCreate(
                    ['supplierId' => $id, 'projectId' => $assignment['projectId']],
                    [
                        'contractAmount' => $contractAmount,
                        'paidAmount' => $existingPaid,
                        'dueAmount' => $contractAmount - $existingPaid,
                    ]
                );
            }

            ProjectSupplier::where('supplierId', $id)->whereNotIn('projectId', $keepProjectIds)->delete();
        }

        return $this->apiSuccess(['supplier' => $supplier->fresh()], 'Supplier updated successfully', self::PATH);
    }

    public function destroy(string $id)
    {
        if (!in_array(Auth::user()->role, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->apiForbidden(self::PATH, 'Forbidden: Insufficient privileges');
        }

        $supplier = Supplier::findOrFail($id);

        DB::transaction(function () use ($supplier) {
            // Materials reference suppliers with an onDelete('restrict') constraint,
            // so they must be removed explicitly before the supplier (matches the
            // "This will permanently remove all material purchases..." confirmation
            // copy shown to the user). Rows are still deleted individually (not a
            // bulk whereIn()->delete()) so Auditable model events fire for each one
            // — but the *lookups* are batched into a single query each instead of
            // one CashOut query per material, so a supplier with N materials costs
            // 2 find-queries + N+M deletes instead of N find-queries + N+M deletes.
            $materials = $supplier->materials()->get();
            CashOut::whereIn('materialId', $materials->pluck('id'))->get()->each->delete();
            $materials->each->delete();

            $supplier->delete();
        });

        return $this->apiSuccess(null, 'Supplier deleted successfully', self::PATH);
    }

    public function page()
    {
        return Inertia::render('Dashboard/Suppliers/Index');
    }
}
