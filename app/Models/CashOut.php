<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BustsDashboardCache;
use App\Casts\EncryptedFloat;
use App\Models\ExpenseCategory;
use App\Services\BalanceSnapshotService;
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
    protected static function booted()
    {
        static::created(function (CashOut $cashOut) {
            app(BalanceSnapshotService::class)->applyCashOutDelta(
                $cashOut->projectId, $cashOut->expenseCategory, (float) $cashOut->amountNumeric
            );
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
        });

        static::deleted(function (CashOut $cashOut) {
            app(BalanceSnapshotService::class)->applyCashOutDelta(
                $cashOut->projectId, $cashOut->expenseCategory, -(float) $cashOut->amountNumeric
            );
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
        'date' => 'datetime',
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
