<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Projects
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('clientName');
            $table->string('clientContactNumber');
            $table->string('projectLocation');
            $table->dateTime('startDate');
            $table->dateTime('expectedCompletionDate');
            $table->string('estimatedBudget'); // Encrypted float string
            $table->string('status')->default('PLANNING'); // PLANNING, RUNNING, COMPLETED, ARCHIVED
            $table->string('projectType')->default('CONSTRUCTION'); // CONSULTANCY, SUPERVISION, CONSTRUCTION, SUPPLYING
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index('name');
            $table->index('status');
        });

        // 2. Suppliers
        Schema::create('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('companyName')->nullable();
            $table->string('phoneNumber');
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('openingBalance')->default('0.0'); // Encrypted float
            $table->string('currentDue')->default('0.0'); // Encrypted float
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('name');
        });

        // 3. Vendors
        Schema::create('vendors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('companyName')->nullable();
            $table->string('contactNumber');
            $table->string('address')->nullable();
            $table->string('workType'); // e.g. Civil, Electrical, Plumbing
            $table->string('contractAmount')->default('0.0'); // Encrypted float
            $table->string('paidAmount')->default('0.0'); // Encrypted float
            $table->string('dueAmount')->default('0.0'); // Encrypted float
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('name');
        });

        // 4. Employees
        Schema::create('employees', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('employeeId')->unique();
            $table->string('fullName');
            $table->string('designation');
            $table->string('department');
            $table->string('phoneNumber');
            $table->string('email')->nullable();
            $table->dateTime('joiningDate');
            $table->string('monthlySalary'); // Encrypted float
            $table->string('employmentStatus')->default('ACTIVE'); // ACTIVE, INACTIVE, SUSPENDED
            $table->timestamps();

            $table->index('fullName');
        });

        // 5. Labours
        Schema::create('labours', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('phoneNumber');
            $table->string('trade'); // e.g. Mason, Electrician
            $table->string('dailyWage'); // Encrypted float
            $table->string('employmentStatus')->default('ACTIVE'); // ACTIVE, INACTIVE
            $table->foreignUuid('projectId')->constrained('projects')->onDelete('cascade');
            $table->timestamps();

            $table->index('name');
            $table->index('trade');
        });

        // 6. Attendances
        Schema::create('attendances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->dateTime('date');
            $table->string('status')->default('PRESENT'); // PRESENT, ABSENT, LEAVE
            $table->foreignUuid('labourId')->constrained('labours')->onDelete('cascade');
            $table->foreignUuid('projectId')->nullable()->constrained('projects')->onDelete('set null');
            $table->timestamps();

            $table->unique(['labourId', 'date']);
        });

        // 7. Materials
        Schema::create('materials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('category'); // e.g. Cement, Steel
            $table->double('quantity');
            $table->string('unit'); // e.g. Bags, Tons
            $table->string('unitPrice'); // Encrypted float
            $table->string('totalPrice'); // Encrypted float
            $table->foreignUuid('supplierId')->constrained('suppliers')->onDelete('restrict');
            $table->foreignUuid('projectId')->constrained('projects')->onDelete('cascade');
            $table->dateTime('purchaseDate');
            $table->string('invoiceNumber')->nullable();
            $table->timestamps();

            $table->index('name');
            $table->index('category');
        });

        // 8. Cash Ins
        Schema::create('cash_ins', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->dateTime('date');
            $table->foreignUuid('projectId')->nullable()->constrained('projects')->onDelete('set null');
            $table->string('clientName');
            $table->string('amount'); // Encrypted float
            $table->string('paymentMethod'); // e.g. CASH, BANK
            $table->string('bankOrCash'); // Account name
            $table->string('referenceNumber')->nullable();
            $table->string('source'); // e.g. CLIENT_PAYMENT
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('clientName');
            $table->index('date');
        });

        // 9. Salaries
        Schema::create('salaries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('employeeId')->constrained('employees')->onDelete('cascade');
            $table->string('month'); // YYYY-MM
            $table->string('basicSalary'); // Encrypted float
            $table->string('bonus')->default('0.0'); // Encrypted float
            $table->string('deduction')->default('0.0'); // Encrypted float
            $table->string('netSalary'); // Encrypted float
            $table->string('paidAmount')->default('0.0'); // Encrypted float
            $table->string('dueAmount')->default('0.0'); // Encrypted float
            $table->string('paymentStatus')->default('DUE'); // PAID, PARTIAL, DUE
            $table->timestamps();

            $table->unique(['employeeId', 'month']);
        });

        // 10. Cash Outs (Expense)
        Schema::create('cash_outs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->dateTime('date');
            $table->foreignUuid('projectId')->nullable()->constrained('projects')->onDelete('set null');
            $table->string('expenseCategory'); // e.g. MATERIALS, LABOR
            $table->string('paidTo');
            $table->string('amount'); // Encrypted float
            $table->string('paymentMethod');
            $table->string('referenceNumber')->nullable();
            $table->text('notes')->nullable();

            $table->foreignUuid('supplierId')->nullable()->constrained('suppliers')->onDelete('set null');
            $table->foreignUuid('vendorId')->nullable()->constrained('vendors')->onDelete('set null');
            $table->foreignUuid('employeeId')->nullable()->constrained('employees')->onDelete('set null');
            $table->foreignUuid('labourId')->nullable()->constrained('labours')->onDelete('set null');
            $table->foreignUuid('materialId')->nullable()->constrained('materials')->onDelete('set null');
            $table->foreignUuid('salaryId')->nullable()->constrained('salaries')->onDelete('set null');
            $table->timestamps();

            $table->index('paidTo');
            $table->index('date');
        });

        // 11. Documents
        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('url');
            $table->dateTime('uploadDate')->useCurrent();
            $table->text('description')->nullable();
            $table->string('fileType');
            $table->string('category'); // CONTRACT, INVOICE, etc.

            $table->foreignUuid('projectId')->nullable()->constrained('projects')->onDelete('set null');
            $table->foreignUuid('supplierId')->nullable()->constrained('suppliers')->onDelete('set null');
            $table->foreignUuid('vendorId')->nullable()->constrained('vendors')->onDelete('set null');
            $table->foreignUuid('employeeId')->nullable()->constrained('employees')->onDelete('set null');
            $table->foreignUuid('labourId')->nullable()->constrained('labours')->onDelete('set null');
            $table->timestamps();

            $table->index('name');
        });

        // 12. Audit Logs
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('userId')->nullable()->constrained('users')->onDelete('set null');
            $table->string('action'); // CREATE_PROJECT, etc.
            $table->text('details');
            $table->string('ipAddress')->nullable();
            $table->dateTime('createdAt')->useCurrent();

            $table->index('createdAt');
            $table->index('userId');
        });

        // 13. Contact Inquiries
        Schema::create('contact_inquiries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email');
            $table->string('scope');
            $table->text('details')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });

        // 14. Project Vendors
        Schema::create('project_vendors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('projectId')->constrained('projects')->onDelete('cascade');
            $table->foreignUuid('vendorId')->constrained('vendors')->onDelete('cascade');
            $table->string('contractAmount')->default('0.0'); // Encrypted float
            $table->string('paidAmount')->default('0.0'); // Encrypted float
            $table->string('dueAmount')->default('0.0'); // Encrypted float
            $table->timestamps();

            $table->unique(['projectId', 'vendorId']);
        });

        // 15. Project Suppliers
        Schema::create('project_suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('projectId')->constrained('projects')->onDelete('cascade');
            $table->foreignUuid('supplierId')->constrained('suppliers')->onDelete('cascade');
            $table->string('contractAmount')->default('0.0'); // Encrypted float
            $table->string('paidAmount')->default('0.0'); // Encrypted float
            $table->string('dueAmount')->default('0.0'); // Encrypted float
            $table->timestamps();

            $table->unique(['projectId', 'supplierId']);
        });

        // ==========================================
        // WEBSITE MANAGEMENT CMS TABLES
        // ==========================================

        // 16. Website Settings
        Schema::create('website_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key')->unique();
            $table->json('value');
            $table->timestamps();
        });

        // 17. Website Sections
        Schema::create('website_sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('sectionKey')->unique();
            $table->string('title')->nullable();
            $table->string('subtitle')->nullable();
            $table->string('highlight')->nullable();
            $table->text('description')->nullable();
            $table->string('imageUrl')->nullable();
            $table->string('videoUrl')->nullable();
            $table->json('extraData')->nullable();
            $table->boolean('isActive')->default(true);
            $table->timestamps();
        });

        // 18. Website Services
        Schema::create('website_services', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->text('description');
            $table->string('imageUrl');
            $table->integer('order')->default(0);
            $table->boolean('isActive')->default(true);
            $table->timestamps();
        });

        // 19. Website Portfolios
        Schema::create('website_portfolios', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->string('category');
            $table->string('coverImage');
            $table->string('beforeImage')->nullable();
            $table->string('afterImage')->nullable();
            $table->text('theChallenge')->nullable();
            $table->text('theSolution')->nullable();
            $table->text('theOutcome')->nullable();
            $table->json('projectMetrics')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('isActive')->default(true);
            $table->timestamps();
        });

        // 20. Website Teams
        Schema::create('website_teams', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('role');
            $table->text('bio')->nullable();
            $table->string('imageUrl');
            $table->integer('order')->default(0);
            $table->boolean('isActive')->default(true);
            $table->timestamps();
        });

        // 21. Website Trust Badges
        Schema::create('website_trust_badges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('type'); // AWARD, CERTIFICATION, etc.
            $table->string('imageUrl');
            $table->integer('order')->default(0);
            $table->boolean('isActive')->default(true);
            $table->timestamps();
        });

        // 22. Website Testimonials
        Schema::create('website_testimonials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('clientName');
            $table->string('clientRole');
            $table->text('reviewText');
            $table->uuid('portfolioId')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('isActive')->default(true);
            $table->timestamps();
        });

        // 23. Website FAQs
        Schema::create('website_faqs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('question');
            $table->text('answer');
            $table->integer('order')->default(0);
            $table->boolean('isActive')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('website_faqs');
        Schema::dropIfExists('website_testimonials');
        Schema::dropIfExists('website_trust_badges');
        Schema::dropIfExists('website_teams');
        Schema::dropIfExists('website_portfolios');
        Schema::dropIfExists('website_services');
        Schema::dropIfExists('website_sections');
        Schema::dropIfExists('website_settings');
        Schema::dropIfExists('project_suppliers');
        Schema::dropIfExists('project_vendors');
        Schema::dropIfExists('contact_inquiries');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('cash_outs');
        Schema::dropIfExists('salaries');
        Schema::dropIfExists('cash_ins');
        Schema::dropIfExists('materials');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('labours');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('vendors');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('projects');
    }
};
