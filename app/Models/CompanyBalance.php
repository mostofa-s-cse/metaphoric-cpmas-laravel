<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Single-row running total for the shared company/office pool (combined
 * project-linked cash-in minus every global-category cash-out) — maintained
 * incrementally by CashIn/CashOut model events (see BalanceSnapshotService).
 */
class CompanyBalance extends Model
{
    protected $table = 'company_balance';

    protected $fillable = ['totalPaidInAllProjects', 'totalGlobalSpent'];

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1], [
            'totalPaidInAllProjects' => 0,
            'totalGlobalSpent' => 0,
        ]);
    }
}
