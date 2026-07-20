<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\BankAccountController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\LabourController;
use App\Http\Controllers\MaterialController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectLedgerController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\WebsiteController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ─── Public Pages ─────────────────────────────────────────────────────────────

Route::get('/', function () {
    return Inertia::render('LandingPage');
})->name('home');

Route::get('/services', function () {
    return Inertia::render('Services');
})->name('services');

Route::get('/services/{id}', function (string $id) {
    return Inertia::render('Services/Show', ['id' => $id]);
});

Route::get('/portfolio', function () {
    return Inertia::render('Portfolio');
})->name('portfolio');

Route::get('/portfolio/{id}', function (string $id) {
    return Inertia::render('Portfolio/Show', ['id' => $id]);
});

Route::get('/team', function () {
    return Inertia::render('Team');
})->name('team');

Route::get('/team/{id}', function (string $id) {
    return Inertia::render('Team/Show', ['id' => $id]);
});

Route::get('/contact', function () {
    return Inertia::render('Contact');
})->name('contact');

// ─── Public API ───────────────────────────────────────────────────────────────

Route::prefix('api')->group(function () {
    Route::get('/website/public', [WebsiteController::class, 'publicData']);
    Route::post('/contact', [WebsiteController::class, 'storeContact']);
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────

require __DIR__.'/auth.php';

// ─── Dashboard Pages (Inertia) ────────────────────────────────────────────────

Route::middleware(['auth'])->prefix('dashboard')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    Route::middleware('permission:module.view.projects')->get('/projects', [ProjectController::class, 'page'])->name('dashboard.projects');
    Route::middleware('permission:module.view.suppliers')->get('/suppliers', [SupplierController::class, 'page'])->name('dashboard.suppliers');
    Route::middleware('permission:module.view.vendor')->get('/vendor', [VendorController::class, 'page'])->name('dashboard.vendors');
    Route::middleware('permission:module.view.employees')->get('/employees', [EmployeeController::class, 'page'])->name('dashboard.employees');
    Route::middleware('permission:module.view.labour')->get('/labour', [LabourController::class, 'page'])->name('dashboard.labour');
    Route::middleware('permission:module.view.materials')->get('/materials', [MaterialController::class, 'page'])->name('dashboard.materials');
    Route::middleware('permission:module.view.transactions')->get('/transactions', [TransactionController::class, 'page'])->name('dashboard.transactions');
    Route::middleware('permission:module.view.bank-accounts')->get('/bank-accounts', [BankAccountController::class, 'page'])->name('dashboard.bank-accounts');
    Route::middleware('permission:module.view.documents')->get('/documents', [DocumentController::class, 'page'])->name('dashboard.documents');
    Route::middleware('permission:module.view.audit-logs')->get('/audit-logs', [AuditLogController::class, 'page'])->name('dashboard.audit-logs');
    Route::middleware('permission:module.view.settings')->get('/settings', [SettingsController::class, 'page'])->name('dashboard.settings');

    // ADMIN+ only dashboard pages
    Route::middleware('role:ADMIN')->group(function () {
        Route::middleware('permission:module.view.contacts')->get('/contacts', [ContactController::class, 'page'])->name('dashboard.contacts');
        Route::middleware('permission:module.view.website')->get('/website', [WebsiteController::class, 'cmsPage'])->name('dashboard.website');
    });

    // SUPER_ADMIN only dashboard pages
    Route::middleware('role:SUPER_ADMIN')->group(function () {
        Route::middleware('permission:module.view.users')->get('/users', [UserController::class, 'page'])->name('dashboard.users');

        Route::middleware('permission:module.view.reports')->group(function () {
            Route::middleware('permission:module.tab.reports.financial')->get('/reports', [ReportController::class, 'page'])->name('dashboard.reports');
            Route::middleware('permission:module.tab.reports.projects')->get('/reports/projects', [ReportController::class, 'projectsPage'])->name('dashboard.reports.projects');
            Route::middleware('permission:module.tab.reports.vendors')->get('/reports/vendors', [ReportController::class, 'vendorsPage'])->name('dashboard.reports.vendors');
            Route::middleware('permission:module.tab.reports.suppliers')->get('/reports/suppliers', [ReportController::class, 'suppliersPage'])->name('dashboard.reports.suppliers');
            Route::middleware('permission:module.tab.reports.materials')->get('/reports/materials', [ReportController::class, 'materialsPage'])->name('dashboard.reports.materials');
            Route::middleware('permission:module.tab.reports.employees')->get('/reports/employees', [ReportController::class, 'employeesPage'])->name('dashboard.reports.employees');
        });

        // Roles & Permissions admin — deliberately gated by the legacy
        // role:SUPER_ADMIN check only, NOT the dynamic module.view permission
        // system, to avoid a lockout bootstrap problem (nobody could grant
        // the permission to manage permissions).
        Route::get('/roles', [\App\Http\Controllers\RoleController::class, 'page'])->name('dashboard.roles');
    });
});

// ─── JSON API Routes (used by Inertia page forms and Axios calls) ─────────────

Route::middleware(['auth'])->prefix('api')->group(function () {

    // Current user — cross-cutting, no module gate
    Route::get('/auth/me', [UserController::class, 'me']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::patch('/users/{id}', [UserController::class, 'update']);

    // Cross-cutting utility endpoints — small read-only helpers consumed by
    // several modules' forms (balance checks, category dropdowns, uploads),
    // not a single module's own data. Left open to any authenticated user,
    // same as before this change, rather than chased through every caller
    // with OR-permissions.
    Route::get('/transactions/summary', [TransactionController::class, 'summary']);
    Route::get('/transactions/available-balance', [TransactionController::class, 'availableBalanceInfo']);
    Route::get('/expense-categories', function () {
        return response()->json([
            'status' => 'success',
            'data'   => ['categories' => \App\Models\ExpenseCategory::orderBy('poolType')->orderBy('label')->get()],
        ]);
    });
    Route::post('/upload', [DocumentController::class, 'upload']);

    // Website settings (read; SMTP filtered for non-admins in controller)
    Route::middleware('permission:module.view.website')->group(function () {
        // Also reused by the app's own Settings page for its SMTP config
        // sub-tab (Settings/Index.tsx:128, same endpoint, different `key`
        // payload) — either tab grant opens it.
        Route::middleware('permission:module.tab.website.settings|module.tab.settings.smtp')->get('/website/settings', [WebsiteController::class, 'getSettings']);

        // Hero Section + Page Content tabs both read this same endpoint
        // (Index.tsx:348 / PageContentTab.tsx:50 slice the response client-
        // side) — either tab grant opens it.
        Route::middleware('permission:module.tab.website.sections|module.tab.website.pageContent')
            ->get('/website/sections', [WebsiteController::class, 'getSections']);

        Route::middleware('permission:module.tab.website.services')->group(function () {
            Route::get('/website/services', [WebsiteController::class, 'getServices']);
            Route::get('/website/services/{id}', [WebsiteController::class, 'showService']);
        });
        Route::middleware('permission:module.tab.website.portfolio')->group(function () {
            Route::get('/website/portfolio', [WebsiteController::class, 'getPortfolio']);
            Route::get('/website/portfolio/{id}', [WebsiteController::class, 'showPortfolio']);
        });
        Route::middleware('permission:module.tab.website.team')->group(function () {
            Route::get('/website/team', [WebsiteController::class, 'getTeam']);
            Route::get('/website/team/{id}', [WebsiteController::class, 'showTeamMember']);
        });
        Route::middleware('permission:module.tab.website.trust')->group(function () {
            Route::get('/website/trust', [WebsiteController::class, 'getTrustBadges']);
            Route::get('/website/trust/{id}', [WebsiteController::class, 'showTrustBadge']);
        });
        Route::middleware('permission:module.tab.website.testimonials')->group(function () {
            Route::get('/website/testimonials', [WebsiteController::class, 'getTestimonials']);
            Route::get('/website/testimonials/{id}', [WebsiteController::class, 'showTestimonial']);
        });
        Route::middleware('permission:module.tab.website.faqs')->group(function () {
            Route::get('/website/faqs', [WebsiteController::class, 'getFaqs']);
            Route::get('/website/faqs/{id}', [WebsiteController::class, 'showFaq']);
        });
    });

    // Projects (SUPER_ADMIN reads full data; others get basic list)
    Route::middleware('permission:module.view.projects')->group(function () {
        Route::get('/projects/list', [ProjectController::class, 'list']);
        Route::get('/projects', [ProjectController::class, 'index']);
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::get('/projects/{id}', [ProjectController::class, 'show']);
        Route::patch('/projects/{id}', [ProjectController::class, 'update']);
        Route::delete('/projects/{id}', [ProjectController::class, 'destroy']);

        // Project Ledger (per-project statement of account)
        Route::get('/projects/{projectId}/ledger', [ProjectLedgerController::class, 'index']);
        Route::get('/projects/{projectId}/ledger/summary', [ProjectLedgerController::class, 'summary']);
    });

    // Suppliers
    Route::middleware('permission:module.view.suppliers')->group(function () {
        Route::get('/suppliers/list', [SupplierController::class, 'list']);
        Route::get('/suppliers', [SupplierController::class, 'index']);
        Route::post('/suppliers', [SupplierController::class, 'store']);
        Route::get('/suppliers/{id}', [SupplierController::class, 'show']);
        Route::patch('/suppliers/{id}', [SupplierController::class, 'update']);
    });

    // Vendors
    Route::middleware('permission:module.view.vendor')->group(function () {
        Route::get('/vendors/list', [VendorController::class, 'list']);
        Route::get('/vendors', [VendorController::class, 'index']);
        Route::post('/vendors', [VendorController::class, 'store']);
        Route::get('/vendors/{id}', [VendorController::class, 'show']);
        Route::patch('/vendors/{id}', [VendorController::class, 'update']);
    });

    // Employees
    Route::middleware('permission:module.view.employees')->group(function () {
        Route::middleware('permission:module.tab.employees.employees')->group(function () {
            Route::get('/employees', [EmployeeController::class, 'index']);
            Route::post('/employees', [EmployeeController::class, 'store']);
            Route::get('/employees/{id}', [EmployeeController::class, 'show']);
            Route::patch('/employees/{id}', [EmployeeController::class, 'update']);
            Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
        });
        // Salary sub-resource
        Route::middleware('permission:module.tab.employees.salary')->group(function () {
            Route::get('/employees/{employeeId}/salaries', [EmployeeController::class, 'salaries']);
            Route::post('/employees/{employeeId}/salaries', [EmployeeController::class, 'processSalary']);
        });
    });

    // Labours
    Route::middleware('permission:module.view.labour')->group(function () {
        Route::middleware('permission:module.tab.labour.wages')->get('/labours/wage-totals', [LabourController::class, 'wageTotals']);
        Route::middleware('permission:module.tab.labour.registry')->group(function () {
            Route::get('/labours', [LabourController::class, 'index']);
            Route::post('/labours', [LabourController::class, 'store']);
            Route::get('/labours/{id}', [LabourController::class, 'show']);
            Route::patch('/labours/{id}', [LabourController::class, 'update']);
            Route::delete('/labours/{id}', [LabourController::class, 'destroy']);
        });
        // Attendance
        Route::middleware('permission:module.tab.labour.attendance')->group(function () {
            Route::get('/attendance', [LabourController::class, 'attendanceByDate']);
            Route::post('/attendance', [LabourController::class, 'bulkAttendance']);
        });
    });

    // Materials
    Route::middleware('permission:module.view.materials')->group(function () {
        Route::get('/materials', [MaterialController::class, 'index']);
        Route::post('/materials', [MaterialController::class, 'store']);
        Route::get('/materials/{id}', [MaterialController::class, 'show']);
        Route::patch('/materials/{id}', [MaterialController::class, 'update']);
        Route::delete('/materials/{id}', [MaterialController::class, 'destroy']);
    });

    // Transactions — Collections/Cash In
    Route::middleware('permission:module.view.transactions')->group(function () {
        Route::middleware('permission:module.tab.transactions.collections')->group(function () {
            Route::get('/transactions/cash-in', [TransactionController::class, 'indexCashIn']);
            Route::post('/transactions/cash-in', [TransactionController::class, 'storeCashIn']);
            Route::patch('/transactions/cash-in/{id}', [TransactionController::class, 'updateCashIn']);
            Route::delete('/transactions/cash-in/{id}', [TransactionController::class, 'destroyCashIn']);
        });
    });

    // Transactions — Expenses/Cash Out. Also reused by Office Management's
    // "Expense" tab (Employees/Index.tsx:131-136,385 hits this same endpoint,
    // filtered client-side by category) — either grant opens it.
    Route::middleware('permission:module.tab.transactions.expenses|module.tab.employees.expense')->group(function () {
        Route::get('/transactions/cash-out', [TransactionController::class, 'indexCashOut']);
        Route::post('/transactions/cash-out', [TransactionController::class, 'storeCashOut']);
        Route::patch('/transactions/cash-out/{id}', [TransactionController::class, 'updateCashOut']);
        Route::delete('/transactions/cash-out/{id}', [TransactionController::class, 'destroyCashOut']);
    });

    // Bank Accounts (manually-maintained balances)
    Route::middleware('permission:module.view.bank-accounts')->group(function () {
        Route::get('/bank-accounts', [BankAccountController::class, 'index']);
        Route::post('/bank-accounts', [BankAccountController::class, 'store']);
        Route::patch('/bank-accounts/{id}', [BankAccountController::class, 'update']);
        Route::post('/bank-accounts/{id}/adjust', [BankAccountController::class, 'adjust']);
        Route::post('/bank-accounts/{id}/reconcile', [BankAccountController::class, 'reconcile']);
        Route::delete('/bank-accounts/{id}', [BankAccountController::class, 'destroy']);
        Route::get('/bank-accounts/{id}/history', [BankAccountController::class, 'history']);
    });

    // Documents
    Route::middleware('permission:module.view.documents')->group(function () {
        Route::get('/documents', [DocumentController::class, 'index']);
        Route::post('/documents', [DocumentController::class, 'store']);
        Route::delete('/documents/{id}', [DocumentController::class, 'destroy']);
    });

    // Contacts (ADMIN+)
    Route::middleware('role:ADMIN')->group(function () {
        Route::middleware('permission:module.view.contacts')->get('/contacts', [ContactController::class, 'index']);

        // Suppliers/Vendors delete (ADMIN+ — matches Next.js original: SUPER_ADMIN or ADMIN)
        // Also module-gated: an ADMIN not granted that module still can't delete its records.
        Route::middleware('permission:module.view.suppliers')->delete('/suppliers/{id}', [SupplierController::class, 'destroy']);
        Route::middleware('permission:module.view.vendor')->delete('/vendors/{id}', [VendorController::class, 'destroy']);

        // Website settings write (ADMIN+ — matches Next.js original: SUPER_ADMIN or ADMIN)
        // Also reused by the app's Settings page SMTP sub-tab (see GET note above).
        Route::middleware('permission:module.tab.website.settings|module.tab.settings.smtp')->post('/website/settings', [WebsiteController::class, 'updateSettings']);

        // Website CMS writes (ADMIN+ — matches Next.js original: SUPER_ADMIN or ADMIN)
        Route::middleware('permission:module.tab.website.sections|module.tab.website.pageContent')->group(function () {
            Route::post('/website/sections', [WebsiteController::class, 'upsertSection']);
            Route::patch('/website/sections/{id}', [WebsiteController::class, 'updateSection']);
        });

        Route::middleware('permission:module.tab.website.services')->group(function () {
            Route::post('/website/services', [WebsiteController::class, 'storeService']);
            Route::patch('/website/services/{id}', [WebsiteController::class, 'updateService']);
            Route::delete('/website/services/{id}', [WebsiteController::class, 'destroyService']);
        });

        Route::middleware('permission:module.tab.website.portfolio')->group(function () {
            Route::post('/website/portfolio', [WebsiteController::class, 'storePortfolio']);
            Route::patch('/website/portfolio/{id}', [WebsiteController::class, 'updatePortfolio']);
            Route::delete('/website/portfolio/{id}', [WebsiteController::class, 'destroyPortfolio']);
        });

        Route::middleware('permission:module.tab.website.team')->group(function () {
            Route::post('/website/team', [WebsiteController::class, 'storeTeam']);
            Route::patch('/website/team/{id}', [WebsiteController::class, 'updateTeam']);
            Route::delete('/website/team/{id}', [WebsiteController::class, 'destroyTeam']);
        });

        Route::middleware('permission:module.tab.website.trust')->group(function () {
            Route::post('/website/trust', [WebsiteController::class, 'storeTrustBadge']);
            Route::patch('/website/trust/{id}', [WebsiteController::class, 'updateTrustBadge']);
            Route::delete('/website/trust/{id}', [WebsiteController::class, 'destroyTrustBadge']);
        });

        Route::middleware('permission:module.tab.website.testimonials')->group(function () {
            Route::post('/website/testimonials', [WebsiteController::class, 'storeTestimonial']);
            Route::patch('/website/testimonials/{id}', [WebsiteController::class, 'updateTestimonial']);
            Route::delete('/website/testimonials/{id}', [WebsiteController::class, 'destroyTestimonial']);
        });

        Route::middleware('permission:module.tab.website.faqs')->group(function () {
            Route::post('/website/faqs', [WebsiteController::class, 'storeFaq']);
            Route::patch('/website/faqs/{id}', [WebsiteController::class, 'updateFaq']);
            Route::delete('/website/faqs/{id}', [WebsiteController::class, 'destroyFaq']);
        });

        // Audit Logs read (ADMIN+ — matches Next.js original: SUPER_ADMIN or ADMIN)
        Route::middleware('permission:module.view.audit-logs')->get('/audit-logs', [AuditLogController::class, 'index']);
    });

    // Audit Logs prune + Users (SUPER_ADMIN)
    Route::middleware('role:SUPER_ADMIN')->group(function () {
        Route::middleware('permission:module.view.audit-logs')->delete('/audit-logs', [AuditLogController::class, 'prune']);

        // Users (SUPER_ADMIN only)
        Route::middleware('permission:module.view.users')->group(function () {
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::delete('/users/{id}', [UserController::class, 'destroy']);
        });

        // Roles & Permissions admin API — gated by legacy role:SUPER_ADMIN
        // only (see dashboard.roles route note above).
        Route::get('/roles/module-registry', [\App\Http\Controllers\RoleController::class, 'moduleRegistry']);
        Route::get('/roles', [\App\Http\Controllers\RoleController::class, 'index']);
        Route::post('/roles', [\App\Http\Controllers\RoleController::class, 'store']);
        Route::patch('/roles/{id}', [\App\Http\Controllers\RoleController::class, 'update']);
        Route::delete('/roles/{id}', [\App\Http\Controllers\RoleController::class, 'destroy']);
    });
});
