<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salaries', function (Blueprint $table) {
            $table->foreignUuid('projectId')->nullable()->after('employeeId')
                ->constrained('projects')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('salaries', function (Blueprint $table) {
            $table->dropForeign(['projectId']);
            $table->dropColumn('projectId');
        });
    }
};
