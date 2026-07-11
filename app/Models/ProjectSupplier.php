<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Casts\EncryptedFloat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ProjectSupplier extends Model
{
    use HasUuids, Auditable;

    protected $table = 'project_suppliers';

    protected $fillable = [
        'id',
        'projectId',
        'supplierId',
        'contractAmount',
        'paidAmount',
        'dueAmount',
    ];

    protected $casts = [
        'contractAmount' => EncryptedFloat::class,
        'paidAmount' => EncryptedFloat::class,
        'dueAmount' => EncryptedFloat::class,
    ];

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplierId');
    }
}
