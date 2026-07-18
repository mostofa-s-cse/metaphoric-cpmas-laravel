<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BustsDashboardCache;
use App\Casts\EncryptedFloat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Supplier extends Model
{
    use HasUuids, Auditable, BustsDashboardCache;

    protected $table = 'suppliers';

    protected $fillable = [
        'id',
        'name',
        'companyName',
        'phoneNumber',
        'email',
        'address',
        'openingBalance',
        'currentDue',
        'notes',
    ];

    protected $casts = [
        'openingBalance' => EncryptedFloat::class,
        'currentDue' => EncryptedFloat::class . ':currentDueNumeric',
    ];

    public function materials()
    {
        return $this->hasMany(Material::class, 'supplierId');
    }

    public function cashOuts()
    {
        return $this->hasMany(CashOut::class, 'supplierId');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'supplierId');
    }

    public function projectAssignments()
    {
        return $this->hasMany(ProjectSupplier::class, 'supplierId');
    }
}
