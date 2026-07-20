<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasUuids, Auditable, HasRoles;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'users';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'id',
        'email',
        'passwordHash',
        'fullName',
        'profileImage',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'passwordHash',
        'remember_token',
    ];

    /**
     * Overwrite Laravel's default password attribute name for Auth.
     * This tells Auth::attempt() to use 'passwordHash' instead of 'password'.
     */
    public function getAuthPassword(): string
    {
        return $this->passwordHash;
    }

    /**
     * Tell Laravel which column holds the hashed password.
     */
    public function getAuthPasswordName(): string
    {
        return 'passwordHash';
    }

    /**
     * Audit log relationship.
     */
    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class, 'userId');
    }
}
