<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BustsDashboardCache;
use App\Casts\EncryptedFloat;
use App\Services\BalanceSnapshotService;
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
            if (!$cashIn->projectId) {
                return;
            }
            $amount = (float) $cashIn->amountNumeric;
            $service = app(BalanceSnapshotService::class);
            $service->adjustProjectPaidIn($cashIn->projectId, $amount);
            $service->adjustCompanyPaidIn($amount);
        });

        static::updated(function (CashIn $cashIn) {
            $service = app(BalanceSnapshotService::class);
            $oldProjectId = $cashIn->getOriginal('projectId');
            $oldAmount = (float) ($cashIn->getOriginal('amountNumeric') ?? 0);
            $newProjectId = $cashIn->projectId;
            $newAmount = (float) $cashIn->amountNumeric;

            if ($oldProjectId === $newProjectId) {
                $delta = $newAmount - $oldAmount;
                if ($newProjectId) {
                    $service->adjustProjectPaidIn($newProjectId, $delta);
                    $service->adjustCompanyPaidIn($delta);
                }
                return;
            }

            if ($oldProjectId) {
                $service->adjustProjectPaidIn($oldProjectId, -$oldAmount);
                $service->adjustCompanyPaidIn(-$oldAmount);
            }
            if ($newProjectId) {
                $service->adjustProjectPaidIn($newProjectId, $newAmount);
                $service->adjustCompanyPaidIn($newAmount);
            }
        });

        static::deleted(function (CashIn $cashIn) {
            if (!$cashIn->projectId) {
                return;
            }
            $amount = (float) $cashIn->amountNumeric;
            $service = app(BalanceSnapshotService::class);
            $service->adjustProjectPaidIn($cashIn->projectId, -$amount);
            $service->adjustCompanyPaidIn(-$amount);
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
        'date' => 'datetime',
        'amount' => EncryptedFloat::class . ':amountNumeric',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId');
    }
}
