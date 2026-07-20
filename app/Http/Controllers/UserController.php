<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    use ApiResponse;

    const PATH = '/users';

    // Only SUPER_ADMIN can manage users
    public function index(Request $request)
    {
        $search = $request->get('search', '');
        $page = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 10);
        $skip = ($page - 1) * $limit;

        $query = User::select(['id', 'email', 'fullName', 'profileImage', 'role', 'created_at', 'updated_at']);
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('fullName', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%");
            });
        }

        $total = $query->count();
        $users = $query->orderBy('created_at', 'desc')->skip($skip)->take($limit)->get();

        return $this->apiPaginated('users', $users, $total, $page, $limit,
            'Users retrieved successfully', self::PATH);
    }

    public function show(string $id)
    {
        $currentUser = Auth::user();

        if ($id !== $currentUser->id && $currentUser->role !== 'SUPER_ADMIN') {
            return $this->apiForbidden(self::PATH);
        }

        $user = User::select(['id', 'email', 'fullName', 'profileImage', 'role', 'created_at', 'updated_at'])
            ->find($id);

        if (! $user) {
            return $this->apiNotFound('User', self::PATH);
        }

        return $this->apiSuccess(['user' => $user], 'User details retrieved successfully', self::PATH);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email|unique:users,email',
            'fullName' => 'required|string',
            'password' => 'required|string|min:6',
            // Any role that exists in the dynamic roles table — legacy
            // (SUPER_ADMIN etc) or a custom one created via Roles & Permissions.
            'role' => 'required|string|exists:roles,name',
        ]);

        $user = User::create([
            'email' => strtolower($data['email']),
            'fullName' => $data['fullName'],
            'role' => $data['role'],
            'passwordHash' => Hash::make($data['password']),
        ]);
        // users.role stays the legacy display/action-check string; syncRoles()
        // attaches the real spatie Role that actually carries permissions.
        $user->syncRoles([$data['role']]);

        return $this->apiCreated(
            ['user' => $user->only(['id', 'email', 'fullName', 'role', 'created_at'])],
            'User created successfully', self::PATH
        );
    }

    public function update(Request $request, string $id)
    {
        $currentUser = Auth::user();
        $isSelf = $currentUser->id === $id;
        $isSuperAdmin = $currentUser->role === 'SUPER_ADMIN';

        if (!$isSelf && !$isSuperAdmin) {
            return $this->apiForbidden(self::PATH);
        }

        $user = User::findOrFail($id);

        $data = $request->validate([
            'email' => "sometimes|email|unique:users,email,{$id}",
            'fullName' => 'sometimes|string',
            'role' => 'sometimes|string|exists:roles,name',
            'newPassword' => 'nullable|string|min:6',
            'profileImage' => 'nullable|string',
        ]);

        if (isset($data['role']) && !$isSuperAdmin) {
            return $this->apiForbidden(self::PATH, 'Forbidden: Cannot change own role');
        }

        if (isset($data['newPassword'])) {
            $data['passwordHash'] = Hash::make($data['newPassword']);
        }
        unset($data['newPassword']);

        $newRole = $data['role'] ?? null;
        $user->update($data);
        if ($newRole !== null) {
            $user->syncRoles([$newRole]);
        }

        return $this->apiSuccess(
            ['user' => $user->fresh()->only(['id', 'email', 'fullName', 'profileImage', 'role', 'updated_at'])],
            'User updated successfully', self::PATH
        );
    }

    public function destroy(string $id)
    {
        $currentUser = Auth::user();

        if ($currentUser->id === $id) {
            return $this->apiBadRequest('You cannot delete your own account', self::PATH);
        }

        User::findOrFail($id)->delete();

        return $this->apiSuccess(null, 'User deleted successfully', self::PATH);
    }

    /**
     * Return currently authenticated user info.
     */
    public function me()
    {
        $user = Auth::user();
        return $this->apiSuccess(
            ['user' => $user ? $user->only(['id', 'email', 'fullName', 'profileImage', 'role']) : null],
            'User retrieved successfully', '/me'
        );
    }

    public function page()
    {
        return Inertia::render('Dashboard/Users/Index');
    }
}
