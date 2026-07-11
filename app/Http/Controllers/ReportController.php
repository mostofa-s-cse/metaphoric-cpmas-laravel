<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class ReportController extends Controller
{
    public function page()
    {
        return Inertia::render('Dashboard/Reports/Index');
    }

    public function projectsPage()
    {
        return Inertia::render('Dashboard/Reports/Projects/Index');
    }

    public function vendorsPage()
    {
        return Inertia::render('Dashboard/Reports/Vendors/Index');
    }

    public function suppliersPage()
    {
        return Inertia::render('Dashboard/Reports/Suppliers/Index');
    }

    public function materialsPage()
    {
        return Inertia::render('Dashboard/Reports/Materials/Index');
    }

    public function employeesPage()
    {
        return Inertia::render('Dashboard/Reports/Employees/Index');
    }
}
