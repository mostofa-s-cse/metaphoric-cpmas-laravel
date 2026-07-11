<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WebsiteTeam extends Model
{
    use HasUuids;

    protected $table = 'website_teams';

    protected $fillable = [
        'id',
        'name',
        'role',
        'bio',
        'imageUrl',
        'order',
        'isActive',
    ];

    protected $casts = [
        'isActive' => 'boolean',
        'order' => 'integer',
    ];
}
