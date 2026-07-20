<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BustsDashboardCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Attendance extends Model
{
    use HasUuids, Auditable, BustsDashboardCache;

    protected $table = 'attendances';

    protected $fillable = [
        'id',
        'date',
        'status',
        'labourId',
        'projectId',
    ];

    protected $casts = [
        'date' => 'datetime',
    ];

    public function labour()
    {
        return $this->belongsTo(Labour::class, 'labourId');
    }

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId');
    }
}
