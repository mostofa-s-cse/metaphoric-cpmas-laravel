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
        static::saved(fn () => Cache::forget('expense_categories:pool_map'));
        static::deleted(fn () => Cache::forget('expense_categories:pool_map'));
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
}
