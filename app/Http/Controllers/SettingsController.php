<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class SettingsController extends Controller
{
    public function page()
    {
        return Inertia::render('Dashboard/Settings/Index');
    }
}
