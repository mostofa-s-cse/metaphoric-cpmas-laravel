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
     * Real, current available cash across every active bank/cash/mobile
     * banking account — the actual "Main Balance" (not the legacy
     * CompanyBalance paid-in pool).
     */
    public static function totalBalance(): float
    {
        return (float) static::where('isActive', true)->sum('currentBalance');
    }

    /**
     * Apply a debit (cash-out) delta to this account's running totals.
     * Pass a positive amount; this method subtracts from currentBalance.
     * $meta: referenceId, referenceType, date, description, category — used
     * to write a bank_account_ledger_entries row for this movement.
     */
    public function applyDebit(float $amount, array $meta = []): void
    {
        $this->increment('totalOut', $amount);
        $this->decrement('currentBalance', $amount);
        Cache::forget('bank_accounts:summary');
        $this->writeLedgerEntry('DEBIT', $amount, $meta);
    }

    /**
     * Apply a credit (cash-in) delta to this account's running totals.
     */
    public function applyCredit(float $amount, array $meta = []): void
    {
        $this->increment('totalIn', $amount);
        $this->increment('currentBalance', $amount);
        Cache::forget('bank_accounts:summary');
        $this->writeLedgerEntry('CREDIT', $amount, $meta);
    }

    /**
     * Reverse a previously-applied credit (e.g. on CashIn delete/update).
     */
    public function reverseCredit(float $amount, array $meta = []): void
    {
        $this->decrement('totalIn', $amount);
        $this->decrement('currentBalance', $amount);
        Cache::forget('bank_accounts:summary');
        $this->writeLedgerEntry('REVERSAL_CREDIT', $amount, $meta);
    }

    /**
     * Reverse a previously-applied debit (e.g. on CashOut delete/update).
     */
    public function reverseDebit(float $amount, array $meta = []): void
    {
        $this->decrement('totalOut', $amount);
        $this->increment('currentBalance', $amount);
        Cache::forget('bank_accounts:summary');
        $this->writeLedgerEntry('REVERSAL_DEBIT', $amount, $meta);
    }

    /**
     * Log a manual balance correction (BankAccountController::adjust()).
     * Unlike DEBIT/CREDIT, amount is signed (the diff can be negative) since
     * an adjustment isn't inherently money-in or money-out.
     */
    public function logAdjustment(float $diff, string $reason): void
    {
        $this->writeLedgerEntry('ADJUSTMENT', $diff, ['description' => $reason]);
    }

    /**
     * Log the correction made by BankAccountService::reconcile() (full
     * recompute from raw cash_ins/cash_outs). Same signed-amount exception
     * as logAdjustment — a reconcile isn't inherently money-in or money-out.
     */
    public function logReconcile(float $diff): void
    {
        $this->writeLedgerEntry('RECONCILE', $diff, ['description' => 'Reconciled from raw cash_ins/cash_outs']);
    }

    /**
     * Writes one bank_account_ledger_entries row per balance-affecting call.
     * Skipped for zero-amount deltas (BankAccountService already no-ops those
     * before reaching here, but this guards direct callers too).
     */
    private function writeLedgerEntry(string $entryType, float $amount, array $meta): void
    {
        if ($amount == 0.0) {
            return;
        }

        BankAccountLedgerEntry::create([
            'bankAccountId' => $this->id,
            'entryType'     => $entryType,
            'referenceId'   => $meta['referenceId'] ?? null,
            'referenceType' => $meta['referenceType'] ?? null,
            'date'          => $meta['date'] ?? now(),
            'amount'        => $amount,
            'balanceAfter'  => (float) $this->currentBalance,
            'description'   => $meta['description'] ?? null,
            'category'      => $meta['category'] ?? null,
        ]);
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
