<?php

namespace App\Console\Commands;

use App\Models\CashIn;
use App\Models\CashOut;
use App\Models\CompanyBalance;
use App\Models\ExpenseCategory;
use App\Models\Project;
use App\Models\ProjectBalance;
use Illuminate\Console\Command;

/**
 * project_balances/company_balance are running totals maintained
 * incrementally by CashIn/CashOut model events (BalanceSnapshotService) —
 * fast to read, but only as correct as every write path that touched them.
 * This recomputes both from the raw cash_ins/cash_outs ledger via SQL SUM on
 * the numeric shadow columns and corrects any drift found, as a safety net.
 */
class ReconcileBalances extends Command
{
    protected $signature = 'balances:reconcile {--dry-run : Report drift without correcting it}';

    protected $description = 'Recompute project_balances/company_balance from cash_ins/cash_outs and fix any drift';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $driftFound = 0;

        foreach (Project::pluck('id') as $projectId) {
            $totalPaidIn = (float) CashIn::where('projectId', $projectId)->sum('amountNumeric');
            $totalProjectWiseSpent = (float) CashOut::where('projectId', $projectId)
                ->whereIn('expenseCategory', $this->projectWiseCategories())
                ->sum('amountNumeric');

            $snapshot = ProjectBalance::find($projectId);

            if (!$snapshot
                || round((float) $snapshot->totalPaidIn, 2) !== round($totalPaidIn, 2)
                || round((float) $snapshot->totalProjectWiseSpent, 2) !== round($totalProjectWiseSpent, 2)
            ) {
                $driftFound++;
                $this->warn("Drift on project {$projectId}: paidIn "
                    . ($snapshot->totalPaidIn ?? 0) . " -> {$totalPaidIn}, spent "
                    . ($snapshot->totalProjectWiseSpent ?? 0) . " -> {$totalProjectWiseSpent}");

                if (!$dryRun) {
                    ProjectBalance::updateOrCreate(
                        ['projectId' => $projectId],
                        ['totalPaidIn' => $totalPaidIn, 'totalProjectWiseSpent' => $totalProjectWiseSpent]
                    );
                }
            }
        }

        $totalPaidInAllProjects = (float) CashIn::whereNotNull('projectId')->sum('amountNumeric');
        $totalGlobalSpent = (float) CashOut::where(function ($q) {
            $q->whereNotIn('expenseCategory', $this->projectWiseCategories())
              ->orWhereNull('projectId');
        })->sum('amountNumeric');

        $company = CompanyBalance::current();
        if (round((float) $company->totalPaidInAllProjects, 2) !== round($totalPaidInAllProjects, 2)
            || round((float) $company->totalGlobalSpent, 2) !== round($totalGlobalSpent, 2)
        ) {
            $driftFound++;
            $this->warn("Drift on company_balance: paidIn {$company->totalPaidInAllProjects} -> {$totalPaidInAllProjects}, "
                . "spent {$company->totalGlobalSpent} -> {$totalGlobalSpent}");

            if (!$dryRun) {
                $company->update([
                    'totalPaidInAllProjects' => $totalPaidInAllProjects,
                    'totalGlobalSpent' => $totalGlobalSpent,
                ]);
            }
        }

        if ($driftFound === 0) {
            $this->info('No drift found — snapshots match the raw ledger.');
        } else {
            $this->info($dryRun
                ? "{$driftFound} drifted record(s) found (dry run, not corrected)."
                : "{$driftFound} drifted record(s) corrected.");
        }

        return self::SUCCESS;
    }

    private function projectWiseCategories(): array
    {
        return ExpenseCategory::where('poolType', ExpenseCategory::POOL_PROJECT_WISE)->pluck('code')->all();
    }
}
