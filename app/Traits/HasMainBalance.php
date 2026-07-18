<?php

namespace App\Traits;

use App\Models\CashOut;
use App\Models\CompanyBalance;
use App\Models\ExpenseCategory;
use App\Models\ProjectBalance;

/**
 * Shared expense-balance logic used by every controller that creates a
 * CashOut (Transactions, Employee salary payments, Material purchases, ...).
 *
 * Two pools, no percentage split:
 * - Project-wise categories (see ExpenseCategory::isProjectWise) are capped
 *   by that specific project's own total paid-in amount (sum of its CashIn
 *   rows).
 * - Every other category draws from the combined paid-in amount across ALL
 *   projects (the "global pool"), regardless of which project (if any) the
 *   expense is tagged to.
 *
 * Both pools are read from project_balances/company_balance — running
 * totals kept in sync by CashIn/CashOut model events (BalanceSnapshotService)
 * — instead of summing the full cash_ins/cash_outs tables on every call.
 */
trait HasMainBalance
{
    private function isProjectWiseCategory(?string $category): bool
    {
        return ExpenseCategory::isProjectWise($category);
    }

    /** Combined paid-in amount across all projects (the shared/company pool). */
    private function totalPaidAmount(): float
    {
        return (float) CompanyBalance::current()->totalPaidInAllProjects;
    }

    /** One project's own paid-in amount. */
    private function projectPaidAmount(string $projectId): float
    {
        return (float) (ProjectBalance::find($projectId)?->totalPaidIn ?? 0);
    }

    private function projectWiseSpent(string $projectId): float
    {
        return (float) (ProjectBalance::find($projectId)?->totalProjectWiseSpent ?? 0);
    }

    private function globalSpent(): float
    {
        return (float) CompanyBalance::current()->totalGlobalSpent;
    }

    /**
     * Balance available for an expense. Project-wise categories draw from
     * that project's own paid-in amount (minus what that project has already
     * spent on project-wise categories); every other category draws from the
     * combined all-projects paid-in amount (minus every global-category
     * spend regardless of project). $excludeCashOutId lets an update exclude
     * the record being edited from its own "already spent" total — since the
     * snapshot totals already include that record's current (pre-update)
     * contribution, it's subtracted back out only if it currently sits in
     * the same bucket being evaluated here.
     */
    private function availableBalance(?string $projectId, ?string $category = null, ?string $excludeCashOutId = null): float
    {
        $isProjectWise = $projectId && $this->isProjectWiseCategory($category);

        if ($isProjectWise) {
            $allocated = $this->projectPaidAmount($projectId);
            $spent = $this->projectWiseSpent($projectId);
        } else {
            $allocated = $this->totalPaidAmount();
            $spent = $this->globalSpent();
        }

        if ($excludeCashOutId) {
            $excluded = CashOut::find($excludeCashOutId);
            if ($excluded) {
                $excludedIsProjectWise = $excluded->projectId && $this->isProjectWiseCategory($excluded->expenseCategory);
                $sameBucket = $isProjectWise
                    ? ($excludedIsProjectWise && $excluded->projectId === $projectId)
                    : !$excludedIsProjectWise;

                if ($sameBucket) {
                    $spent -= (float) $excluded->amountNumeric;
                }
            }
        }

        return $allocated - $spent;
    }

    private function insufficientBalanceMessage(float $available, ?string $projectId, ?string $category): string
    {
        $isProjectWise = $projectId && $this->isProjectWiseCategory($category);

        return $isProjectWise
            ? 'Insufficient project balance. Available: ' . number_format($available, 2)
            : 'Insufficient main balance. Available: ' . number_format($available, 2);
    }
}
