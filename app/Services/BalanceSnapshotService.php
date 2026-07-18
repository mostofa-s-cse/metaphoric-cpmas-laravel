<?php

namespace App\Services;

use App\Models\ExpenseCategory;
use Illuminate\Support\Facades\DB;

/**
 * Keeps project_balances / company_balance as running totals, updated by a
 * small delta on every CashIn/CashOut create/update/delete (see the model
 * events in CashIn and CashOut) instead of recomputing the full sum from
 * cash_ins/cash_outs on every read (what HasMainBalance did before). Reads
 * become an O(1) row lookup; `php artisan balances:reconcile` recomputes
 * from the raw ledger and corrects any drift if a write path is ever missed.
 *
 * Uses an atomic upsert-increment (single statement, race-free under
 * concurrent writes) rather than select-then-update. The SQL differs
 * between MySQL (production) and SQLite (the in-memory test database), so
 * both dialects are supported here.
 */
class BalanceSnapshotService
{
    public function adjustProjectPaidIn(string $projectId, float $delta): void
    {
        $this->upsertIncrement(
            'project_balances', 'projectId', $projectId,
            ['totalPaidIn' => $delta, 'totalProjectWiseSpent' => 0.0],
            ['totalPaidIn' => $delta]
        );
    }

    public function adjustProjectSpent(string $projectId, float $delta): void
    {
        $this->upsertIncrement(
            'project_balances', 'projectId', $projectId,
            ['totalPaidIn' => 0.0, 'totalProjectWiseSpent' => $delta],
            ['totalProjectWiseSpent' => $delta]
        );
    }

    public function adjustCompanyPaidIn(float $delta): void
    {
        $this->upsertIncrement(
            'company_balance', 'id', 1,
            ['totalPaidInAllProjects' => $delta, 'totalGlobalSpent' => 0.0],
            ['totalPaidInAllProjects' => $delta]
        );
    }

    public function adjustCompanySpent(float $delta): void
    {
        $this->upsertIncrement(
            'company_balance', 'id', 1,
            ['totalPaidInAllProjects' => 0.0, 'totalGlobalSpent' => $delta],
            ['totalGlobalSpent' => $delta]
        );
    }

    /**
     * A CashOut's amount lands in one of two buckets, mirroring
     * HasMainBalance::availableBalance()'s rule exactly: a project-wise
     * category tagged to a real project depletes that project's own pool;
     * everything else (global categories, or a project-wise category with no
     * project) depletes the shared company pool.
     */
    public function applyCashOutDelta(?string $projectId, ?string $category, float $delta): void
    {
        $isProjectWise = $projectId && ExpenseCategory::isProjectWise($category);

        if ($isProjectWise) {
            $this->adjustProjectSpent($projectId, $delta);
        } else {
            $this->adjustCompanySpent($delta);
        }
    }

    /**
     * @param array<string,float> $insertDefaults every non-key column, at the value it should have on first insert
     * @param array<string,float> $increments subset of $insertDefaults that should be added to the existing row on conflict
     */
    private function upsertIncrement(string $table, string $keyColumn, string|int $keyValue, array $insertDefaults, array $increments): void
    {
        if (array_sum($increments) === 0.0) {
            return;
        }

        $insertColumns = array_merge([$keyColumn], array_keys($insertDefaults));
        $insertValues = array_merge([$keyValue], array_values($insertDefaults));

        $columnList = implode(', ', array_merge($insertColumns, ['created_at', 'updated_at']));
        $valueList = implode(', ', array_fill(0, count($insertColumns), '?')) . ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP';

        $isSqlite = DB::connection()->getDriverName() === 'sqlite';

        if ($isSqlite) {
            $setClause = implode(', ', array_map(
                fn ($col) => "{$col} = {$col} + excluded.{$col}",
                array_keys($increments)
            ));
            $sql = "INSERT INTO {$table} ({$columnList}) VALUES ({$valueList})
                    ON CONFLICT({$keyColumn}) DO UPDATE SET {$setClause}, updated_at = CURRENT_TIMESTAMP";
        } else {
            $setClause = implode(', ', array_map(
                fn ($col) => "{$col} = {$col} + VALUES({$col})",
                array_keys($increments)
            ));
            $sql = "INSERT INTO {$table} ({$columnList}) VALUES ({$valueList})
                    ON DUPLICATE KEY UPDATE {$setClause}, updated_at = CURRENT_TIMESTAMP";
        }

        DB::statement($sql, $insertValues);
    }
}
