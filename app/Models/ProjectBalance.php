<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Running totals for one project's own pool — maintained incrementally by
 * CashIn/CashOut model events (see BalanceSnapshotService), read by
 * HasMainBalance instead of summing cash_ins/cash_outs on every call.
 */
class ProjectBalance extends Model
{
    protected $table = 'project_balances';

    protected $primaryKey = 'projectId';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['projectId', 'totalPaidIn', 'totalProjectWiseSpent'];

    public function project()
    {
        return $this->belongsTo(Project::class, 'projectId');
    }
}
