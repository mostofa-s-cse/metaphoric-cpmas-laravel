<?php

namespace App\Console\Commands;

use App\Models\CashIn;
use App\Models\CashOut;
use App\Models\Salary;
use App\Models\Supplier;
use App\Models\Vendor;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * One-time backfill for the plaintext decimal shadow columns added
 * alongside every hot EncryptedFloat column (see EncryptedFloat's
 * $shadowColumn param). Existing rows predate the shadow column and only
 * have the encrypted value, so this decrypts each one via the model's
 * normal 'get' cast and writes the plaintext number directly through the
 * query builder — bypassing Eloquent save() so it doesn't re-encrypt,
 * fire model events, or write audit-log entries for a pure backfill.
 */
class BackfillNumericShadowColumns extends Command
{
    protected $signature = 'balances:backfill-numeric';

    protected $description = 'Populate numeric shadow columns from existing encrypted amount columns';

    public function handle(): int
    {
        $this->backfill(CashIn::withTrashed(), 'cash_ins', 'amount', 'amountNumeric');
        $this->backfill(CashOut::withTrashed(), 'cash_outs', 'amount', 'amountNumeric');
        $this->backfill(Supplier::query(), 'suppliers', 'currentDue', 'currentDueNumeric');
        $this->backfill(Vendor::query(), 'vendors', 'paidAmount', 'paidAmountNumeric');
        $this->backfill(Vendor::query(), 'vendors', 'dueAmount', 'dueAmountNumeric');
        $this->backfill(Salary::query(), 'salaries', 'paidAmount', 'paidAmountNumeric');
        $this->backfill(Salary::query(), 'salaries', 'dueAmount', 'dueAmountNumeric');

        return self::SUCCESS;
    }

    private function backfill($query, string $table, string $column, string $shadowColumn): void
    {
        $updated = 0;

        $query->select(['id', $column])->chunkById(500, function ($rows) use ($table, $column, $shadowColumn, &$updated) {
            foreach ($rows as $row) {
                DB::table($table)->where('id', $row->id)->update([
                    $shadowColumn => round((float) $row->{$column}, 2),
                ]);
                $updated++;
            }
        });

        $this->info("{$table}.{$shadowColumn}: {$updated} row(s) backfilled.");
    }
}
