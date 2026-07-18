<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BustsDashboardCache;
use App\Casts\EncryptedFloat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Salary extends Model
{
    use HasUuids, Auditable, BustsDashboardCache;

    protected $table = 'salaries';

    protected $fillable = [
        'id',
        'employeeId',
        'projectId',
        'month',
        'basicSalary',
        'bonus',
        'deduction',
        'netSalary',
        'paidAmount',
        'dueAmount',
        'paymentStatus',
    ];

    protected $casts = [
        'basicSalary' => EncryptedFloat::class,
        'bonus' => EncryptedFloat::class,
        'deduction' => EncryptedFloat::class,
        'netSalary' => EncryptedFloat::class,
        'paidAmount' => EncryptedFloat::class . ':paidAmountNumeric',
        'dueAmount' => EncryptedFloat::class . ':dueAmountNumeric',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employeeId');
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId');
    }
}
