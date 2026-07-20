import { usePage } from '@inertiajs/react';

interface AuthProps {
  auth?: {
    permissions?: string[];
  };
}

/**
 * Reads the `auth.permissions` flat permission-name list shared by
 * HandleInertiaRequests on every request, and exposes module/tab-shaped
 * checks for nav filtering and tab-bar filtering.
 */
export function usePermissions() {
  const { auth } = usePage().props as AuthProps;
  const perms = auth?.permissions ?? [];

  const can = (name: string) => perms.includes(name);
  const canModule = (moduleKey: string) => can(`module.view.${moduleKey}`);
  const canTab = (moduleKey: string, tabKey: string, exempt = false) =>
    exempt || can(`module.tab.${moduleKey}.${tabKey}`);

  return { permissions: perms, can, canModule, canTab };
}
