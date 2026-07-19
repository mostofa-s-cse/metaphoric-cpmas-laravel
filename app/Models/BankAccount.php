<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Manually-maintained Bank / Cash account.
 *
 * currentBalance is kept as a running total (openingBalance + totalIn - totalOut).
 * It is updated by CashIn/CashOut model events via BankAccountService, and can
 * also be adjusted manually by an admin through the Balance Adjustment endpoint.
 *
 * accountType: BANK | CASH | MOBILE_BANKING
 */
class BankAccount extends Model
{
    use HasUuids;

    protected $table = 'bank_accounts';

    protected $fillable = [
        'name',
        'accountType',
        'accountNumber',
        'bankName',
        'openingBalance',
        'currentBalance',
        'totalIn',
        'totalOut',
        'notes',
        'isActive',
    ];

    protected $casts = [
        'openingBalance'  => 'decimal:2',
        'currentBalance'  => 'decimal:2',
        'totalIn'         => 'decimal:2',
        'totalOut'        => 'decimal:2',
        'isActive'        => 'boolean',
    ];

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('isActive', true);
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('accountType', $type);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Apply a debit (cash-out) delta to this account's running totals.
     * Pass a positive amount; this method subtracts from currentBalance.
     */
    public function applyDebit(float $amount): void
    {
        $this->increment('totalOut', $amount);
        $this->decrement('currentBalance', $amount);
        Cache::forget('bank_accounts:summary');
    }

    /**
     * Apply a credit (cash-in) delta to this account's running totals.
     */
    public function applyCredit(float $amount): void
    {
        $this->increment('totalIn', $amount);
        $this->increment('currentBalance', $amount);
        Cache::forget('bank_accounts:summary');
    }

    /**
     * Reverse a previously-applied credit (e.g. on CashIn delete/update).
     */
    public function reverseCredit(float $amount): void
    {
        $this->decrement('totalIn', $amount);
        $this->decrement('currentBalance', $amount);
        Cache::forget('bank_accounts:summary');
    }

    /**
     * Reverse a previously-applied debit (e.g. on CashOut delete/update).
     */
    public function reverseDebit(float $amount): void
    {
        $this->decrement('totalOut', $amount);
        $this->increment('currentBalance', $amount);
        Cache::forget('bank_accounts:summary');
    }

    /**
     * Recalculate currentBalance from scratch.
     * openingBalance + totalIn - totalOut
     */
    public function recalculate(): void
    {
        $this->currentBalance = $this->openingBalance + $this->totalIn - $this->totalOut;
        $this->save();
        Cache::forget('bank_accounts:summary');
    }
}
