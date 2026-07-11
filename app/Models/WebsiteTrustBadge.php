<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WebsiteTrustBadge extends Model
{
    use HasUuids;

    protected $table = 'website_trust_badges';

    protected $fillable = [
        'id',
        'name',
        'type',
        'imageUrl',
        'order',
        'isActive',
    ];

    protected $casts = [
        'isActive' => 'boolean',
        'order' => 'integer',
    ];
}
