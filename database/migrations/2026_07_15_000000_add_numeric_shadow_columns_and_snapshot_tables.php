<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Amount columns are AES-encrypted strings (EncryptedFloat cast), so
        // SQL SUM()/GROUP BY can't aggregate them — every total today is a
        // full-table PHP scan. These plaintext decimal shadow columns are
        // kept in sync by EncryptedFloat::set() and let reporting/balance
        // queries aggregate in SQL instead.
        Schema::table('cash_ins', function (Blueprint $table) {
            $table->decimal('amountNumeric', 15, 2)->default(0)->after('amount');
            $table->softDeletes();
            $table->index(['projectId', 'date']);
        });

        Schema::table('cash_outs', function (Blueprint $table) {
            $table->decimal('amountNumeric', 15, 2)->default(0)->after('amount');
            $table->softDeletes();
            $table->index(['projectId', 'expenseCategory', 'date']);
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->decimal('currentDueNumeric', 15, 2)->default(0)->after('currentDue');
        });

        Schema::table('vendors', function (Blueprint $table) {
            $table->decimal('paidAmountNumeric', 15, 2)->default(0)->after('paidAmount');
            $table->decimal('dueAmountNumeric', 15, 2)->default(0)->after('dueAmount');
        });

        Schema::table('salaries', function (Blueprint $table) {
            $table->decimal('paidAmountNumeric', 15, 2)->default(0)->after('paidAmount');
            $table->decimal('dueAmountNumeric', 15, 2)->default(0)->after('dueAmount');
        });

        // Incrementally-maintained running totals — read in O(1) instead of
        // recomputing from the full cash_ins/cash_outs history on every
        // balance check. See App\Traits\HasMainBalance.
        Schema::create('project_balances', function (Blueprint $table) {
            $table->uuid('projectId')->primary();
            $table->foreign('projectId')->references('id')->on('projects')->cascadeOnDelete();
            $table->decimal('totalPaidIn', 15, 2)->default(0);
            $table->decimal('totalProjectWiseSpent', 15, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('company_balance', function (Blueprint $table) {
            $table->id();
            $table->decimal('totalPaidInAllProjects', 15, 2)->default(0);
            $table->decimal('totalGlobalSpent', 15, 2)->default(0);
            $table->timestamps();
        });

        // Reconstructable history of every mutation to a denormalized
        // paid/due column (Supplier.currentDue, Vendor.paidAmount/dueAmount,
        // Salary.paidAmount/dueAmount) — closes the gap where AuditLog only
        // stores a free-text description, not the numeric before/after.
        Schema::create('balance_ledger', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('entityType');
            $table->uuid('entityId');
            $table->string('field');
            $table->decimal('before', 15, 2);
            $table->decimal('after', 15, 2);
            $table->uuid('cashOutId')->nullable();
            $table->foreign('cashOutId')->references('id')->on('cash_outs')->nullOnDelete();
            $table->timestamp('createdAt')->useCurrent();

            $table->index(['entityType', 'entityId']);
        });

        // Data-driven replacement for the hardcoded
        // HasMainBalance::PROJECT_WISE_CATEGORIES array — lets a new expense
        // category be added without a code deploy.
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->string('code')->primary();
            $table->string('label');
            $table->enum('poolType', ['PROJECT_WISE', 'GLOBAL']);
            $table->timestamps();
        });

        // Seed from TransactionController::CASH_OUT_CATEGORIES — mirrors
        // HasMainBalance::PROJECT_WISE_CATEGORIES exactly, everything else
        // is GLOBAL (drawn from the combined all-projects pool).
        $projectWise = ['MATERIALS', 'VENDOR_PAYMENT', 'SUPPLIER_PAYMENT'];
        $all = [
            'SIGNING_AGREEMENT', 'MATERIAL_PREPS', 'LABER_PREPS', 'RUNNING_BILL', 'FINAL_BILL',
            'MATERIALS', 'LABOR', 'VENDOR_PAYMENT', 'SUPPLIER_PAYMENT', 'OFFICE_RENT',
            'UTILITIES', 'TRANSPORTATION', 'FUEL', 'EQUIPMENT_RENTAL', 'EMPLOYEE_SALARY', 'MISCELLANEOUS',
        ];

        $now = now();
        DB::table('expense_categories')->insert(array_map(fn (string $code) => [
            'code' => $code,
            'label' => ucwords(strtolower(str_replace('_', ' ', $code))),
            'poolType' => in_array($code, $projectWise, true) ? 'PROJECT_WISE' : 'GLOBAL',
            'created_at' => $now,
            'updated_at' => $now,
        ], $all));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expense_categories');
        Schema::dropIfExists('balance_ledger');
        Schema::dropIfExists('company_balance');
        Schema::dropIfExists('project_balances');

        Schema::table('salaries', function (Blueprint $table) {
            $table->dropColumn(['paidAmountNumeric', 'dueAmountNumeric']);
        });

        Schema::table('vendors', function (Blueprint $table) {
            $table->dropColumn(['paidAmountNumeric', 'dueAmountNumeric']);
        });

        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn('currentDueNumeric');
        });

        Schema::table('cash_outs', function (Blueprint $table) {
            $table->dropIndex(['projectId', 'expenseCategory', 'date']);
            $table->dropSoftDeletes();
            $table->dropColumn('amountNumeric');
        });

        Schema::table('cash_ins', function (Blueprint $table) {
            $table->dropIndex(['projectId', 'date']);
            $table->dropSoftDeletes();
            $table->dropColumn('amountNumeric');
        });
    }
};
