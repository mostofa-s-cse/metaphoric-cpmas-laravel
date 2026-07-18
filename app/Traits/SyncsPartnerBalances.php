<?php

namespace App\Traits;

use App\Models\BalanceLedger;
use App\Models\ProjectSupplier;
use App\Models\ProjectVendor;
use App\Models\Supplier;
use App\Models\Vendor;

/**
 * Applies (sign=+1) or reverses (sign=-1) a supplier/vendor payment's effect
 * on that partner's global due/paid and, when project-scoped, the matching
 * ProjectSupplier/ProjectVendor row. Shared by every controller that pays
 * off (or reverses payment on) a supplier/vendor via a CashOut — manual
 * Cash Out entries (TransactionController) and material-purchase
 * auto-cashouts (MaterialController) alike — so the due/paid math can't
 * drift between the two.
 */
trait SyncsPartnerBalances
{
    private function syncVendorBalance(?string $vendorId, ?string $projectId, float $amount, int $sign, ?string $cashOutId = null): void
    {
        if (!$vendorId) {
            return;
        }

        $vendor = Vendor::find($vendorId);
        if ($vendor) {
            $paidBefore = (float) $vendor->paidAmount;
            $dueBefore = (float) $vendor->dueAmount;
            $vendor->paidAmount = $paidBefore + ($sign * $amount);
            $vendor->dueAmount = $dueBefore - ($sign * $amount);
            $vendor->save();

            $this->logBalanceChange('Vendor', $vendor->id, 'paidAmount', $paidBefore, $vendor->paidAmount, $cashOutId);
            $this->logBalanceChange('Vendor', $vendor->id, 'dueAmount', $dueBefore, $vendor->dueAmount, $cashOutId);
        }

        if ($projectId) {
            $projectVendors = ProjectVendor::where('vendorId', $vendorId)
                ->where('projectId', $projectId)
                ->get();
            foreach ($projectVendors as $pv) {
                $pv->paidAmount = (float) $pv->paidAmount + ($sign * $amount);
                $pv->dueAmount = (float) $pv->dueAmount - ($sign * $amount);
                $pv->save();
            }
        }
    }

    private function syncSupplierBalance(?string $supplierId, ?string $projectId, float $amount, int $sign, ?string $cashOutId = null): void
    {
        if (!$supplierId) {
            return;
        }

        $supplier = Supplier::find($supplierId);
        if ($supplier) {
            $dueBefore = (float) $supplier->currentDue;
            $supplier->currentDue = $dueBefore - ($sign * $amount);
            $supplier->save();

            $this->logBalanceChange('Supplier', $supplier->id, 'currentDue', $dueBefore, $supplier->currentDue, $cashOutId);
        }

        if ($projectId) {
            $projectSuppliers = ProjectSupplier::where('supplierId', $supplierId)
                ->where('projectId', $projectId)
                ->get();
            foreach ($projectSuppliers as $ps) {
                $ps->paidAmount = (float) $ps->paidAmount + ($sign * $amount);
                $ps->dueAmount = (float) $ps->dueAmount - ($sign * $amount);
                $ps->save();
            }
        }
    }

    /**
     * Applies (sign=+1) or reverses (sign=-1) an unpaid ("on credit") supplier
     * purchase's effect on the supplier's global currentDue and the matching
     * ProjectSupplier.dueAmount — unlike syncSupplierBalance(), paidAmount is
     * never touched here, since no cash has actually moved yet. Used by
     * MaterialController for purchases logged with paidNow=false; settling
     * the debt later goes through the normal syncSupplierBalance() path via
     * a manual Supplier Payment cash-out.
     */
    private function adjustSupplierDue(?string $supplierId, ?string $projectId, float $amount, int $sign): void
    {
        if (!$supplierId) {
            return;
        }

        $supplier = Supplier::find($supplierId);
        if ($supplier) {
            $dueBefore = (float) $supplier->currentDue;
            $supplier->currentDue = $dueBefore + ($sign * $amount);
            $supplier->save();

            $this->logBalanceChange('Supplier', $supplier->id, 'currentDue', $dueBefore, $supplier->currentDue, null);
        }

        if ($projectId) {
            $projectSuppliers = ProjectSupplier::where('supplierId', $supplierId)
                ->where('projectId', $projectId)
                ->get();
            foreach ($projectSuppliers as $ps) {
                $ps->dueAmount = (float) $ps->dueAmount + ($sign * $amount);
                $ps->save();
            }
        }
    }

    private function logBalanceChange(string $entityType, string $entityId, string $field, float $before, float $after, ?string $cashOutId): void
    {
        if ($before === $after) {
            return;
        }

        BalanceLedger::create([
            'entityType' => $entityType,
            'entityId' => $entityId,
            'field' => $field,
            'before' => $before,
            'after' => $after,
            'cashOutId' => $cashOutId,
        ]);
    }
}
