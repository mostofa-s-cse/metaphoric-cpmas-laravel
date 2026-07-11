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
        // expenseCategory is filtered via whereIn/whereNotIn on every Main
        // Balance calculation (HasMainBalance::availableBalance) — every
        // payment form open, every cash-out create/update.
        Schema::table('cash_outs', function (Blueprint $table) {
            $table->index('expenseCategory');
            $table->index(['projectId', 'expenseCategory']);
        });

        // attendanceByDate() filters purely by date range with no labourId
        // predicate, so it can't use the existing (labourId, date) composite
        // index (leftmost-prefix rule) — needs its own index.
        Schema::table('attendances', function (Blueprint $table) {
            $table->index('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_outs', function (Blueprint $table) {
            $table->dropIndex(['expenseCategory']);
            $table->dropIndex(['projectId', 'expenseCategory']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex(['date']);
        });
    }
};
