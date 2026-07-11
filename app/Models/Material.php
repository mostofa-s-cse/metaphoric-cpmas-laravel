<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Casts\EncryptedFloat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Material extends Model
{
    use HasUuids, Auditable;

    protected $table = 'materials';

    protected $fillable = [
        'id',
        'name',
        'category',
        'quantity',
        'unit',
        'unitPrice',
        'totalPrice',
        'supplierId',
        'projectId',
        'purchaseDate',
        'invoiceNumber',
    ];

    protected $casts = [
        'quantity' => 'float',
        'unitPrice' => EncryptedFloat::class,
        'totalPrice' => EncryptedFloat::class,
        'purchaseDate' => 'datetime',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplierId');
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId');
    }
}
