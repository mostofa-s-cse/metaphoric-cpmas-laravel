<?php

namespace App\Traits;

use App\Models\CashIn;
use App\Models\CashOut;
use App\Models\Project;
use App\Models\WebsiteSettings;
use Illuminate\Support\Facades\Cache;

/**
 * Shared Main Balance logic used by every controller that creates a CashOut
 * (Transactions, Employee salary payments, Material purchases, ...) so the
 * 30%-of-total-paid-amount rule and the admin-configured category list
 * (Settings > Main Balance) are enforced consistently everywhere.
 */
trait HasMainBalance
{
    const DEFAULT_MAIN_BALANCE_PERCENTAGE = 0.30;
    const MAIN_BALANCE_CONFIG_KEY = 'MAIN_BALANCE_CONFIG';

    /**
     * Reads the admin-configurable Main Balance setting: what percentage of
     * every project's budget feeds the shared main balance, and which expense
     * categories always draw from main balance regardless of linked project.
     * Falls back to the original 30% / no forced categories when unset.
     */
    private function mainBalanceConfig(): array
    {
        $value = WebsiteSettings::where('key', self::MAIN_BALANCE_CONFIG_KEY)->first()?->value ?? [];

        $percentage = isset($value['percentage']) && is_numeric($value['percentage'])
            ? max(0, min(100, (float) $value['percentage'])) / 100
            : self::DEFAULT_MAIN_BALANCE_PERCENTAGE;

        $categories = is_array($value['categories'] ?? null) ? array_values($value['categories']) : [];

        return ['percentage' => $percentage, 'categories' => $categories];
    }

    private function isMainBalanceCategory(?string $category, array $config): bool
    {
        return $category && in_array($category, $config['categories'], true);
    }

    /**
     * Sum of every project's estimatedBudget. estimatedBudget is an encrypted
     * column so it can't be summed in SQL — this is the one place that pays
     * the full-table-scan-and-decrypt cost; every other call site (Dashboard,
     * Transactions summary, this trait) reuses the cached value instead of
     * repeating the scan. Invalidated by Project::booted() on save/delete.
     */
    private function totalProjectBudget(): float
    {
        return Cache::remember('main_balance:total_project_budget', now()->addDay(), function () {
            return (float) Project::all()->sum('estimatedBudget');
        });
    }

    /**
     * Sum of every project-linked CashIn's amount (the "Paid Amount" shown per
     * project on the Projects page, totalled across all projects). amount is
     * an encrypted column so it can't be summed in SQL — same full-table-scan
     * caveat as totalProjectBudget(). Invalidated by CashIn::booted() on
     * save/delete.
     */
    private function totalPaidAmount(): float
    {
        return Cache::remember('main_balance:total_paid_amount', now()->addDay(), function () {
            return (float) CashIn::whereNotNull('projectId')->get()->sum('amount');
        });
    }

    /**
     * Balance available for an expense. Draws from the shared main balance
     * (configured % of all projects' total paid amount, minus every general
     * expense and every expense whose category is configured to draw from
     * main balance) when no project is linked or the category forces main
     * balance; otherwise draws from that project's own share (minus what it
     * already spent, excluding amounts that were actually funded by main
     * balance). $excludeCashOutId lets an update exclude the record being
     * edited from its own "already spent" total.
     */
    private function availableBalance(?string $projectId, ?string $category = null, ?string $excludeCashOutId = null): float
    {
        $config = $this->mainBalanceConfig();
        $drawsFromMain = !$projectId || $this->isMainBalanceCategory($category, $config);

        if ($drawsFromMain) {
            $allocated = $this->totalPaidAmount() * $config['percentage'];
            $spentQuery = CashOut::where(function ($q) use ($config) {
                $q->whereNull('projectId');
                if (!empty($config['categories'])) {
                    $q->orWhereIn('expenseCategory', $config['categories']);
                }
            });
        } else {
            $project = Project::findOrFail($projectId);
            $allocated = (float) $project->estimatedBudget * (1 - $config['percentage']);
            $spentQuery = CashOut::where('projectId', $projectId);
            if (!empty($config['categories'])) {
                $spentQuery->whereNotIn('expenseCategory', $config['categories']);
            }
        }

        if ($excludeCashOutId) {
            $spentQuery->where('id', '!=', $excludeCashOutId);
        }

        $spent = (float) $spentQuery->get()->sum('amount');

        return $allocated - $spent;
    }

    private function insufficientBalanceMessage(float $available, ?string $projectId, ?string $category): string
    {
        $config = $this->mainBalanceConfig();
        $drawsFromMain = !$projectId || $this->isMainBalanceCategory($category, $config);

        return $drawsFromMain
            ? 'Insufficient main balance. Available: ' . number_format($available, 2)
            : 'Insufficient project balance. Available: ' . number_format($available, 2);
    }
}
