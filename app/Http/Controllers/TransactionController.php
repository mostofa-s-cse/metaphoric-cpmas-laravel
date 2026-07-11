<?php

namespace App\Http\Controllers;

use App\Models\CashIn;
use App\Models\CashOut;
use App\Models\Project;
use App\Models\ProjectVendor;
use App\Models\Supplier;
use App\Models\Vendor;
use App\Traits\ApiResponse;
use App\Traits\HasMainBalance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TransactionController extends Controller
{
    use ApiResponse, HasMainBalance;

    const PATH_IN = '/transactions/cash-in';
    const PATH_OUT = '/transactions/cash-out';

    // Source-of-truth enum lists (must match the Next.js original's dropdown options).
    const CASH_IN_SOURCES = 'SIGNING_AGREEMENT,MATERIAL_PREPS,LABER_PREPS,RUNNING_BILL,FINAL_BILL,CLIENT_PAYMENT,ADVANCE_PAYMENT,INSTALLMENT,OTHER_INCOME';
    const CASH_OUT_CATEGORIES = 'SIGNING_AGREEMENT,MATERIAL_PREPS,LABER_PREPS,RUNNING_BILL,FINAL_BILL,MATERIALS,LABOR,VENDOR_PAYMENT,OFFICE_RENT,UTILITIES,TRANSPORTATION,FUEL,EQUIPMENT_RENTAL,EMPLOYEE_SALARY,MISCELLANEOUS';

    // ─── Cash In ──────────────────────────────────────────────────────────────

    public function indexCashIn(Request $request)
    {
        $page = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 10);
        $skip = ($page - 1) * $limit;
        $projectId = $request->get('projectId');
        $search = $request->get('search', '');

        $query = CashIn::with(['project:id,name,code']);
        if ($projectId === 'GENERAL') {
            $query->whereNull('projectId');
        } elseif ($projectId) {
            $query->where('projectId', $projectId);
        }
        if ($search) $query->where('clientName', 'like', "%{$search}%");

        $total = $query->count();
        $items = $query->orderBy('date', 'desc')->skip($skip)->take($limit)->get();

        return $this->apiPaginated('cashIns', $items, $total, $page, $limit,
            'Cash-in transactions retrieved', self::PATH_IN);
    }

    public function storeCashIn(Request $request)
    {
        $data = $request->validate([
            'date' => 'required|date',
            'projectId' => 'nullable|uuid|exists:projects,id',
            'clientName' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'paymentMethod' => 'required|string|in:CASH,BANK,CHEQUE,MOBILE_BANKING',
            'bankOrCash' => 'required|string',
            'referenceNumber' => 'nullable|string',
            'source' => 'required|string|in:' . self::CASH_IN_SOURCES,
            'notes' => 'nullable|string',
        ]);

        $cashIn = CashIn::create($data);

        return $this->apiCreated(['cashIn' => $cashIn->load('project:id,name,code')],
            'Cash-in transaction recorded', self::PATH_IN);
    }

    public function updateCashIn(Request $request, string $id)
    {
        $cashIn = CashIn::findOrFail($id);

        $data = $request->validate([
            'date' => 'sometimes|date',
            'projectId' => 'nullable|uuid|exists:projects,id',
            'clientName' => 'sometimes|string',
            'amount' => 'sometimes|numeric|min:0',
            'paymentMethod' => 'sometimes|string|in:CASH,BANK,CHEQUE,MOBILE_BANKING',
            'bankOrCash' => 'sometimes|string',
            'referenceNumber' => 'nullable|string',
            'source' => 'sometimes|string|in:' . self::CASH_IN_SOURCES,
            'notes' => 'nullable|string',
        ]);

        $cashIn->update($data);

        return $this->apiSuccess(['cashIn' => $cashIn->fresh('project')],
            'Cash-in transaction updated', self::PATH_IN);
    }

    public function destroyCashIn(string $id)
    {
        if (!in_array(Auth::user()->role, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->apiForbidden(self::PATH_IN, 'Forbidden: Only administrators can delete transactions');
        }

        CashIn::findOrFail($id)->delete();
        return $this->apiSuccess(null, 'Cash-in transaction deleted', self::PATH_IN);
    }

    // ─── Cash Out ─────────────────────────────────────────────────────────────

    public function indexCashOut(Request $request)
    {
        $page = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 10);
        $skip = ($page - 1) * $limit;
        $projectId = $request->get('projectId');
        $labourId = $request->get('labourId');
        $employeeId = $request->get('employeeId');
        $categories = $request->get('categories'); // CSV of expenseCategory values
        $search = $request->get('search', '');

        $query = CashOut::with(['project:id,name,code', 'supplier:id,name',
            'vendor:id,name', 'employee:id,fullName', 'labour:id,name']);
        if ($projectId === 'GENERAL') {
            $query->whereNull('projectId');
        } elseif ($projectId) {
            $query->where('projectId', $projectId);
        }
        if ($labourId) $query->where('labourId', $labourId);
        if ($employeeId) $query->where('employeeId', $employeeId);
        if ($categories) $query->whereIn('expenseCategory', explode(',', $categories));
        if ($search) $query->where('paidTo', 'like', "%{$search}%");

        $total = $query->count();
        $items = $query->orderBy('date', 'desc')->skip($skip)->take($limit)->get();

        return $this->apiPaginated('cashOuts', $items, $total, $page, $limit,
            'Cash-out transactions retrieved', self::PATH_OUT);
    }

    public function storeCashOut(Request $request)
    {
        $data = $request->validate([
            'date' => 'required|date',
            'projectId' => 'nullable|uuid|exists:projects,id',
            'expenseCategory' => 'required|string|in:' . self::CASH_OUT_CATEGORIES,
            'paidTo' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'paymentMethod' => 'required|string|in:CASH,BANK,CHEQUE,MOBILE_BANKING',
            'referenceNumber' => 'nullable|string',
            'notes' => 'nullable|string',
            'supplierId' => 'nullable|uuid|exists:suppliers,id',
            'vendorId' => 'nullable|uuid|exists:vendors,id',
            'employeeId' => 'nullable|uuid|exists:employees,id',
            'labourId' => 'nullable|uuid|exists:labours,id',
            'materialId' => 'nullable|uuid|exists:materials,id',
            'salaryId' => 'nullable|uuid|exists:salaries,id',
        ]);

        $amount = (float) $data['amount'];
        $vendorId = $data['vendorId'] ?? null;
        $supplierId = $data['supplierId'] ?? null;
        $projectId = $data['projectId'] ?? null;
        $category = $data['expenseCategory'];

        $available = $this->availableBalance($projectId, $category);
        if ($amount > $available) {
            return $this->apiBadRequest(
                $this->insufficientBalanceMessage($available, $projectId, $category),
                self::PATH_OUT
            );
        }

        $cashOut = CashOut::create($data);

        $this->syncVendorBalance($vendorId, $projectId, $amount, +1);
        $this->syncSupplierBalance($supplierId, $amount, +1);

        return $this->apiCreated(['cashOut' => $cashOut->load(['project:id,name,code'])],
            'Cash-out transaction recorded', self::PATH_OUT);
    }

    /**
     * Applies (sign=+1) or reverses (sign=-1) a vendor payment's effect on
     * the vendor's global due/paid and, when project-scoped, the matching
     * ProjectVendor row. Shared by storeCashOut (apply) and destroyCashOut
     * (reverse) so the due/paid math can't drift between the two.
     */
    private function syncVendorBalance(?string $vendorId, ?string $projectId, float $amount, int $sign): void
    {
        if (!$vendorId) {
            return;
        }

        $vendor = Vendor::find($vendorId);
        if ($vendor) {
            $vendor->paidAmount = (float) $vendor->paidAmount + ($sign * $amount);
            $vendor->dueAmount = (float) $vendor->dueAmount - ($sign * $amount);
            $vendor->save();
        }

        if ($projectId) {
            $projectVendors = ProjectVendor::where('vendorId', $vendorId)
                ->where('projectId', $projectId)
                ->get();
            foreach ($projectVendors as $pv) {
                $pv->paidAmount = (float) $pv->paidAmount + ($sign * $amount);
                $pv->dueAmount = (float) $pv->dueAmount - ($sign * $amount);
                $pv->save();
            }
        }
    }

    /** Applies (sign=+1) or reverses (sign=-1) a supplier payment's effect on currentDue. */
    private function syncSupplierBalance(?string $supplierId, float $amount, int $sign): void
    {
        if (!$supplierId) {
            return;
        }

        $supplier = Supplier::find($supplierId);
        if ($supplier) {
            $supplier->currentDue = (float) $supplier->currentDue - ($sign * $amount);
            $supplier->save();
        }
    }

    public function updateCashOut(Request $request, string $id)
    {
        $cashOut = CashOut::findOrFail($id);

        $data = $request->validate([
            'date' => 'sometimes|date',
            'projectId' => 'nullable|uuid|exists:projects,id',
            'expenseCategory' => 'sometimes|string|in:' . self::CASH_OUT_CATEGORIES,
            'paidTo' => 'sometimes|string',
            'amount' => 'sometimes|numeric|min:0',
            'paymentMethod' => 'sometimes|string|in:CASH,BANK,CHEQUE,MOBILE_BANKING',
            'referenceNumber' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $newAmount = isset($data['amount']) ? (float) $data['amount'] : (float) $cashOut->amount;
        $newProjectId = array_key_exists('projectId', $data) ? $data['projectId'] : $cashOut->projectId;
        $newCategory = $data['expenseCategory'] ?? $cashOut->expenseCategory;

        $available = $this->availableBalance($newProjectId, $newCategory, $cashOut->id);
        if ($newAmount > $available) {
            return $this->apiBadRequest(
                $this->insufficientBalanceMessage($available, $newProjectId, $newCategory),
                self::PATH_OUT
            );
        }

        $cashOut->update($data);

        return $this->apiSuccess(['cashOut' => $cashOut->fresh('project')],
            'Cash-out transaction updated', self::PATH_OUT);
    }

    public function destroyCashOut(string $id)
    {
        if (!in_array(Auth::user()->role, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->apiForbidden(self::PATH_OUT, 'Forbidden: Only administrators can delete transactions');
        }

        $cashOut = CashOut::findOrFail($id);

        // Transactions linked to a material purchase must be deleted from the
        // Materials Inventory page instead, to keep inventory records in sync.
        if ($cashOut->materialId) {
            return $this->apiBadRequest(
                'This transaction is linked to a material purchase. Please delete it from the Materials Inventory page instead.',
                self::PATH_OUT
            );
        }

        $amount = (float) $cashOut->amount;

        $this->syncVendorBalance($cashOut->vendorId, $cashOut->projectId, $amount, -1);
        $this->syncSupplierBalance($cashOut->supplierId, $amount, -1);

        $cashOut->delete();

        return $this->apiSuccess(null, 'Cash-out transaction deleted', self::PATH_OUT);
    }

    public function summary(Request $request)
    {
        $projectId = $request->get('projectId');

        $cashInQuery = CashIn::query();
        $cashOutQuery = CashOut::query();

        if ($projectId === 'GENERAL') {
            $cashInQuery->whereNull('projectId');
            $cashOutQuery->whereNull('projectId');
        } elseif ($projectId) {
            $cashInQuery->where('projectId', $projectId);
            $cashOutQuery->where('projectId', $projectId);
        }

        $cashIns = $cashInQuery->get();
        $cashOuts = $cashOutQuery->get();

        $modes = ['CASH', 'BANK', 'CHEQUE', 'MOBILE_BANKING'];
        $cashInByMode = [];
        $cashOutByMode = [];
        foreach ($modes as $mode) {
            $cashInByMode[$mode] = (float) $cashIns->where('paymentMethod', $mode)->sum('amount');
            $cashOutByMode[$mode] = (float) $cashOuts->where('paymentMethod', $mode)->sum('amount');
        }

        $cashInTotal = (float) $cashIns->sum('amount');
        $cashOutTotal = (float) $cashOuts->sum('amount');

        $summary = [
            'cashIn' => ['total' => $cashInTotal, 'byMode' => $cashInByMode],
            'cashOut' => ['total' => $cashOutTotal, 'byMode' => $cashOutByMode],
            'net' => $cashInTotal - $cashOutTotal,
        ];

        $config = $this->mainBalanceConfig();

        // Main balance (configured % of all project budgets) always shows, regardless of filter.
        $summary['mainBalance'] = [
            'allocated' => $this->totalProjectBudget() * $config['percentage'],
            'available' => $this->availableBalance(null),
            'percentage' => round($config['percentage'] * 100, 2),
        ];

        if ($projectId && $projectId !== 'GENERAL') {
            $project = Project::find($projectId);
            if ($project) {
                $summary['projectBalance'] = [
                    'allocated' => (float) $project->estimatedBudget * (1 - $config['percentage']),
                    'available' => $this->availableBalance($projectId),
                    'percentage' => round((1 - $config['percentage']) * 100, 2),
                ];
            }
        }

        return $this->apiSuccess(['summary' => $summary],
            'Transaction summary retrieved', '/transactions/summary');
    }

    /**
     * Tells a form, before submit, exactly which pool a prospective expense
     * will draw from (main balance or the linked project's own share) and
     * how much is available — the same rule storeCashOut/updateCashOut will
     * enforce, so payment forms (salary, office expense, labour wage, ...)
     * can show a single accurate figure instead of guessing client-side.
     */
    public function availableBalanceInfo(Request $request)
    {
        $projectId = $request->get('projectId');
        $projectId = ($projectId === 'GENERAL' || !$projectId) ? null : $projectId;
        $category = $request->get('category');

        $config = $this->mainBalanceConfig();
        $drawsFromMain = !$projectId || $this->isMainBalanceCategory($category, $config);

        $allocated = $drawsFromMain
            ? $this->totalProjectBudget() * $config['percentage']
            : (float) Project::findOrFail($projectId)->estimatedBudget * (1 - $config['percentage']);

        $available = $this->availableBalance($projectId, $category);

        return $this->apiSuccess([
            'source' => $drawsFromMain ? 'main' : 'project',
            'allocated' => $allocated,
            'available' => $available,
            'spent' => $allocated - $available,
            'percentage' => round(($drawsFromMain ? $config['percentage'] : 1 - $config['percentage']) * 100, 2),
        ], 'Available balance retrieved', '/transactions/available-balance');
    }

    public function page()
    {
        return Inertia::render('Dashboard/Transactions/Index');
    }
}
