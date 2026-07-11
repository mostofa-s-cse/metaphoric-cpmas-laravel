<?php

namespace App\Traits;

use App\Models\CashOut;
use App\Models\Project;
use App\Models\WebsiteSettings;

/**
 * Shared Main Balance logic used by every controller that creates a CashOut
 * (Transactions, Employee salary payments, Material purchases, ...) so the
 * 30%-of-project-budget rule and the admin-configured category list
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
     * Balance available for an expense. Draws from the shared main balance
     * (configured % of all projects' budgets, minus every general expense and
     * every expense whose category is configured to draw from main balance)
     * when no project is linked or the category forces main balance; otherwise
     * draws from that project's own share (minus what it already spent,
     * excluding amounts that were actually funded by main balance).
     * $excludeCashOutId lets an update exclude the record being edited from
     * its own "already spent" total.
     */
    private function availableBalance(?string $projectId, ?string $category = null, ?string $excludeCashOutId = null): float
    {
        $config = $this->mainBalanceConfig();
        $drawsFromMain = !$projectId || $this->isMainBalanceCategory($category, $config);

        if ($drawsFromMain) {
            $allocated = (float) Project::all()->sum('estimatedBudget') * $config['percentage'];
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
