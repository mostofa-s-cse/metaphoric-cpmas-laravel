<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoleMiddleware
{
    const HIERARCHY = [
        'SUPER_ADMIN' => 4,
        'ADMIN' => 3,
        'ACCOUNTANT' => 2,
        'PROJECT_MANAGER' => 1,
        'DATA_ENTRY_OPERATOR' => 0,
    ];

    public function handle(Request $request, Closure $next, string $requiredRole)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized — Please log in to continue.'
            ], 401);
        }

        $userLevel = self::HIERARCHY[$user->role] ?? 0;
        $requiredLevel = self::HIERARCHY[$requiredRole] ?? 0;

        if ($userLevel < $requiredLevel) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden — You do not have permission to perform this action.'
            ], 403);
        }

        return $next($request);
    }
}
