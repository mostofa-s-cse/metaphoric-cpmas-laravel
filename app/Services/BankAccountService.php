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
     */
    public function reconcile(BankAccount $account): void
    {
        $totalIn = \App\Models\CashIn::where('bankOrCash', $account->name)
            ->sum('amountNumeric');

        // CashOut has no bankOrCash, so use paymentMethod + accountType
        $accountType = $account->accountType;
        $methods = array_keys(array_filter(self::METHOD_TYPE_MAP, fn ($t) => $t === $accountType));
        $totalOut = \App\Models\CashOut::whereIn('paymentMethod', $methods)
            ->sum('amountNumeric');

        $account->totalIn      = $totalIn;
        $account->totalOut     = $totalOut;
        $account->currentBalance = $account->openingBalance + $totalIn - $totalOut;
        $account->save();

        Cache::forget('bank_accounts:summary');
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
