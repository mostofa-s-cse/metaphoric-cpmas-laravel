<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Casts\EncryptedFloat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Facades\Cache;

class Project extends Model
{
    use HasUuids, Auditable;

    // Main Balance math (HasMainBalance::totalProjectBudget) caches the sum of
    // every project's estimatedBudget — bust it whenever a project's budget
    // could have changed, since estimatedBudget is an encrypted column and
    // can't be summed in SQL (must load every row into PHP otherwise).
    protected static function booted()
    {
        static::saved(function () {
            Cache::forget('main_balance:total_project_budget');
            Cache::forget('dashboard:financials');
        });
        static::deleted(function () {
            Cache::forget('main_balance:total_project_budget');
            Cache::forget('dashboard:financials');
        });
    }

    protected $table = 'projects';

    protected $fillable = [
        'id',
        'name',
        'code',
        'clientName',
        'clientContactNumber',
        'projectLocation',
        'startDate',
        'expectedCompletionDate',
        'estimatedBudget',
        'status',
        'projectType',
        'description',
    ];

    protected $casts = [
        'startDate' => 'datetime',
        'expectedCompletionDate' => 'datetime',
        'estimatedBudget' => EncryptedFloat::class,
    ];

    public function materials()
    {
        return $this->hasMany(Material::class, 'projectId');
    }

    public function cashIns()
    {
        return $this->hasMany(CashIn::class, 'projectId');
    }

    public function cashOuts()
    {
        return $this->hasMany(CashOut::class, 'projectId');
    }

    public function labours()
    {
        return $this->hasMany(Labour::class, 'projectId');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'projectId');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'projectId');
    }

    public function projectVendors()
    {
        return $this->hasMany(ProjectVendor::class, 'projectId');
    }

    public function projectSuppliers()
    {
        return $this->hasMany(ProjectSupplier::class, 'projectId');
    }
}
