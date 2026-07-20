<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * bank_account_ledger_entries — per-account statement of account, mirroring
 * project_ledger_entries but for bank/cash/mobile-banking accounts.
 *
 * Every CashOut debit, CashIn credit, their reversals (update/delete), and
 * manual balance adjustments write one row here — replacing the previous
 * approach of reconstructing an account's history on read by re-scanning
 * cash_ins/cash_outs and re-running the name/type resolution guess.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_account_ledger_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('bankAccountId')->constrained('bank_accounts')->onDelete('cascade');
            $table->string('entryType');                      // DEBIT | CREDIT | REVERSAL_DEBIT | REVERSAL_CREDIT | ADJUSTMENT
            $table->uuid('referenceId')->nullable();          // FK to cash_ins.id / cash_outs.id (null for manual adjustment)
            $table->string('referenceType')->nullable();      // App\Models\CashIn | App\Models\CashOut | null
            $table->dateTime('date');
            $table->decimal('amount', 15, 2);                 // always positive; entryType tells direction
            $table->decimal('balanceAfter', 15, 2);            // account.currentBalance snapshot right after this entry
            $table->string('description')->nullable();        // paidTo / clientName / adjustment reason
            $table->string('category')->nullable();           // expenseCategory / cash-in source
            $table->timestamps();

            $table->index(['bankAccountId', 'date']);
            $table->index(['referenceType', 'referenceId']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_account_ledger_entries');
    }
};
