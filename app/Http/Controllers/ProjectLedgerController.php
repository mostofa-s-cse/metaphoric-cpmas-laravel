<?php

namespace App\Http\Controllers;

use App\Models\ProjectLedgerEntry;
use App\Models\Project;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

/**
 * Read-only API for a project's own ledger (statement of account).
 *
 * Endpoints:
 *  GET /api/projects/{projectId}/ledger         — paginated ledger entries
 *  GET /api/projects/{projectId}/ledger/summary — totals & running balance
 */
class ProjectLedgerController extends Controller
{
    use ApiResponse;

    // ── Ledger list ───────────────────────────────────────────────────────────

    public function index(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);

        $page      = (int) $request->get('page', 1);
        $limit     = (int) $request->get('limit', 20);
        $skip      = ($page - 1) * $limit;
        $entryType = $request->get('entryType');   // CASH_IN | CASH_OUT | null (all)
        $category  = $request->get('expenseCategory');
        $startDate = $request->get('startDate');
        $endDate   = $request->get('endDate');

        $query = ProjectLedgerEntry::forProject($projectId)
            ->betweenDates($startDate, $endDate);

        if ($entryType) {
            $query->where('entryType', $entryType);
        }
        if ($category) {
            $query->where('expenseCategory', $category);
        }

        $total   = $query->count();
        $entries = $query->orderBy('date', 'desc')->skip($skip)->take($limit)->get();

        return $this->apiPaginated(
            'ledgerEntries', $entries, $total, $page, $limit,
            'Project ledger retrieved',
            "/projects/{$projectId}/ledger"
        );
    }

    // ── Summary / running balance ─────────────────────────────────────────────

    public function summary(Request $request, string $projectId)
    {
        $project   = Project::findOrFail($projectId);
        $startDate = $request->get('startDate');
        $endDate   = $request->get('endDate');

        $base = ProjectLedgerEntry::forProject($projectId)
            ->betweenDates($startDate, $endDate);

        $totalIn  = (float) (clone $base)->cashIns()->sum('amount');
        $totalOut = (float) (clone $base)->cashOuts()->sum('amount');

        // Breakdown of cash-outs by expense category
        $categoryBreakdown = (clone $base)->cashOuts()
            ->selectRaw('expenseCategory, SUM(amount) as total')
            ->groupBy('expenseCategory')
            ->pluck('total', 'expenseCategory')
            ->map(fn ($v) => (float) $v)
            ->all();

        // Supplier/vendor payment totals (project-wise)
        $supplierPayments = (float) (clone $base)->cashOuts()
            ->where('expenseCategory', 'SUPPLIER_PAYMENT')
            ->sum('amount');

        $vendorPayments = (float) (clone $base)->cashOuts()
            ->where('expenseCategory', 'VENDOR_PAYMENT')
            ->sum('amount');

        $materialCosts = (float) (clone $base)->cashOuts()
            ->where('expenseCategory', 'MATERIALS')
            ->sum('amount');

        return $this->apiSuccess([
            'project'           => ['id' => $project->id, 'name' => $project->name, 'code' => $project->code],
            'totalIn'           => $totalIn,
            'totalOut'          => $totalOut,
            'netBalance'        => $totalIn - $totalOut,
            'supplierPayments'  => $supplierPayments,
            'vendorPayments'    => $vendorPayments,
            'materialCosts'     => $materialCosts,
            'categoryBreakdown' => $categoryBreakdown,
        ], 'Project ledger summary retrieved', "/projects/{$projectId}/ledger/summary");
    }
}
