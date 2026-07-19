<?php

namespace App\Http\Controllers;

use App\Models\BalanceLedger;
use App\Models\BankAccount;
use App\Models\CashIn;
use App\Models\CashOut;
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
            'reason'     => $data['reason'],
            'cashOutId'  => null,
        ]);

        Cache::forget('bank_accounts:summary');

        return $this->apiSuccess([
            'account' => $account->fresh(),
            'adjustment' => ['before' => $before, 'after' => $after, 'diff' => $diff],
        ], 'Balance adjusted successfully', self::PATH);
    }

    // ── History ───────────────────────────────────────────────────────────────

    /**
     * Paginated transaction history for one account — merges CashOut/CashIn
     * rows that actually hit this account's balance. Two attribution paths:
     *  - Direct: CashOut.bankAccountId = this account (office/global expenses,
     *    EMPLOYEE_SALARY — set explicitly at creation).
     *  - Inferred: every other row (project-wise CashOut categories, and every
     *    CashIn — neither has a bankAccountId FK) was still debited/credited
     *    to *some* account by CashOut/CashIn's model events, via
     *    BankAccountService's name-then-type-fallback guess. We re-run that
     *    exact same resolution per row here so the log matches what actually
     *    moved this account's currentBalance/totalIn/totalOut — otherwise the
     *    balance changes but no line item explains why.
     *  - Manual: a BalanceLedger row from the /adjust endpoint — the admin
     *    correcting currentBalance directly rather than through a CashIn/Out.
     * Amount is EncryptedFloat-cast so it can't be sorted/paginated at the SQL
     * level — both sides are pulled in full then merged/sliced in PHP, same
     * tradeoff SupplierController/VendorController make for encrypted sums.
     */
    public function history(Request $request, string $id)
    {
        $account = BankAccount::findOrFail($id);
        $bankService = app(BankAccountService::class);

        $page  = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 10);

        $cashOuts = CashOut::where('bankAccountId', $id)
            ->orWhereNull('bankAccountId')
            ->get(['id', 'date', 'paidTo', 'expenseCategory', 'amountNumeric', 'referenceNumber', 'paymentMethod', 'bankAccountId'])
            ->filter(fn (CashOut $c) => $c->bankAccountId === $id
                || $bankService->resolveAccountId(null, $c->paymentMethod) === $id)
            ->map(fn (CashOut $c) => [
                'id'              => $c->id,
                'type'            => 'CASH_OUT',
                'date'            => $c->date,
                'description'     => $c->paidTo,
                'category'        => $c->expenseCategory,
                'amount'          => (float) $c->amountNumeric,
                'referenceNumber' => $c->referenceNumber,
            ]);

        $cashIns = CashIn::all(['id', 'date', 'clientName', 'source', 'amountNumeric', 'referenceNumber', 'bankOrCash', 'paymentMethod'])
            ->filter(fn (CashIn $c) => $bankService->resolveAccountId($c->bankOrCash, $c->paymentMethod) === $id)
            ->map(fn (CashIn $c) => [
                'id'              => $c->id,
                'type'            => 'CASH_IN',
                'date'            => $c->date,
                'description'     => $c->clientName,
                'category'        => $c->source,
                'amount'          => (float) $c->amountNumeric,
                'referenceNumber' => $c->referenceNumber,
            ]);

        $adjustments = BalanceLedger::where('entityType', 'BankAccount')
            ->where('entityId', $id)
            ->get(['id', 'before', 'after', 'reason', 'createdAt'])
            ->map(fn (BalanceLedger $l) => [
                'id'              => $l->id,
                'type'            => 'ADJUSTMENT',
                'date'            => $l->createdAt,
                'description'     => $l->reason ?: 'Manual balance adjustment',
                'category'        => 'BALANCE_ADJUSTMENT',
                'amount'          => (float) $l->after - (float) $l->before,
                'referenceNumber' => null,
            ]);

        $merged = $cashOuts->concat($cashIns)->concat($adjustments)->sortByDesc('date')->values();
        $total  = $merged->count();
        $items  = $merged->slice(($page - 1) * $limit, $limit)->values();

        return $this->apiPaginated(
            'history', $items, $total, $page, $limit,
            'Account history retrieved', self::PATH . "/{$id}/history"
        );
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
