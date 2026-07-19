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
        // BankAccountController::adjust() already collects an admin-supplied
        // reason for every manual balance correction but had nowhere to
        // persist it — this closes that gap so the audit trail is complete
        // enough to surface in the account's Transaction History.
        Schema::table('balance_ledger', function (Blueprint $table) {
            $table->string('reason')->nullable()->after('after');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('balance_ledger', function (Blueprint $table) {
            $table->dropColumn('reason');
        });
    }
};
