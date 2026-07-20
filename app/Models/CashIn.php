<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BustsDashboardCache;
use App\Casts\EncryptedFloat;
use App\Services\BalanceSnapshotService;
use App\Services\BankAccountService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class CashIn extends Model
{
    use HasUuids, Auditable, BustsDashboardCache, SoftDeletes;

    // Only project-linked CashIn counts toward any balance (mirrors the old
    // totalPaidAmount()'s whereNotNull('projectId') filter) — keeps
    // project_balances/company_balance as running totals so HasMainBalance
    // can read them in O(1) instead of summing the full cash_ins table.
    protected static function booted()
    {
        static::created(function (CashIn $cashIn) {
            // ── 1. Running balance snapshots ──────────────────────────────
            if ($cashIn->projectId) {
                $amount = (float) $cashIn->amountNumeric;
                $service = app(BalanceSnapshotService::class);
                $service->adjustProjectPaidIn($cashIn->projectId, $amount);
                $service->adjustCompanyPaidIn($amount);

                // ── 2. Project ledger entry ───────────────────────────────
                ProjectLedgerEntry::create([
                    'projectId'       => $cashIn->projectId,
                    'entryType'       => 'CASH_IN',
                    'referenceId'     => $cashIn->id,
                    'referenceType'   => self::class,
                    'date'            => $cashIn->date,
                    'amount'          => $amount,
                    'description'     => $cashIn->clientName,
                    'expenseCategory' => null,
                    'paymentMethod'   => $cashIn->paymentMethod,
                    'bankOrCashAccount' => $cashIn->bankOrCash,
                ]);
            }

            // ── 3. Bank account balance ───────────────────────────────────
            // Only non-project cash-in (office/company income) touches the
            // wallet — project cash-in is tracked purely via project_balances
            // / project_ledger_entries and must stay unrelated to the bank wallet.
            if (!$cashIn->projectId) {
                app(BankAccountService::class)->applyCredit(
                    $cashIn->bankOrCash,
                    $cashIn->paymentMethod,
                    (float) $cashIn->amountNumeric,
                    [
                        'referenceId'   => $cashIn->id,
                        'referenceType' => self::class,
                        'date'          => $cashIn->date,
                        'description'   => $cashIn->clientName,
                        'category'      => $cashIn->source,
                    ]
                );
            }
        });

        static::updated(function (CashIn $cashIn) {
            $service = app(BalanceSnapshotService::class);
            $bankService = app(BankAccountService::class);

            $oldProjectId  = $cashIn->getOriginal('projectId');
            $oldAmount     = (float) ($cashIn->getOriginal('amountNumeric') ?? 0);
            $newProjectId  = $cashIn->projectId;
            $newAmount     = (float) $cashIn->amountNumeric;
            $oldBankOrCash = $cashIn->getOriginal('bankOrCash');
            $oldMethod     = $cashIn->getOriginal('paymentMethod');

            // ── Running balance snapshots ──────────────────────────────────
            if ($oldProjectId === $newProjectId) {
                $delta = $newAmount - $oldAmount;
                if ($newProjectId) {
                    $service->adjustProjectPaidIn($newProjectId, $delta);
                    $service->adjustCompanyPaidIn($delta);
                }
            } else {
                if ($oldProjectId) {
                    $service->adjustProjectPaidIn($oldProjectId, -$oldAmount);
                    $service->adjustCompanyPaidIn(-$oldAmount);
                }
                if ($newProjectId) {
                    $service->adjustProjectPaidIn($newProjectId, $newAmount);
                    $service->adjustCompanyPaidIn($newAmount);
                }
            }

            // ── Bank account balance ───────────────────────────────────────
            // Reverse the old credit only if the old row actually touched the
            // wallet (was non-project), apply the new credit only if the row
            // is still non-project after the update.
            if (!$oldProjectId) {
                $bankService->reverseCredit($oldBankOrCash, $oldMethod, $oldAmount, [
                    'referenceId'   => $cashIn->id,
                    'referenceType' => self::class,
                    'date'          => $cashIn->getOriginal('date') ?? $cashIn->date,
                    'description'   => $cashIn->getOriginal('clientName') ?? $cashIn->clientName,
                    'category'      => $cashIn->getOriginal('source') ?? $cashIn->source,
                ]);
            }
            if (!$newProjectId) {
                $bankService->applyCredit($cashIn->bankOrCash, $cashIn->paymentMethod, $newAmount, [
                    'referenceId'   => $cashIn->id,
                    'referenceType' => self::class,
                    'date'          => $cashIn->date,
                    'description'   => $cashIn->clientName,
                    'category'      => $cashIn->source,
                ]);
            }

            // ── Project ledger entry ───────────────────────────────────────
            // Remove old ledger entry and re-create with updated values.
            ProjectLedgerEntry::where('referenceId', $cashIn->id)
                ->where('referenceType', self::class)
                ->delete();

            if ($newProjectId) {
                ProjectLedgerEntry::create([
                    'projectId'         => $newProjectId,
                    'entryType'         => 'CASH_IN',
                    'referenceId'       => $cashIn->id,
                    'referenceType'     => self::class,
                    'date'              => $cashIn->date,
                    'amount'            => $newAmount,
                    'description'       => $cashIn->clientName,
                    'expenseCategory'   => null,
                    'paymentMethod'     => $cashIn->paymentMethod,
                    'bankOrCashAccount' => $cashIn->bankOrCash,
                ]);
            }
        });

        static::deleted(function (CashIn $cashIn) {
            $amount = (float) $cashIn->amountNumeric;

            // ── Running balance snapshots ──────────────────────────────────
            if ($cashIn->projectId) {
                $service = app(BalanceSnapshotService::class);
                $service->adjustProjectPaidIn($cashIn->projectId, -$amount);
                $service->adjustCompanyPaidIn(-$amount);
            }

            // ── Bank account balance ───────────────────────────────────────
            if (!$cashIn->projectId) {
                app(BankAccountService::class)->reverseCredit(
                    $cashIn->bankOrCash,
                    $cashIn->paymentMethod,
                    $amount,
                    [
                        'referenceId'   => $cashIn->id,
                        'referenceType' => self::class,
                        'date'          => $cashIn->date,
                        'description'   => $cashIn->clientName,
                        'category'      => $cashIn->source,
                    ]
                );
            }

            // ── Project ledger entry ───────────────────────────────────────
            ProjectLedgerEntry::where('referenceId', $cashIn->id)
                ->where('referenceType', self::class)
                ->delete();
        });
    }

    protected $table = 'cash_ins';

    protected $fillable = [
        'id',
        'date',
        'projectId',
        'clientName',
        'amount',
        'paymentMethod',
        'bankOrCash',
        'referenceNumber',
        'source',
        'notes',
    ];

    protected $casts = [
        'date'   => 'datetime',
        'amount' => EncryptedFloat::class . ':amountNumeric',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId');
    }
}
