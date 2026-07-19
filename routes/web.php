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

    Route::get('/projects', [ProjectController::class, 'page'])->name('dashboard.projects');
    Route::get('/suppliers', [SupplierController::class, 'page'])->name('dashboard.suppliers');
    Route::get('/vendor', [VendorController::class, 'page'])->name('dashboard.vendors');
    Route::get('/employees', [EmployeeController::class, 'page'])->name('dashboard.employees');
    Route::get('/labour', [LabourController::class, 'page'])->name('dashboard.labour');
    Route::get('/materials', [MaterialController::class, 'page'])->name('dashboard.materials');
    Route::get('/transactions', [TransactionController::class, 'page'])->name('dashboard.transactions');
    Route::get('/bank-accounts', [BankAccountController::class, 'page'])->name('dashboard.bank-accounts');
    Route::get('/documents', [DocumentController::class, 'page'])->name('dashboard.documents');
    Route::get('/audit-logs', [AuditLogController::class, 'page'])->name('dashboard.audit-logs');
    Route::get('/settings', [SettingsController::class, 'page'])->name('dashboard.settings');

    // ADMIN+ only dashboard pages
    Route::middleware('role:ADMIN')->group(function () {
        Route::get('/contacts', [ContactController::class, 'page'])->name('dashboard.contacts');
        Route::get('/website', [WebsiteController::class, 'cmsPage'])->name('dashboard.website');
    });

    // SUPER_ADMIN only dashboard pages
    Route::middleware('role:SUPER_ADMIN')->group(function () {
        Route::get('/users', [UserController::class, 'page'])->name('dashboard.users');
        Route::get('/reports', [ReportController::class, 'page'])->name('dashboard.reports');
        Route::get('/reports/projects', [ReportController::class, 'projectsPage'])->name('dashboard.reports.projects');
        Route::get('/reports/vendors', [ReportController::class, 'vendorsPage'])->name('dashboard.reports.vendors');
        Route::get('/reports/suppliers', [ReportController::class, 'suppliersPage'])->name('dashboard.reports.suppliers');
        Route::get('/reports/materials', [ReportController::class, 'materialsPage'])->name('dashboard.reports.materials');
        Route::get('/reports/employees', [ReportController::class, 'employeesPage'])->name('dashboard.reports.employees');
    });
});

// ─── JSON API Routes (used by Inertia page forms and Axios calls) ─────────────

Route::middleware(['auth'])->prefix('api')->group(function () {

    // Current user
    Route::get('/auth/me', [UserController::class, 'me']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::patch('/users/{id}', [UserController::class, 'update']);

    // Website settings (read; SMTP filtered for non-admins in controller)
    Route::get('/website/settings', [WebsiteController::class, 'getSettings']);

    // Website CMS admin reads — unfiltered lists (auth required; any logged-in role, matches Next.js originals)
    Route::get('/website/sections', [WebsiteController::class, 'getSections']);
    Route::get('/website/services', [WebsiteController::class, 'getServices']);
    Route::get('/website/services/{id}', [WebsiteController::class, 'showService']);
    Route::get('/website/portfolio', [WebsiteController::class, 'getPortfolio']);
    Route::get('/website/portfolio/{id}', [WebsiteController::class, 'showPortfolio']);
    Route::get('/website/team', [WebsiteController::class, 'getTeam']);
    Route::get('/website/team/{id}', [WebsiteController::class, 'showTeamMember']);
    Route::get('/website/trust', [WebsiteController::class, 'getTrustBadges']);
    Route::get('/website/trust/{id}', [WebsiteController::class, 'showTrustBadge']);
    Route::get('/website/testimonials', [WebsiteController::class, 'getTestimonials']);
    Route::get('/website/testimonials/{id}', [WebsiteController::class, 'showTestimonial']);
    Route::get('/website/faqs', [WebsiteController::class, 'getFaqs']);
    Route::get('/website/faqs/{id}', [WebsiteController::class, 'showFaq']);

    // Projects (SUPER_ADMIN reads full data; others get basic list)
    Route::get('/projects/list', [ProjectController::class, 'list']);
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{id}', [ProjectController::class, 'show']);
    Route::patch('/projects/{id}', [ProjectController::class, 'update']);
    Route::delete('/projects/{id}', [ProjectController::class, 'destroy']);

    // Suppliers
    Route::get('/suppliers/list', [SupplierController::class, 'list']);
    Route::get('/suppliers', [SupplierController::class, 'index']);
    Route::post('/suppliers', [SupplierController::class, 'store']);
    Route::get('/suppliers/{id}', [SupplierController::class, 'show']);
    Route::patch('/suppliers/{id}', [SupplierController::class, 'update']);

    // Vendors
    Route::get('/vendors/list', [VendorController::class, 'list']);
    Route::get('/vendors', [VendorController::class, 'index']);
    Route::post('/vendors', [VendorController::class, 'store']);
    Route::get('/vendors/{id}', [VendorController::class, 'show']);
    Route::patch('/vendors/{id}', [VendorController::class, 'update']);

    // Employees
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::get('/employees/{id}', [EmployeeController::class, 'show']);
    Route::patch('/employees/{id}', [EmployeeController::class, 'update']);
    Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
    // Salary sub-resource
    Route::get('/employees/{employeeId}/salaries', [EmployeeController::class, 'salaries']);
    Route::post('/employees/{employeeId}/salaries', [EmployeeController::class, 'processSalary']);

    // Labours
    Route::get('/labours/wage-totals', [LabourController::class, 'wageTotals']);
    Route::get('/labours', [LabourController::class, 'index']);
    Route::post('/labours', [LabourController::class, 'store']);
    Route::get('/labours/{id}', [LabourController::class, 'show']);
    Route::patch('/labours/{id}', [LabourController::class, 'update']);
    Route::delete('/labours/{id}', [LabourController::class, 'destroy']);

    // Attendance
    Route::get('/attendance', [LabourController::class, 'attendanceByDate']);
    Route::post('/attendance', [LabourController::class, 'bulkAttendance']);

    // Materials
    Route::get('/materials', [MaterialController::class, 'index']);
    Route::post('/materials', [MaterialController::class, 'store']);
    Route::get('/materials/{id}', [MaterialController::class, 'show']);
    Route::patch('/materials/{id}', [MaterialController::class, 'update']);
    Route::delete('/materials/{id}', [MaterialController::class, 'destroy']);

    // Transactions (Cash In / Cash Out)
    Route::get('/transactions/summary', [TransactionController::class, 'summary']);
    Route::get('/transactions/available-balance', [TransactionController::class, 'availableBalanceInfo']);

    Route::get('/transactions/cash-in', [TransactionController::class, 'indexCashIn']);
    Route::post('/transactions/cash-in', [TransactionController::class, 'storeCashIn']);
    Route::patch('/transactions/cash-in/{id}', [TransactionController::class, 'updateCashIn']);
    Route::delete('/transactions/cash-in/{id}', [TransactionController::class, 'destroyCashIn']);

    Route::get('/transactions/cash-out', [TransactionController::class, 'indexCashOut']);
    Route::post('/transactions/cash-out', [TransactionController::class, 'storeCashOut']);
    Route::patch('/transactions/cash-out/{id}', [TransactionController::class, 'updateCashOut']);
    Route::delete('/transactions/cash-out/{id}', [TransactionController::class, 'destroyCashOut']);

    // Bank Accounts (manually-maintained balances)
    Route::get('/bank-accounts', [BankAccountController::class, 'index']);
    Route::post('/bank-accounts', [BankAccountController::class, 'store']);
    Route::patch('/bank-accounts/{id}', [BankAccountController::class, 'update']);
    Route::post('/bank-accounts/{id}/adjust', [BankAccountController::class, 'adjust']);
    Route::post('/bank-accounts/{id}/reconcile', [BankAccountController::class, 'reconcile']);
    Route::delete('/bank-accounts/{id}', [BankAccountController::class, 'destroy']);

    // Project Ledger (per-project statement of account)
    Route::get('/projects/{projectId}/ledger', [ProjectLedgerController::class, 'index']);
    Route::get('/projects/{projectId}/ledger/summary', [ProjectLedgerController::class, 'summary']);

    // Expense Categories (read for UI dropdowns)
    Route::get('/expense-categories', function () {
        return response()->json([
            'status' => 'success',
            'data'   => ['categories' => \App\Models\ExpenseCategory::orderBy('poolType')->orderBy('label')->get()],
        ]);
    });

    // Documents
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::delete('/documents/{id}', [DocumentController::class, 'destroy']);

    // File Upload
    Route::post('/upload', [DocumentController::class, 'upload']);

    // Contacts (ADMIN+)
    Route::middleware('role:ADMIN')->group(function () {
        Route::get('/contacts', [ContactController::class, 'index']);

        // Suppliers/Vendors delete (ADMIN+ — matches Next.js original: SUPER_ADMIN or ADMIN)
        Route::delete('/suppliers/{id}', [SupplierController::class, 'destroy']);
        Route::delete('/vendors/{id}', [VendorController::class, 'destroy']);

        // Website settings write (ADMIN+ — matches Next.js original: SUPER_ADMIN or ADMIN)
        Route::post('/website/settings', [WebsiteController::class, 'updateSettings']);

        // Website CMS writes (ADMIN+ — matches Next.js original: SUPER_ADMIN or ADMIN)
        Route::post('/website/sections', [WebsiteController::class, 'upsertSection']);
        Route::patch('/website/sections/{id}', [WebsiteController::class, 'updateSection']);

        Route::post('/website/services', [WebsiteController::class, 'storeService']);
        Route::patch('/website/services/{id}', [WebsiteController::class, 'updateService']);
        Route::delete('/website/services/{id}', [WebsiteController::class, 'destroyService']);

        Route::post('/website/portfolio', [WebsiteController::class, 'storePortfolio']);
        Route::patch('/website/portfolio/{id}', [WebsiteController::class, 'updatePortfolio']);
        Route::delete('/website/portfolio/{id}', [WebsiteController::class, 'destroyPortfolio']);

        Route::post('/website/team', [WebsiteController::class, 'storeTeam']);
        Route::patch('/website/team/{id}', [WebsiteController::class, 'updateTeam']);
        Route::delete('/website/team/{id}', [WebsiteController::class, 'destroyTeam']);

        Route::post('/website/trust', [WebsiteController::class, 'storeTrustBadge']);
        Route::patch('/website/trust/{id}', [WebsiteController::class, 'updateTrustBadge']);
        Route::delete('/website/trust/{id}', [WebsiteController::class, 'destroyTrustBadge']);

        Route::post('/website/testimonials', [WebsiteController::class, 'storeTestimonial']);
        Route::patch('/website/testimonials/{id}', [WebsiteController::class, 'updateTestimonial']);
        Route::delete('/website/testimonials/{id}', [WebsiteController::class, 'destroyTestimonial']);

        Route::post('/website/faqs', [WebsiteController::class, 'storeFaq']);
        Route::patch('/website/faqs/{id}', [WebsiteController::class, 'updateFaq']);
        Route::delete('/website/faqs/{id}', [WebsiteController::class, 'destroyFaq']);

        // Audit Logs read (ADMIN+ — matches Next.js original: SUPER_ADMIN or ADMIN)
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
    });

    // Audit Logs prune + Users (SUPER_ADMIN)
    Route::middleware('role:SUPER_ADMIN')->group(function () {
        Route::delete('/audit-logs', [AuditLogController::class, 'prune']);

        // Users (SUPER_ADMIN only)
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);
    });
});
