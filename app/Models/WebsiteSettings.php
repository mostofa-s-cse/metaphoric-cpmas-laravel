<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WebsiteSettings extends Model
{
    use HasUuids;

    protected $table = 'website_settings';

    protected $fillable = [
        'id',
        'key',
        'value',
    ];

    protected $casts = [
        'value' => 'array', // automatically handles Json to PHP array conversion
    ];
}
