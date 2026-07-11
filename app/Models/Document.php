<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Document extends Model
{
    use HasUuids, Auditable;

    protected $table = 'documents';

    protected $fillable = [
        'id',
        'name',
        'url',
        'uploadDate',
        'description',
        'fileType',
        'category',
        'projectId',
        'supplierId',
        'vendorId',
        'employeeId',
        'labourId',
    ];

    protected $casts = [
        'uploadDate' => 'datetime',
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
}
