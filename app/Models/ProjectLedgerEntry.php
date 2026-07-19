<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * A single line in a project's own ledger.
 *
 * Every CashIn/CashOut event that carries a projectId writes one row here,
 * giving each project a full statement of account — not just a running total.
 *
 * entryType: CASH_IN | CASH_OUT
 * referenceType: App\Models\CashIn | App\Models\CashOut
 */
class ProjectLedgerEntry extends Model
{
    use HasUuids;

    protected $table = 'project_ledger_entries';

    protected $fillable = [
        'projectId',
        'entryType',
        'referenceId',
        'referenceType',
        'date',
        'amount',
        'description',
        'expenseCategory',
        'paymentMethod',
        'bankOrCashAccount',
    ];

    protected $casts = [
        'date'   => 'datetime',
        'amount' => 'decimal:2',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId');
    }

    /**
     * Polymorphic-style accessor — returns the linked CashIn or CashOut.
     * (Not a true Laravel morph because referenceType is a class-name string
     * stored as-is, keeping the schema simple.)
     */
    public function getReference(): ?Model
    {
        $class = $this->referenceType;
        if (!$class || !class_exists($class)) {
            return null;
        }
        return $class::find($this->referenceId);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForProject($query, string $projectId)
    {
        return $query->where('projectId', $projectId);
    }

    public function scopeCashIns($query)
    {
        return $query->where('entryType', 'CASH_IN');
    }

    public function scopeCashOuts($query)
    {
        return $query->where('entryType', 'CASH_OUT');
    }

    public function scopeBetweenDates($query, ?string $from, ?string $to)
    {
        if ($from) {
            $query->where('date', '>=', \Carbon\Carbon::parse($from)->startOfDay());
        }
        if ($to) {
            $query->where('date', '<=', \Carbon\Carbon::parse($to)->endOfDay());
        }
        return $query;
    }
}
