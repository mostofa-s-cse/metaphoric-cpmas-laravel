<?php

namespace App\Http\Controllers;

use App\Models\ContactInquiry;
use App\Traits\ApiResponse;
use Inertia\Inertia;

class ContactController extends Controller
{
    use ApiResponse;

    const PATH = '/contacts';

    public function index()
    {
        $inquiries = ContactInquiry::orderBy('created_at', 'desc')->get();

        return $this->apiSuccess(['inquiries' => $inquiries], 'Contact inquiries retrieved successfully', self::PATH);
    }

    public function page()
    {
        return Inertia::render('Dashboard/Contacts/Index');
    }
}
