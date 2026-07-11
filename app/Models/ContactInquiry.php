<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ContactInquiry extends Model
{
    use HasUuids;

    protected $table = 'contact_inquiries';

    protected $fillable = [
        'id',
        'name',
        'email',
        'scope',
        'details',
    ];
}
