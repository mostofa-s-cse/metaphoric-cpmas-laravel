<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuditLogController extends Controller
{
    use ApiResponse;

    const PATH = '/audit-logs';

    public function index(Request $request)
    {
        $page = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 20);
        $skip = ($page - 1) * $limit;
        $search = $request->get('search', '');
        $userId = $request->get('userId');
        $actionGroup = $request->get('actionGroup', 'ALL');
        $entityType = $request->get('entityType', 'ALL');
        $startDate = $request->get('startDate');
        $endDate = $request->get('endDate');

        $query = AuditLog::with(['user:id,fullName,email,role']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('details', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('fullName', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }
        if ($userId) $query->where('userId', $userId);

        // Action group filter (e.g. matches CREATE_*, UPDATE_*)
        if ($actionGroup && $actionGroup !== 'ALL') {
            $query->where('action', 'like', "{$actionGroup}%");
        }

        // Entity filter (e.g. matches *_PROJECT, *_SUPPLIER)
        if ($entityType && $entityType !== 'ALL') {
            if ($entityType === 'LOGIN') {
                $query->where('action', 'like', '%LOGIN%');
            } else {
                $query->where('action', 'like', "%{$entityType}");
            }
        }

        // Date range filter
        if ($startDate) {
            $sDate = \Carbon\Carbon::parse($startDate)->startOfDay();
            $query->where('createdAt', '>=', $sDate);
        }
        if ($endDate) {
            $eDate = \Carbon\Carbon::parse($endDate)->endOfDay();
            $query->where('createdAt', '<=', $eDate);
        }

        $total = $query->count();
        $logs = $query->orderBy('createdAt', 'desc')->skip($skip)->take($limit)->get();

        return $this->apiPaginated('auditLogs', $logs, $total, $page, $limit,
            'Audit logs retrieved successfully', self::PATH);
    }

    public function prune(Request $request)
    {
        $user = auth()->user();
        if (!$user) {
            return $this->apiUnauthorized(self::PATH);
        }

        // Only SUPER_ADMIN can delete/prune audit logs (inline backstop regardless of route middleware)
        if ($user->role !== 'SUPER_ADMIN') {
            return $this->apiForbidden(self::PATH, 'Forbidden: Only Super Administrator is permitted to prune audit logs.');
        }

        $startDate = $request->input('startDate');
        $endDate = $request->input('endDate');

        if (!$startDate || !$endDate) {
            return $this->apiBadRequest('Start Date and End Date are required to prune logs.', self::PATH);
        }

        $sDate = \Carbon\Carbon::parse($startDate)->startOfDay();
        $eDate = \Carbon\Carbon::parse($endDate)->endOfDay();

        if ($sDate->gt($eDate)) {
            return $this->apiBadRequest('Start Date cannot be after End Date.', self::PATH);
        }

        // Prune matching logs
        $count = AuditLog::whereBetween('createdAt', [$sDate, $eDate])->delete();

        return $this->apiSuccess(
            ['count' => $count],
            "Successfully pruned {$count} audit log records from the system database.",
            self::PATH
        );
    }

    public function page()
    {
        return Inertia::render('Dashboard/AuditLogs/Index');
    }
}
