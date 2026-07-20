<?php

namespace App\Http\Controllers;

use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Admin CRUD for custom roles and their module/tab permission grants.
 *
 * Deliberately reachable only via the legacy `role:SUPER_ADMIN` middleware
 * (see routes/web.php) rather than the dynamic module.view permission system
 * itself — otherwise nobody could grant the permission to manage permissions.
 */
class RoleController extends Controller
{
    use ApiResponse;

    const PATH = '/roles';

    /**
     * Roles that map 1:1 to the legacy `users.role` string enum — protected
     * from deletion/renaming since RolesAndPermissionsSeeder and the action-
     * level `in_array(Auth::user()->role, [...])` checks depend on these
     * exact names existing.
     */
    const LEGACY_ROLE_NAMES = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'];

    public function page()
    {
        return Inertia::render('Dashboard/Roles/Index');
    }

    /**
     * The module/tab registry (config/modules.php), shaped for the
     * checkbox-tree UI.
     */
    public function moduleRegistry()
    {
        return $this->apiSuccess(['modules' => config('modules', [])], 'Module registry retrieved', self::PATH . '/module-registry');
    }

    public function index()
    {
        $roles = Role::with('permissions:id,name')->orderBy('name')->get()->map(fn (Role $role) => [
            'id'          => $role->id,
            'name'        => $role->name,
            'isLegacy'    => in_array($role->name, self::LEGACY_ROLE_NAMES, true),
            'userCount'   => \App\Models\User::role($role->name)->count(),
            'permissions' => $role->permissions->pluck('name'),
        ]);

        return $this->apiSuccess(['roles' => $roles], 'Roles retrieved', self::PATH);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'          => 'required|string|max:100|unique:roles,name',
            'permissions'   => 'array',
            'permissions.*' => 'string',
        ]);

        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
        $role->syncPermissions($this->validPermissionNames($data['permissions'] ?? []));

        return $this->apiCreated(['role' => $this->present($role)], 'Role created', self::PATH);
    }

    public function update(Request $request, string $id)
    {
        $role = Role::findOrFail($id);

        $data = $request->validate([
            'name'          => 'sometimes|string|max:100|unique:roles,name,' . $role->id,
            'permissions'   => 'array',
            'permissions.*' => 'string',
        ]);

        // Legacy role names are load-bearing for RolesAndPermissionsSeeder's
        // user mapping and every `in_array(Auth::user()->role, [...])`
        // action-level check — renaming one would silently strand users.
        if (in_array($role->name, self::LEGACY_ROLE_NAMES, true) && isset($data['name']) && $data['name'] !== $role->name) {
            return $this->apiForbidden(self::PATH, 'This role name is used by the legacy role system and cannot be renamed.');
        }

        if (isset($data['name'])) {
            $role->update(['name' => $data['name']]);
        }

        if (array_key_exists('permissions', $data)) {
            $role->syncPermissions($this->validPermissionNames($data['permissions']));
        }

        return $this->apiSuccess(['role' => $this->present($role->fresh('permissions'))], 'Role updated', self::PATH);
    }

    public function destroy(string $id)
    {
        $role = Role::findOrFail($id);

        if (in_array($role->name, self::LEGACY_ROLE_NAMES, true)) {
            return $this->apiForbidden(self::PATH, 'Legacy roles cannot be deleted.');
        }

        if (\App\Models\User::role($role->name)->exists()) {
            return $this->apiConflict('Cannot delete a role that still has users assigned — reassign them first.', self::PATH);
        }

        $role->delete();

        return $this->apiSuccess(null, 'Role deleted', self::PATH);
    }

    private function present(Role $role): array
    {
        return [
            'id'          => $role->id,
            'name'        => $role->name,
            'isLegacy'    => in_array($role->name, self::LEGACY_ROLE_NAMES, true),
            'permissions' => $role->permissions->pluck('name'),
        ];
    }

    /**
     * Drop any posted permission name that doesn't actually exist in the
     * registry — keeps a stale/tampered client payload from creating
     * arbitrary permission rows via syncPermissions().
     */
    private function validPermissionNames(array $names): array
    {
        return Permission::whereIn('name', $names)->pluck('name')->all();
    }
}
