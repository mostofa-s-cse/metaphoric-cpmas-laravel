<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BustsDashboardCache;
use App\Casts\EncryptedFloat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CashOut extends Model
{
    use HasUuids, Auditable, BustsDashboardCache;

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
        'amount' => EncryptedFloat::class,
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
