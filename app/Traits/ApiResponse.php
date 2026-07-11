<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    protected function envelope(string $status, string $message, $data, string $path): array
    {
        return [
            'status' => $status,
            'message' => $message,
            'data' => $data,
            'timestamp' => now()->toIso8601String(),
            'path' => $path,
        ];
    }

    protected function apiSuccess($data, string $message, string $path, int $statusCode = 200): JsonResponse
    {
        return response()->json($this->envelope('success', $message, $data, $path), $statusCode);
    }

    protected function apiCreated($data, string $message, string $path): JsonResponse
    {
        return $this->apiSuccess($data, $message, $path, 201);
    }

    protected function apiPaginated(string $key, $items, int $total, int $page, int $limit, string $message, string $path): JsonResponse
    {
        $data = [
            $key => $items,
            'total' => $total,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($total / $limit) ?: 1,
            ]
        ];
        return response()->json($this->envelope('success', $message, $data, $path), 200);
    }

    protected function apiError(string $message, string $path, int $statusCode = 500): JsonResponse
    {
        return response()->json($this->envelope('error', $message, null, $path), $statusCode);
    }

    protected function apiBadRequest(string $message, string $path): JsonResponse
    {
        return $this->apiError($message, $path, 400);
    }

    protected function apiUnauthorized(string $path): JsonResponse
    {
        return $this->apiError('Unauthorized — Please log in to continue.', $path, 401);
    }

    protected function apiForbidden(string $path, ?string $detail = null): JsonResponse
    {
        return $this->apiError($detail ?? 'Forbidden — You do not have permission to perform this action.', $path, 403);
    }

    protected function apiNotFound(string $resource, string $path): JsonResponse
    {
        return $this->apiError("{$resource} not found.", $path, 404);
    }

    protected function apiConflict(string $message, string $path): JsonResponse
    {
        return $this->apiError($message, $path, 409);
    }
}
