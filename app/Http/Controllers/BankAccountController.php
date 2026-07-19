<?php

namespace App\Http\Controllers;

use App\Models\BankAccount;
use App\Services\BankAccountService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

/**
 * CRUD for manually-maintained Bank / Cash accounts.
 *
 * Endpoints:
 *  GET    /api/bank-accounts           — list all accounts with balances
 *  POST   /api/bank-accounts           — create a new account
 *  PUT    /api/bank-accounts/{id}      — update name / notes / opening balance
 *  POST   /api/bank-accounts/{id}/adjust — manual balance adjustment (admin)
 *  POST   /api/bank-accounts/{id}/reconcile — recompute from raw ledger (admin)
 *  DELETE /api/bank-accounts/{id}      — soft-delete (admin only)
 *
 * Page:
 *  GET    /dashboard/bank-accounts     — Inertia page
 */
class BankAccountController extends Controller
{
    use ApiResponse;

    const PATH = '/bank-accounts';

    // ── List ─────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $type   = $request->get('type');
        $search = $request->get('search', '');

        $query = BankAccount::query();
        if ($type) {
            $query->where('accountType', $type);
        }
        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }

        $accounts = $query->orderBy('accountType')->orderBy('name')->get();

        // Summary totals
        $summary = [
            'totalBalance' => (float) BankAccount::where('isActive', true)->sum('currentBalance'),
            'bankBalance'  => (float) BankAccount::where('isActive', true)->where('accountType', 'BANK')->sum('currentBalance'),
            'cashBalance'  => (float) BankAccount::where('isActive', true)->where('accountType', 'CASH')->sum('currentBalance'),
            'mobileBalance'=> (float) BankAccount::where('isActive', true)->where('accountType', 'MOBILE_BANKING')->sum('currentBalance'),
        ];

        return $this->apiSuccess([
            'accounts' => $accounts,
            'summary'  => $summary,
        ], 'Bank accounts retrieved', self::PATH);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'           => 'required|string|max:100',
            'accountType'    => 'required|string|in:BANK,CASH,MOBILE_BANKING',
            'accountNumber'  => 'nullable|string|max:50',
            'bankName'       => 'nullable|string|max:100',
            'openingBalance' => 'required|numeric|min:0',
            'notes'          => 'nullable|string|max:500',
            'isActive'       => 'sometimes|boolean',
        ]);

        // currentBalance starts equal to openingBalance when first created.
        $data['currentBalance'] = $data['openingBalance'];
        $data['totalIn']        = 0;
        $data['totalOut']       = 0;

        $account = BankAccount::create($data);
        Cache::forget('bank_accounts:summary');

        return $this->apiCreated(['account' => $account], 'Bank account created', self::PATH);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public function update(Request $request, string $id)
    {
        $account = BankAccount::findOrFail($id);

        $data = $request->validate([
            'name'          => 'sometimes|string|max:100',
            'accountNumber' => 'nullable|string|max:50',
            'bankName'      => 'nullable|string|max:100',
            'notes'         => 'nullable|string|max:500',
            'isActive'      => 'sometimes|boolean',
        ]);

        // openingBalance changes require a full recalculate — handled separately
        // via the /adjust endpoint to keep the audit trail clear.
        $account->update($data);
        Cache::forget('bank_accounts:summary');

        return $this->apiSuccess(['account' => $account->fresh()], 'Bank account updated', self::PATH);
    }

    // ── Manual Adjustment ─────────────────────────────────────────────────────

    /**
     * An admin can manually correct the currentBalance by entering the real
     * balance they see in the bank / on hand, and providing a reason.
     * The difference is recorded as a balance_ledger entry for traceability.
     */
    public function adjust(Request $request, string $id)
    {
        if (!in_array(Auth::user()->role, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->apiForbidden(self::PATH, 'Only administrators can adjust balances');
        }

        $account = BankAccount::findOrFail($id);

        $data = $request->validate([
            'newBalance' => 'required|numeric',
            'reason'     => 'required|string|max:500',
        ]);

        $before = (float) $account->currentBalance;
        $after  = (float) $data['newBalance'];
        $diff   = $after - $before;

        // Update running totals accordingly
        if ($diff > 0) {
            $account->increment('totalIn', $diff);
        } elseif ($diff < 0) {
            $account->increment('totalOut', abs($diff));
        }

        $account->currentBalance = $after;
        $account->save();

        // Write to balance_ledger for traceability
        \App\Models\BalanceLedger::create([
            'entityType' => 'BankAccount',
            'entityId'   => $account->id,
            'field'      => 'currentBalance',
            'before'     => $before,
            'after'      => $after,
            'cashOutId'  => null,
        ]);

        Cache::forget('bank_accounts:summary');

        return $this->apiSuccess([
            'account' => $account->fresh(),
            'adjustment' => ['before' => $before, 'after' => $after, 'diff' => $diff],
        ], 'Balance adjusted successfully', self::PATH);
    }

    // ── Reconcile ─────────────────────────────────────────────────────────────

    public function reconcile(string $id)
    {
        if (!in_array(Auth::user()->role, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->apiForbidden(self::PATH, 'Only administrators can reconcile accounts');
        }

        $account = BankAccount::findOrFail($id);
        app(BankAccountService::class)->reconcile($account);

        return $this->apiSuccess(['account' => $account->fresh()], 'Account reconciled from raw ledger', self::PATH);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    public function destroy(string $id)
    {
        if (!in_array(Auth::user()->role, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->apiForbidden(self::PATH, 'Only administrators can delete accounts');
        }

        $account = BankAccount::findOrFail($id);
        $account->update(['isActive' => false]);
        Cache::forget('bank_accounts:summary');

        return $this->apiSuccess(null, 'Bank account deactivated', self::PATH);
    }

    // ── Inertia page ─────────────────────────────────────────────────────────

    public function page()
    {
        return Inertia::render('Dashboard/BankAccounts/Index');
    }
}
