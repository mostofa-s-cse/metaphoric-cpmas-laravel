<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Casts\EncryptedFloat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Employee extends Model
{
    use HasUuids, Auditable;

    protected $table = 'employees';

    protected $fillable = [
        'id',
        'employeeId',
        'fullName',
        'designation',
        'department',
        'phoneNumber',
        'email',
        'joiningDate',
        'monthlySalary',
        'employmentStatus',
    ];

    protected $casts = [
        'joiningDate' => 'datetime',
        'monthlySalary' => EncryptedFloat::class,
    ];

    public function salaries()
    {
        return $this->hasMany(Salary::class, 'employeeId');
    }

    public function cashOuts()
    {
        return $this->hasMany(CashOut::class, 'employeeId');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'employeeId');
    }
}
