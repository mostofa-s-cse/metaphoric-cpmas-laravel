<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class AuditLog extends Model
{
    use HasUuids;

    protected $table = 'audit_logs';

    // Disable standard timestamps if only using createdAt
    public $timestamps = false;

    protected $fillable = [
        'id',
        'userId',
        'action',
        'details',
        'ipAddress',
        'createdAt',
    ];

    protected $casts = [
        'createdAt' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'userId');
    }
}
