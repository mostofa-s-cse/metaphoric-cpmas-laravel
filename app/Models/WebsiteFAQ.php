<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WebsiteFAQ extends Model
{
    use HasUuids;

    protected $table = 'website_faqs';

    protected $fillable = [
        'id',
        'question',
        'answer',
        'order',
        'isActive',
    ];

    protected $casts = [
        'isActive' => 'boolean',
        'order' => 'integer',
    ];
}
