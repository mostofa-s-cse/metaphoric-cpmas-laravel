<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * One-time bridge from the legacy `users.role` string enum to the new
 * granular module/tab permission system (spatie/laravel-permission).
 *
 * Creates 5 spatie roles named identically to the legacy string values so
 * every existing user maps by a trivial name lookup, grants each role the
 * exact module/tab permissions its nav items already had in
 * `AuthenticatedLayout.tsx` (so nobody's access changes on deploy day), then
 * assigns every existing user their matching role. The legacy `role` column
 * is never touched/dropped — it still drives the untouched action-level
 * (delete/edit/adjust) checks scattered across controllers.
 */
class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Mirrors each nav item's `roles: string[]` in AuthenticatedLayout.tsx —
     * the default role set for a module AND for its tabs (tabs were
     * previously ungated, so they default to the same set as the module).
     */
    private const MODULE_ROLES = [
        'dashboard'      => ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'],
        'projects'       => ['SUPER_ADMIN'],
        'suppliers'      => ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DATA_ENTRY_OPERATOR'],
        'vendor'         => ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'],
        'employees'      => ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'],
        'labour'         => ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'],
        'materials'      => ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'],
        'transactions'   => ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DATA_ENTRY_OPERATOR'],
        'bank-accounts'  => ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'],
        'documents'      => ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'],
        'reports'        => ['SUPER_ADMIN'],
        'website'        => ['SUPER_ADMIN', 'ADMIN'],
        'users'          => ['SUPER_ADMIN'],
        'audit-logs'     => ['SUPER_ADMIN', 'ADMIN'],
        'contacts'       => ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'],
        'settings'       => ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'],
    ];

    /**
     * Tab-specific role sets that differ from their module's default —
     * currently only Settings > Email SMTP Config (`isAdmin` check in
     * Settings/Index.tsx:104,346).
     */
    private const TAB_ROLE_OVERRIDES = [
        'settings.smtp' => ['SUPER_ADMIN', 'ADMIN'],
    ];

    public function run(): void
    {
        Artisan::call('permissions:sync');

        $roleNames = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'];
        $roles = [];
        foreach ($roleNames as $roleName) {
            $roles[$roleName] = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        foreach (config('modules', []) as $moduleKey => $module) {
            $moduleRoles = self::MODULE_ROLES[$moduleKey] ?? [];
            $this->grantToRoles("module.view.{$moduleKey}", $moduleRoles, $roles);

            foreach ($module['tabs'] ?? [] as $tabKey => $tab) {
                if (!empty($tab['exempt'])) {
                    continue;
                }

                $tabRoles = self::TAB_ROLE_OVERRIDES["{$moduleKey}.{$tabKey}"] ?? $moduleRoles;
                $this->grantToRoles("module.tab.{$moduleKey}.{$tabKey}", $tabRoles, $roles);
            }
        }

        // Super Admin bypass — literally every permission that exists,
        // regardless of the map above, so future modules are covered too.
        $roles['SUPER_ADMIN']->syncPermissions(Permission::all());

        // Map every existing user to their matching spatie role by name.
        User::all()->each(function (User $user) {
            if (array_key_exists($user->role, self::MODULE_ROLES) === false && !in_array($user->role, ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'], true)) {
                return;
            }
            $user->syncRoles([$user->role]);
        });

        $this->command?->info('Roles & permissions seeded, existing users mapped by legacy role string.');
    }

    private function grantToRoles(string $permissionName, array $roleNames, array $roles): void
    {
        $permission = Permission::where('name', $permissionName)->where('guard_name', 'web')->first();
        if (!$permission) {
            return;
        }

        foreach ($roleNames as $roleName) {
            $roles[$roleName]?->givePermissionTo($permission);
        }
    }
}
