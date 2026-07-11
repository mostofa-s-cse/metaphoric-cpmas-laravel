<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WebsiteTestimonial extends Model
{
    use HasUuids;

    protected $table = 'website_testimonials';

    protected $fillable = [
        'id',
        'clientName',
        'clientRole',
        'reviewText',
        'portfolioId',
        'order',
        'isActive',
    ];

    protected $casts = [
        'isActive' => 'boolean',
        'order' => 'integer',
    ];
}
