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
            'mainBalancePercentage' => 30,
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

            // The heavy part: cash_ins/cash_outs/suppliers/vendors/salaries are
            // encrypted columns, so every total here requires loading full
            // tables into PHP and summing in userland (can't SQL-aggregate an
            // encrypted string). That cost is unavoidable on a cache miss, but
            // cached afterward — busted by BustsDashboardCache on any write to
            // CashIn/CashOut/Supplier/Vendor/Salary, or by Project on budget
            // changes (see Project::booted()).
            $financials = Cache::remember('dashboard:financials', now()->addMinutes(10), function () use ($projects) {
                $cashIns  = CashIn::all();
                $cashOuts = CashOut::all();

                $categoriesMap = [];
                foreach ($cashOuts as $co) {
                    $cat = $co->expenseCategory ?? 'MISCELLANEOUS';
                    $categoriesMap[$cat] = ($categoriesMap[$cat] ?? 0) + (float) $co->amount;
                }
                $expenseBreakdown = collect($categoriesMap)
                    ->map(fn ($value, $category) => compact('category', 'value'))
                    ->values()
                    ->toArray();

                $projectComparison = $projects->take(5)->map(function ($p) use ($cashOuts) {
                    $spent = $cashOuts->where('projectId', $p->id)->sum('amount');
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
                    $revenue = (float) $cashIns
                        ->filter(fn ($c) => $c->date >= $monthStart && $c->date <= $monthEnd)
                        ->sum('amount');
                    $expenses = (float) $cashOuts
                        ->filter(fn ($c) => $c->date >= $monthStart && $c->date <= $monthEnd)
                        ->sum('amount');
                    $monthlyTrends[] = [
                        'month'    => $monthStart->format('M'),
                        'revenue'  => $revenue,
                        'expenses' => $expenses,
                        'profit'   => $revenue - $expenses,
                    ];
                }

                return [
                    'totalCashIn'       => (float) $cashIns->sum('amount'),
                    'totalCashOut'      => (float) $cashOuts->sum('amount'),
                    'supplierDue'       => (float) Supplier::all()->sum('currentDue'),
                    'vendorDue'         => (float) Vendor::all()->sum('dueAmount'),
                    'salaryDue'         => (float) Salary::all()->sum('dueAmount'),
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

            // Main balance: admin-configured % of all project budgets (default 30%,
            // see Settings > Main Balance Configuration), minus expenses booked with
            // no project plus any expense whose category is configured to always
            // draw from main balance.
            $mainBalanceConfig = $this->mainBalanceConfig();
            $summary['mainBalancePercentage'] = round($mainBalanceConfig['percentage'] * 100, 2);
            $summary['mainBalanceAllocated'] = (float) $projects->sum('estimatedBudget') * $mainBalanceConfig['percentage'];
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
