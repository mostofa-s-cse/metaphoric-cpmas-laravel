<?php

namespace App\Http\Controllers;

use App\Models\CashIn;
use App\Models\CashOut;
use App\Models\Employee;
use App\Models\Labour;
use App\Models\Project;
use App\Models\Salary;
use App\Models\Supplier;
use App\Models\Vendor;
use App\Traits\HasMainBalance;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class DashboardController extends Controller
{
    use HasMainBalance;

    public function index()
    {
        $user = Auth::user();
        $role = $user->role;

        $summary = [
            'totalProjects'     => 0,
            'runningProjects'   => 0,
            'completedProjects' => 0,
            'totalClients'      => 0,
            'totalSuppliers'    => 0,
            'totalVendors'      => 0,
            'totalEmployees'    => 0,
            'totalLabour'       => 0,
            'totalCashIn'       => 0,
            'totalCashOut'      => 0,
            'netProfit'         => 0,
            'supplierDue'       => 0,
            'vendorDue'         => 0,
            'salaryDue'         => 0,
            'cashBalance'       => 0,
            'mainBalance'       => 0,
            'mainBalanceAllocated' => 0,
        ];

        $expenseBreakdown  = [];
        $monthlyTrends     = [];
        $projectComparison = [];

        try {
            // Projects
            $projects = Project::all();
            $summary['totalProjects']     = $projects->count();
            $summary['runningProjects']   = $projects->where('status', 'RUNNING')->count();
            $summary['completedProjects'] = $projects->where('status', 'COMPLETED')->count();
            $summary['totalClients']      = $projects->pluck('clientName')->unique()->count();

            // Stakeholders
            $summary['totalSuppliers'] = Supplier::count();
            $summary['totalVendors']   = Vendor::count();
            $summary['totalEmployees'] = Employee::count();
            $summary['totalLabour']    = Labour::count();

            // Every amount column also has a plaintext decimal shadow column
            // (amountNumeric/currentDueNumeric/...) kept in sync by the
            // EncryptedFloat cast, so these totals are real SQL
            // SUM()/GROUP BY queries — no full-table PHP scan anymore. Still
            // cached briefly since this is several queries per dashboard
            // load; busted by BustsDashboardCache on any write to
            // CashIn/CashOut/Supplier/Vendor/Salary, or by Project on budget
            // changes (see Project::booted()).
            $financials = Cache::remember('dashboard:financials', now()->addMinutes(10), function () use ($projects) {
                // Scoped to the last 6 months (same window as monthlyTrends below)
                // so recent spending patterns aren't diluted by years-old costs
                // as the business grows.
                $expenseBreakdownSince = now()->subMonths(5)->startOfMonth();
                $expenseBreakdown = CashOut::query()
                    ->where('date', '>=', $expenseBreakdownSince)
                    ->selectRaw("COALESCE(expenseCategory, 'MISCELLANEOUS') as category")
                    ->selectRaw('SUM(amountNumeric) as value')
                    ->groupBy('expenseCategory')
                    ->get()
                    ->map(fn ($row) => ['category' => $row->category, 'value' => (float) $row->value])
                    ->values()
                    ->toArray();

                $projectComparison = $projects->take(5)->map(function ($p) {
                    $spent = CashOut::where('projectId', $p->id)->sum('amountNumeric');
                    return [
                        'name'   => $p->name,
                        'budget' => (float) $p->estimatedBudget,
                        'spent'  => (float) $spent,
                    ];
                })->values()->toArray();

                // Real cash-in/cash-out totals for each of the last 6 months
                // (oldest first), not a placeholder formula.
                $monthlyTrends = [];
                for ($i = 5; $i >= 0; $i--) {
                    $monthStart = now()->subMonths($i)->startOfMonth();
                    $monthEnd = $monthStart->copy()->endOfMonth();
                    $revenue = (float) CashIn::whereBetween('date', [$monthStart, $monthEnd])->sum('amountNumeric');
                    $expenses = (float) CashOut::whereBetween('date', [$monthStart, $monthEnd])->sum('amountNumeric');
                    $monthlyTrends[] = [
                        'month'    => $monthStart->format('M'),
                        'revenue'  => $revenue,
                        'expenses' => $expenses,
                        'profit'   => $revenue - $expenses,
                    ];
                }

                return [
                    'totalCashIn'       => (float) CashIn::sum('amountNumeric'),
                    'totalCashOut'      => (float) CashOut::sum('amountNumeric'),
                    'supplierDue'       => (float) Supplier::sum('currentDueNumeric'),
                    'vendorDue'         => (float) Vendor::sum('dueAmountNumeric'),
                    'salaryDue'         => (float) Salary::sum('dueAmountNumeric'),
                    'expenseBreakdown'  => $expenseBreakdown,
                    'projectComparison' => $projectComparison,
                    'monthlyTrends'     => $monthlyTrends,
                ];
            });

            $summary['totalCashIn']  = $financials['totalCashIn'];
            $summary['totalCashOut'] = $financials['totalCashOut'];
            $summary['cashBalance']  = $summary['totalCashIn'] - $summary['totalCashOut'];
            $summary['netProfit']    = $summary['cashBalance'];
            $summary['supplierDue']  = $financials['supplierDue'];
            $summary['vendorDue']    = $financials['vendorDue'];
            $summary['salaryDue']    = $financials['salaryDue'];
            $expenseBreakdown  = $financials['expenseBreakdown'];
            $projectComparison = $financials['projectComparison'];
            $monthlyTrends     = $financials['monthlyTrends'];

            if (empty($expenseBreakdown)) {
                $expenseBreakdown = [
                    ['category' => 'MATERIALS',        'value' => 0],
                    ['category' => 'LABOR',            'value' => 0],
                    ['category' => 'EMPLOYEE_SALARY',  'value' => 0],
                    ['category' => 'VENDOR_PAYMENT',   'value' => 0],
                    ['category' => 'OFFICE_RENT',      'value' => 0],
                    ['category' => 'UTILITIES',        'value' => 0],
                ];
            }

            // Main balance: combined paid-in amount across all projects (the
            // global pool), minus every global-category CashOut.
            $summary['mainBalanceAllocated'] = $this->totalPaidAmount();
            $summary['mainBalance'] = $this->availableBalance(null);

        } catch (\Throwable $e) {
            report($e);
        }

        return Inertia::render('Dashboard/Index', [
            'summary'           => $summary,
            'expenseBreakdown'  => $expenseBreakdown,
            'monthlyTrends'     => $monthlyTrends,
            'projectComparison' => $projectComparison,
        ]);
    }
}
