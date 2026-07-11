<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Casts\EncryptedFloat;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Labour extends Model
{
    use HasUuids, Auditable;

    protected $table = 'labours';

    protected $fillable = [
        'id',
        'name',
        'phoneNumber',
        'trade',
        'dailyWage',
        'employmentStatus',
        'projectId',
    ];

    protected $casts = [
        'dailyWage' => EncryptedFloat::class,
    ];

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'labourId');
    }

    public function cashOuts()
    {
        return $this->hasMany(CashOut::class, 'labourId');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'labourId');
    }
}
