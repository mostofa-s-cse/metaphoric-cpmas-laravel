<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Data-driven replacement for the hardcoded
 * HasMainBalance::PROJECT_WISE_CATEGORIES array — a new expense category's
 * pool (PROJECT_WISE vs GLOBAL) can be set here without a code deploy.
 */
class ExpenseCategory extends Model
{
    protected $table = 'expense_categories';

    protected $primaryKey = 'code';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['code', 'label', 'poolType'];

    const POOL_PROJECT_WISE = 'PROJECT_WISE';
    const POOL_GLOBAL = 'GLOBAL';

    protected static function booted()
    {
        static::saved(function () {
            Cache::forget('expense_categories:pool_map');
            Cache::forget('expense_categories:office_map');
        });
        static::deleted(function () {
            Cache::forget('expense_categories:pool_map');
            Cache::forget('expense_categories:office_map');
        });
    }

    /**
     * Data-driven replacement for the old hardcoded
     * HasMainBalance::PROJECT_WISE_CATEGORIES array. Cached indefinitely
     * (it's a handful of rows that only change via manual data edits) and
     * busted on any write to this table.
     */
    public static function isProjectWise(?string $code): bool
    {
        if (!$code) {
            return false;
        }

        $poolByCode = Cache::rememberForever('expense_categories:pool_map', function () {
            return static::query()->pluck('poolType', 'code')->all();
        });

        return ($poolByCode[$code] ?? self::POOL_GLOBAL) === self::POOL_PROJECT_WISE;
    }

    /**
     * Returns true for office / overhead categories (OFFICE_RENT, UTILITIES,
     * TRANSPORTATION, FUEL, EQUIPMENT_RENTAL, EMPLOYEE_SALARY, MISCELLANEOUS,
     * LABOR).
     *
     * These categories MUST NEVER draw from a project's own balance pool.
     * The projectId tag may still be stored on the CashOut row for reporting
     * purposes, but the balance check and snapshot deduction always use the
     * global company pool.
     */
    public static function isOfficeExpense(?string $code): bool
    {
        if (!$code) {
            return false;
        }

        // Check if the column exists (graceful degradation before migration runs)
        if (!\Illuminate\Support\Facades\Schema::hasColumn('expense_categories', 'isOfficeExpense')) {
            // Fallback to a hardcoded list matching the migration seed
            $officeCategories = [
                'OFFICE_RENT', 'UTILITIES', 'TRANSPORTATION', 'FUEL',
                'EQUIPMENT_RENTAL', 'EMPLOYEE_SALARY', 'MISCELLANEOUS', 'LABOR',
            ];
            return in_array($code, $officeCategories, true);
        }

        $officeMap = Cache::rememberForever('expense_categories:office_map', function () {
            return static::query()->pluck('isOfficeExpense', 'code')->all();
        });

        return (bool) ($officeMap[$code] ?? false);
    }
}
