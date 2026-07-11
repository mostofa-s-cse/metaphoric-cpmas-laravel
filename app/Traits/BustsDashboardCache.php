<?php

namespace App\Traits;

use Illuminate\Support\Facades\Cache;

/**
 * Every model whose rows feed DashboardController's cached financial summary
 * (CashIn, CashOut, Supplier, Vendor, Salary) uses this so a create/update/
 * delete anywhere busts the cache instead of the dashboard silently serving
 * stale totals until the TTL expires.
 */
trait BustsDashboardCache
{
    protected static function bootBustsDashboardCache()
    {
        static::saved(fn () => Cache::forget('dashboard:financials'));
        static::deleted(fn () => Cache::forget('dashboard:financials'));
    }
}
