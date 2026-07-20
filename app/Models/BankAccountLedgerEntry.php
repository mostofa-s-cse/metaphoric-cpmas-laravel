<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * A single line in a bank/cash account's own ledger (statement of account).
 *
 * Every debit/credit BankAccount::applyDebit()/applyCredit()/reverseDebit()/
 * reverseCredit() call writes one row here, plus manual adjustments from
 * BankAccountController::adjust() — giving each account a full, persisted
 * history instead of one reconstructed on read from cash_ins/cash_outs.
 *
 * entryType: DEBIT | CREDIT | REVERSAL_DEBIT | REVERSAL_CREDIT | ADJUSTMENT
 * referenceType: App\Models\CashIn | App\Models\CashOut | null (ADJUSTMENT)
 */
class BankAccountLedgerEntry extends Model
{
    use HasUuids;

    protected $table = 'bank_account_ledger_entries';

    protected $fillable = [
        'bankAccountId',
        'entryType',
        'referenceId',
        'referenceType',
        'date',
        'amount',
        'balanceAfter',
        'description',
        'category',
    ];

    protected $casts = [
        'date'         => 'datetime',
        'amount'       => 'decimal:2',
        'balanceAfter' => 'decimal:2',
    ];

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class, 'bankAccountId');
    }

    public function scopeForAccount($query, string $bankAccountId)
    {
        return $query->where('bankAccountId', $bankAccountId);
    }

    public function scopeBetweenDates($query, ?string $from, ?string $to)
    {
        if ($from) {
            $query->where('date', '>=', \Carbon\Carbon::parse($from)->startOfDay());
        }
        if ($to) {
            $query->where('date', '<=', \Carbon\Carbon::parse($to)->endOfDay());
        }
        return $query;
    }
}
