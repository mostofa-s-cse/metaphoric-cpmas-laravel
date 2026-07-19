<?php

use App\Models\ExpenseCategory;
use Illuminate\Database\Migrations\Migration;

/**
 * LABOR (site labor daily wages) was wrongly bucketed as a GLOBAL/office
 * expense by the 2026_07_19_000000 migration alongside genuine overhead
 * (rent, utilities, salaries). It's actually project-wise — wages are paid
 * against a specific project's own balance, not the company-wide pool /
 * a Bank Account. Flip it back so it behaves like MATERIALS/VENDOR_PAYMENT/
 * SUPPLIER_PAYMENT: validated against ProjectBalance, paid via the ordinary
 * Payment Method (no bankAccountId requirement).
 */
return new class extends Migration
{
    public function up(): void
    {
        $labor = ExpenseCategory::find('LABOR');
        if ($labor) {
            $labor->update(['poolType' => ExpenseCategory::POOL_PROJECT_WISE, 'isOfficeExpense' => false]);
        }
    }

    public function down(): void
    {
        $labor = ExpenseCategory::find('LABOR');
        if ($labor) {
            $labor->update(['poolType' => ExpenseCategory::POOL_GLOBAL, 'isOfficeExpense' => true]);
        }
    }
};
