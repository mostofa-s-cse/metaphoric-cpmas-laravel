<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WebsiteService extends Model
{
    use HasUuids;

    protected $table = 'website_services';

    protected $fillable = [
        'id',
        'title',
        'description',
        'imageUrl',
        'order',
        'isActive',
    ];

    protected $casts = [
        'isActive' => 'boolean',
        'order' => 'integer',
    ];
}
