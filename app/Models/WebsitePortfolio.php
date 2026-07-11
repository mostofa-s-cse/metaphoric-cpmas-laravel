<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WebsitePortfolio extends Model
{
    use HasUuids;

    protected $table = 'website_portfolios';

    protected $fillable = [
        'id',
        'title',
        'category',
        'coverImage',
        'beforeImage',
        'afterImage',
        'images',
        'theChallenge',
        'theSolution',
        'theOutcome',
        'projectMetrics',
        'order',
        'isActive',
    ];

    protected $casts = [
        'projectMetrics' => 'array',
        'images' => 'array',
        'isActive' => 'boolean',
        'order' => 'integer',
    ];
}
