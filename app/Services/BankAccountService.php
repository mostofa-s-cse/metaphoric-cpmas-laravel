<?php

namespace App\Services;

use App\Models\BankAccount;
use Illuminate\Support\Facades\Cache;

/**
 * Keeps bank_accounts.currentBalance / totalIn / totalOut as running totals.
 *
 * Lookup strategy: a CashIn row carries `bankOrCash` (a free-text account name
 * like "Dutch-Bangla Bank" or "Office Cash") plus `paymentMethod` (BANK | CASH |
 * MOBILE_BANKING). We match by name first; if none is found we match by
 * accountType that corresponds to the paymentMethod, picking the first active one.
 *
 * CashOut rows currently have no bankOrCash field, so we only match by
 * paymentMethod there (pass null as $accountName).
 *
 * If no matching account exists the call is a no-op — the system degrades
 * gracefully and the admin can create the account later and run reconcile.
 */
class BankAccountService
{
    /**
     * Map paymentMethod -> accountType for fallback lookup.
     */
    private const METHOD_TYPE_MAP = [
        'BANK'           => 'BANK',
        'CHEQUE'         => 'BANK',
        'CASH'           => 'CASH',
        'MOBILE_BANKING' => 'MOBILE_BANKING',
    ];

    // ── Public API ────────────────────────────────────────────────────────────

    public function applyCredit(?string $accountName, ?string $paymentMethod, float $amount): void
    {
        if ($amount == 0.0) return;
        $account = $this->resolve($accountName, $paymentMethod);
        $account?->applyCredit($amount);
    }

    public function reverseCredit(?string $accountName, ?string $paymentMethod, float $amount): void
    {
        if ($amount == 0.0) return;
        $account = $this->resolve($accountName, $paymentMethod);
        $account?->reverseCredit($amount);
    }

    public function applyDebit(?string $accountName, ?string $paymentMethod, float $amount): void
    {
        if ($amount == 0.0) return;
        $account = $this->resolve($accountName, $paymentMethod);
        $account?->applyDebit($amount);
    }

    public function reverseDebit(?string $accountName, ?string $paymentMethod, float $amount): void
    {
        if ($amount == 0.0) return;
        $account = $this->resolve($accountName, $paymentMethod);
        $account?->reverseDebit($amount);
    }

    /**
     * Full recompute for a single account — reads all linked cash_ins/cash_outs
     * to reset totalIn/totalOut/currentBalance from scratch.
     * Used by the "Reconcile" admin action.
     *
     * Every row is attributed via the exact same resolve() logic applyCredit/
     * applyDebit used when the row was first created (name match first, then
     * type fallback) — NOT a plain `bankOrCash = name` / `paymentMethod IN`
     * query. That naive version used to silently drop any CashIn whose free-
     * text bankOrCash didn't exactly match this account's name (even though
     * it was originally fallback-matched here), and could double-count
     * CashOut across multiple same-type accounts. Pulling the full table into
     * PHP is the same tradeoff SupplierController/VendorController already
     * make for EncryptedFloat-cast sums.
     */
    public function reconcile(BankAccount $account): void
    {
        $totalIn = \App\Models\CashIn::all(['id', 'bankOrCash', 'paymentMethod', 'amountNumeric'])
            ->filter(fn ($c) => $this->resolve($c->bankOrCash, $c->paymentMethod)?->id === $account->id)
            ->sum('amountNumeric');

        $totalOut = \App\Models\CashOut::all(['id', 'bankAccountId', 'paymentMethod', 'amountNumeric'])
            ->filter(fn ($c) => $c->bankAccountId === $account->id
                || (!$c->bankAccountId && $this->resolve(null, $c->paymentMethod)?->id === $account->id))
            ->sum('amountNumeric');

        $account->totalIn      = $totalIn;
        $account->totalOut     = $totalOut;
        $account->currentBalance = $account->openingBalance + $totalIn - $totalOut;
        $account->save();

        Cache::forget('bank_accounts:summary');
    }

    /**
     * Public wrapper around resolve() — lets callers (e.g. the account
     * History endpoint) figure out, after the fact, which account a legacy
     * CashIn/CashOut row (no direct bankAccountId) actually hit, using the
     * exact same name-then-type-fallback logic applyCredit/applyDebit use.
     */
    public function resolveAccountId(?string $accountName, ?string $paymentMethod): ?string
    {
        return $this->resolve($accountName, $paymentMethod)?->id;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Resolve a BankAccount by name (exact) or fall back to accountType.
     * Result is NOT cached because balances mutate frequently.
     */
    private function resolve(?string $accountName, ?string $paymentMethod): ?BankAccount
    {
        if ($accountName) {
            $account = BankAccount::where('name', $accountName)->where('isActive', true)->first();
            if ($account) {
                return $account;
            }
        }

        // Fallback: match by accountType derived from paymentMethod
        $accountType = self::METHOD_TYPE_MAP[$paymentMethod ?? ''] ?? null;
        if (!$accountType) {
            return null;
        }

        return BankAccount::where('accountType', $accountType)
            ->where('isActive', true)
            ->orderBy('created_at')
            ->first();
    }
}
