<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Casts\EncryptedFloat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Vendor extends Model
{
    use HasUuids, Auditable;

    protected $table = 'vendors';

    protected $fillable = [
        'id',
        'name',
        'companyName',
        'contactNumber',
        'address',
        'workType',
        'contractAmount',
        'paidAmount',
        'dueAmount',
        'notes',
    ];

    protected $casts = [
        'contractAmount' => EncryptedFloat::class,
        'paidAmount' => EncryptedFloat::class,
        'dueAmount' => EncryptedFloat::class,
    ];

    public function cashOuts()
    {
        return $this->hasMany(CashOut::class, 'vendorId');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'vendorId');
    }

    public function projectAssignments()
    {
        return $this->hasMany(ProjectVendor::class, 'vendorId');
    }
}
