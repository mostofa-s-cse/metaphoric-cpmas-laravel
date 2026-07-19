<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BustsDashboardCache;
use App\Casts\EncryptedFloat;
use App\Models\BankAccount;
use App\Models\ExpenseCategory;
use App\Services\BalanceSnapshotService;
use App\Services\BankAccountService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\SoftDeletes;

class CashOut extends Model
{
    use HasUuids, Auditable, BustsDashboardCache, SoftDeletes;

    // Keeps project_balances.totalProjectWiseSpent / company_balance.totalGlobalSpent
    // as running totals, mirroring HasMainBalance::availableBalance()'s bucket
    // rule exactly: project-wise category + a projectId -> project bucket,
    // everything else -> the global/company bucket.
    //
    // NEW: Also writes a project ledger entry for every project-tagged CashOut,
    // and adjusts the relevant bank/cash account's running balance.
    //
    // RULE: Office expenses (isOfficeExpense = true) ALWAYS go to the global
    // pool and NEVER deduct from a project's own balance, even if projectId
    // is set on the row (it is still recorded in the project ledger for
    // reference, but the spending bucket is always GLOBAL).
    protected static function booted()
    {
        static::created(function (CashOut $cashOut) {
            // ── Running balance snapshot ───────────────────────────────────
            app(BalanceSnapshotService::class)->applyCashOutDelta(
                $cashOut->projectId, $cashOut->expenseCategory, (float) $cashOut->amountNumeric
            );

            // ── Project ledger entry ───────────────────────────────────────
            if ($cashOut->projectId) {
                ProjectLedgerEntry::create([
                    'projectId'         => $cashOut->projectId,
                    'entryType'         => 'CASH_OUT',
                    'referenceId'       => $cashOut->id,
                    'referenceType'     => self::class,
                    'date'              => $cashOut->date,
                    'amount'            => (float) $cashOut->amountNumeric,
                    'description'       => $cashOut->paidTo,
                    'expenseCategory'   => $cashOut->expenseCategory,
                    'paymentMethod'     => $cashOut->paymentMethod,
                    'bankOrCashAccount' => null, // CashOut does not store bankOrCash field currently
                ]);
            }

            // ── Bank account balance ─────────────────────────────────────────
            // A specific bankAccountId (office/global expenses, EMPLOYEE_SALARY)
            // debits that exact account; otherwise fall back to the
            // paymentMethod-guess used by every other category.
            if ($cashOut->bankAccountId) {
                BankAccount::find($cashOut->bankAccountId)?->applyDebit((float) $cashOut->amountNumeric);
            } else {
                app(BankAccountService::class)->applyDebit(
                    null, $cashOut->paymentMethod, (float) $cashOut->amountNumeric
                );
            }
        });

        static::updated(function (CashOut $cashOut) {
            $service = app(BalanceSnapshotService::class);
            $oldAmount = (float) ($cashOut->getOriginal('amountNumeric') ?? 0);

            $service->applyCashOutDelta(
                $cashOut->getOriginal('projectId'), $cashOut->getOriginal('expenseCategory'), -$oldAmount
            );
            $service->applyCashOutDelta(
                $cashOut->projectId, $cashOut->expenseCategory, (float) $cashOut->amountNumeric
            );

            // ── Bank account balance ─────────────────────────────────────────
            $oldBankAccountId = $cashOut->getOriginal('bankAccountId');
            $oldMethod = $cashOut->getOriginal('paymentMethod');
            $newAmount = (float) $cashOut->amountNumeric;

            if ($oldBankAccountId) {
                BankAccount::find($oldBankAccountId)?->reverseDebit($oldAmount);
            } else {
                app(BankAccountService::class)->reverseDebit(null, $oldMethod, $oldAmount);
            }

            if ($cashOut->bankAccountId) {
                BankAccount::find($cashOut->bankAccountId)?->applyDebit($newAmount);
            } else {
                app(BankAccountService::class)->applyDebit(null, $cashOut->paymentMethod, $newAmount);
            }

            // ── Project ledger entry ───────────────────────────────────────
            ProjectLedgerEntry::where('referenceId', $cashOut->id)
                ->where('referenceType', self::class)
                ->delete();

            if ($cashOut->projectId) {
                ProjectLedgerEntry::create([
                    'projectId'         => $cashOut->projectId,
                    'entryType'         => 'CASH_OUT',
                    'referenceId'       => $cashOut->id,
                    'referenceType'     => self::class,
                    'date'              => $cashOut->date,
                    'amount'            => $newAmount,
                    'description'       => $cashOut->paidTo,
                    'expenseCategory'   => $cashOut->expenseCategory,
                    'paymentMethod'     => $cashOut->paymentMethod,
                    'bankOrCashAccount' => null,
                ]);
            }
        });

        static::deleted(function (CashOut $cashOut) {
            $amount = (float) $cashOut->amountNumeric;

            app(BalanceSnapshotService::class)->applyCashOutDelta(
                $cashOut->projectId, $cashOut->expenseCategory, -$amount
            );

            // ── Bank account balance ─────────────────────────────────────────
            if ($cashOut->bankAccountId) {
                BankAccount::find($cashOut->bankAccountId)?->reverseDebit($amount);
            } else {
                app(BankAccountService::class)->reverseDebit(null, $cashOut->paymentMethod, $amount);
            }

            // ── Project ledger entry ───────────────────────────────────────
            ProjectLedgerEntry::where('referenceId', $cashOut->id)
                ->where('referenceType', self::class)
                ->delete();
        });
    }

    protected $table = 'cash_outs';

    protected $fillable = [
        'id',
        'date',
        'projectId',
        'expenseCategory',
        'paidTo',
        'amount',
        'paymentMethod',
        'bankAccountId',
        'referenceNumber',
        'notes',
        'supplierId',
        'vendorId',
        'employeeId',
        'labourId',
        'materialId',
        'salaryId',
    ];

    protected $casts = [
        'date'   => 'datetime',
        'amount' => EncryptedFloat::class . ':amountNumeric',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplierId');
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class, 'vendorId');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employeeId');
    }

    public function labour()
    {
        return $this->belongsTo(Labour::class, 'labourId');
    }

    public function material()
    {
        return $this->belongsTo(Material::class, 'materialId');
    }

    public function salary()
    {
        return $this->belongsTo(Salary::class, 'salaryId');
    }
}
