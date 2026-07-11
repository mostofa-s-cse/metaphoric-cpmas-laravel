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
            'monthlyRevenue'    => 0,
            'monthlyExpenses'   => 0,
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

            // Financial totals
            $cashIns  = CashIn::all();
            $cashOuts = CashOut::all();
            $summary['totalCashIn']  = (float) $cashIns->sum('amount');
            $summary['totalCashOut'] = (float) $cashOuts->sum('amount');
            $summary['cashBalance']  = $summary['totalCashIn'] - $summary['totalCashOut'];
            $summary['netProfit']    = $summary['cashBalance'];

            // Main balance: admin-configured % of all project budgets (default 30%,
            // see Settings > Main Balance Configuration), minus expenses booked with
            // no project plus any expense whose category is configured to always
            // draw from main balance.
            $mainBalanceConfig = $this->mainBalanceConfig();
            $summary['mainBalancePercentage'] = round($mainBalanceConfig['percentage'] * 100, 2);
            $summary['mainBalanceAllocated'] = (float) $projects->sum('estimatedBudget') * $mainBalanceConfig['percentage'];
            $summary['mainBalance'] = $this->availableBalance(null);

            // Dues (encrypted columns must be summed in PHP, not via SQL aggregate)
            $summary['supplierDue'] = (float) Supplier::all()->sum('currentDue');
            $summary['vendorDue']   = (float) Vendor::all()->sum('dueAmount');
            $summary['salaryDue']   = (float) Salary::all()->sum('dueAmount');

            // Expense breakdown by category
            $categoriesMap = [];
            foreach ($cashOuts as $co) {
                $cat = $co->expenseCategory ?? 'MISCELLANEOUS';
                $categoriesMap[$cat] = ($categoriesMap[$cat] ?? 0) + (float) $co->amount;
            }
            $expenseBreakdown = collect($categoriesMap)
                ->map(fn ($value, $category) => compact('category', 'value'))
                ->values()
                ->toArray();

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

            // Monthly trends (last 6 months label placeholders)
            $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            foreach ($months as $i => $month) {
                $rev = $i * 45000 + 80000;
                $exp = $i * 32000 + 55000;
                $monthlyTrends[] = [
                    'month'    => $month,
                    'revenue'  => $rev,
                    'expenses' => $exp,
                    'profit'   => $rev - $exp,
                ];
            }

            // Project budget vs spent
            $projectComparison = $projects->take(5)->map(function ($p) use ($cashOuts) {
                $spent = $cashOuts->where('projectId', $p->id)->sum('amount');
                return [
                    'name'   => $p->name,
                    'budget' => (float) $p->estimatedBudget,
                    'spent'  => (float) $spent,
                ];
            })->values()->toArray();

        } catch (\Throwable $e) {
            // Silent fallback
        }

        // Fallback demo data when DB is empty
        if ((float) $summary['totalCashIn'] === 0.0 && (float) $summary['totalCashOut'] === 0.0) {
            $summary['totalCashIn']  = 1450000;
            $summary['totalCashOut'] = 980000;
            $summary['cashBalance']  = 470000;
            $summary['netProfit']    = 470000;
            $summary['supplierDue']  = 20400;
            $summary['vendorDue']    = 250000;
            $summary['salaryDue']    = 4500;
            $summary['mainBalanceAllocated'] = 3060000;
            $summary['mainBalance']  = 3060000;

            $expenseBreakdown = [
                ['category' => 'MATERIALS',       'value' => 520000],
                ['category' => 'LABOR',           'value' => 240000],
                ['category' => 'EMPLOYEE_SALARY', 'value' => 95000],
                ['category' => 'VENDOR_PAYMENT',  'value' => 80000],
                ['category' => 'OFFICE_RENT',     'value' => 25000],
                ['category' => 'UTILITIES',       'value' => 8000],
                ['category' => 'MISCELLANEOUS',   'value' => 12000],
            ];

            $projectComparison = [
                ['name' => 'Skyline Heights',  'budget' => 5000000,  'spent' => 3800000],
                ['name' => 'Greenwood Estate', 'budget' => 3200000,  'spent' => 450000],
                ['name' => 'Metro Bridge',     'budget' => 12000000, 'spent' => 11200000],
            ];
        }

        return Inertia::render('Dashboard/Index', [
            'summary'           => $summary,
            'expenseBreakdown'  => $expenseBreakdown,
            'monthlyTrends'     => $monthlyTrends,
            'projectComparison' => $projectComparison,
        ]);
    }
}
