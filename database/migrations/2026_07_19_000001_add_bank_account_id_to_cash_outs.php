<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Office/global expense categories (and EMPLOYEE_SALARY) now debit a specific
 * BankAccount directly instead of being auto-guessed from paymentMethod, and
 * are validated against that account's currentBalance instead of the
 * company-wide Main Balance pool. Nullable — project-wise categories
 * (MATERIALS, SUPPLIER_PAYMENT, VENDOR_PAYMENT, ...) are unaffected and keep
 * the existing paymentMethod-guess flow.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_outs', function (Blueprint $table) {
            $table->foreignUuid('bankAccountId')->nullable()->after('paymentMethod')
                ->constrained('bank_accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cash_outs', function (Blueprint $table) {
            $table->dropForeign(['bankAccountId']);
            $table->dropColumn('bankAccountId');
        });
    }
};
