<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Reconstructable history of every mutation to a denormalized paid/due
 * column (Supplier.currentDue, Vendor.paidAmount/dueAmount) — written by
 * TransactionController::syncSupplierBalance/syncVendorBalance. AuditLog
 * only stores a free-text description; this stores the actual before/after
 * numbers so drift can be traced back to the CashOut that caused it.
 */
class BalanceLedger extends Model
{
    use HasUuids;

    protected $table = 'balance_ledger';

    protected $fillable = ['entityType', 'entityId', 'field', 'before', 'after', 'cashOutId'];

    public $timestamps = false;
}
