<?php

namespace App\Traits;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

trait Auditable
{
    public static function bootAuditable()
    {
        static::created(function ($model) {
            self::logActivity('CREATE', $model);
        });

        static::updated(function ($model) {
            self::logActivity('UPDATE', $model);
        });

        static::deleted(function ($model) {
            self::logActivity('DELETE', $model);
        });
    }

    private static function logActivity(string $operation, $model)
    {
        $userId = Auth::id();
        if (!$userId) return; // Skip if no user is logged in (e.g., seeding)

        $modelName = class_basename($model);
        if ($modelName === 'AuditLog') return; // Avoid recursion

        $entityName = $model->name ?? $model->fullName ?? $model->fullName ?? $model->code ?? $model->employeeId ?? '';
        $details = "Performed {$operation} on model {$modelName}";

        if ($operation === 'CREATE') {
            $details = "Created {$modelName} record " . ($entityName ? "({$entityName}) " : "") . "with ID: {$model->id}";
        } elseif ($operation === 'UPDATE') {
            $details = "Updated {$modelName} record " . ($entityName ? "({$entityName}) " : "") . "with ID: {$model->id}";
        } elseif ($operation === 'DELETE') {
            $details = "Deleted {$modelName} record with ID: {$model->id}";
        }

        AuditLog::create([
            'userId' => $userId,
            'action' => "{$operation}_" . strtoupper($modelName),
            'details' => $details,
            'ipAddress' => request()->ip(),
        ]);
    }
}
