<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BustsDashboardCache;
use App\Casts\EncryptedFloat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Facades\Cache;

class CashIn extends Model
{
    use HasUuids, Auditable, BustsDashboardCache;

    // Main Balance math (HasMainBalance::totalPaidAmount) caches the sum of
    // every project-linked CashIn's amount — bust it whenever a cash-in could
    // have changed, since amount is an encrypted column and can't be summed
    // in SQL (must load every row into PHP otherwise).
    protected static function booted()
    {
        static::saved(fn () => Cache::forget('main_balance:total_paid_amount'));
        static::deleted(fn () => Cache::forget('main_balance:total_paid_amount'));
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
        'amount' => EncryptedFloat::class,
    ];

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId');
    }
}
