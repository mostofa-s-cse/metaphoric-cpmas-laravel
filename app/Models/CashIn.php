<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BustsDashboardCache;
use App\Casts\EncryptedFloat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CashIn extends Model
{
    use HasUuids, Auditable, BustsDashboardCache;

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
