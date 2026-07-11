<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WebsiteSection extends Model
{
    use HasUuids;

    protected $table = 'website_sections';

    protected $fillable = [
        'id',
        'sectionKey',
        'title',
        'subtitle',
        'highlight',
        'description',
        'imageUrl',
        'videoUrl',
        'extraData',
        'isActive',
    ];

    protected $casts = [
        'extraData' => 'array',
        'isActive' => 'boolean',
    ];
}
