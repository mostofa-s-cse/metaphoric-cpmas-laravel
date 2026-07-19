<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Implements the four financial recommendations:
 *
 * 1. bank_accounts — manually-maintained Bank/Cash account balances.
 *    Each account has a running balance updated by cash-in/cash-out events
 *    (when the transaction's bankOrCash / paymentMethod matches the account).
 *    The balance is also adjustable manually by an admin.
 *
 * 2. project_ledger_entries — per-project double-entry ledger that records
 *    every cash-in/cash-out tagged to that project, so each project has its
 *    own statement of account (instead of only a running total).
 *
 * 3. expense_categories updated — OFFICE_RENT, UTILITIES, TRANSPORTATION,
 *    FUEL, EQUIPMENT_RENTAL, EMPLOYEE_SALARY, MISCELLANEOUS are forced to
 *    poolType = GLOBAL, guaranteeing they NEVER draw from a project's own
 *    balance even if a projectId is supplied on the CashOut row.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Bank / Cash Accounts ───────────────────────────────────────────
        // Manually-maintained accounts (bank accounts, petty-cash boxes, etc.)
        // Balance is adjusted by CashIn/CashOut model events and can be
        // corrected manually via the admin UI.
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');                                   // e.g. "Dutch-Bangla Bank", "Office Cash"
            $table->string('accountType')->default('BANK');           // BANK | CASH | MOBILE_BANKING
            $table->string('accountNumber')->nullable();              // formal account / wallet number
            $table->string('bankName')->nullable();                   // name of the bank (for BANK type)
            $table->decimal('openingBalance', 15, 2)->default(0);    // manually set starting balance
            $table->decimal('currentBalance', 15, 2)->default(0);    // auto-maintained running total
            $table->decimal('totalIn', 15, 2)->default(0);           // cumulative cash-in to this account
            $table->decimal('totalOut', 15, 2)->default(0);          // cumulative cash-out from this account
            $table->string('notes')->nullable();
            $table->boolean('isActive')->default(true);
            $table->timestamps();

            $table->index('accountType');
            $table->index('isActive');
        });

        // ── 2. Project Ledger ─────────────────────────────────────────────────
        // Every cash-in/cash-out that carries a projectId writes a row here,
        // giving each project a full statement of account (like a bank statement
        // filtered to that project).
        Schema::create('project_ledger_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('projectId')->constrained('projects')->onDelete('cascade');
            $table->string('entryType');                      // CASH_IN | CASH_OUT
            $table->uuid('referenceId');                      // FK to cash_ins.id or cash_outs.id
            $table->string('referenceType');                  // App\Models\CashIn | App\Models\CashOut
            $table->dateTime('date');
            $table->decimal('amount', 15, 2);                 // positive for both; entryType tells direction
            $table->string('description')->nullable();        // paidTo / clientName / category
            $table->string('expenseCategory')->nullable();    // mirrors CashOut.expenseCategory
            $table->string('paymentMethod')->nullable();
            $table->string('bankOrCashAccount')->nullable();  // account name used
            $table->timestamps();

            $table->index(['projectId', 'date']);
            $table->index(['referenceType', 'referenceId']);
        });

        // ── 3. Force office expense categories to GLOBAL ─────────────────────
        // These categories must NEVER deduct from a project's own balance —
        // they always draw from the company-wide pool, regardless of whether
        // a projectId is tagged on the CashOut.
        $officeCategories = [
            'OFFICE_RENT', 'UTILITIES', 'TRANSPORTATION', 'FUEL',
            'EQUIPMENT_RENTAL', 'EMPLOYEE_SALARY', 'MISCELLANEOUS', 'LABOR',
        ];

        // Update poolType to GLOBAL for all office/overhead categories.
        // MATERIALS, VENDOR_PAYMENT, SUPPLIER_PAYMENT remain PROJECT_WISE.
        if (Schema::hasTable('expense_categories')) {
            DB::table('expense_categories')
                ->whereIn('code', $officeCategories)
                ->update(['poolType' => 'GLOBAL']);
        }

        // Add isOfficeExpense flag so UI can visually distinguish and the
        // backend can enforce the "no project deduction" rule.
        Schema::table('expense_categories', function (Blueprint $table) {
            $table->boolean('isOfficeExpense')->default(false)->after('poolType');
        });

        // Mark office/overhead categories as isOfficeExpense = true.
        if (Schema::hasTable('expense_categories')) {
            DB::table('expense_categories')
                ->whereIn('code', $officeCategories)
                ->update(['isOfficeExpense' => true]);
        }
    }

    public function down(): void
    {
        // Revert isOfficeExpense column
        if (Schema::hasColumn('expense_categories', 'isOfficeExpense')) {
            Schema::table('expense_categories', function (Blueprint $table) {
                $table->dropColumn('isOfficeExpense');
            });
        }

        Schema::dropIfExists('project_ledger_entries');
        Schema::dropIfExists('bank_accounts');
    }
};
