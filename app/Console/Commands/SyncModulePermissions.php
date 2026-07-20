<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Permission\Models\Permission;

/**
 * Idempotently creates a `module.view.{key}` permission for every module and
 * a `module.tab.{key}.{tabKey}` permission for every non-exempt tab defined
 * in config/modules.php — the single source of truth for the sidebar
 * module/tab registry. Safe to re-run whenever the registry gains an entry.
 */
class SyncModulePermissions extends Command
{
    protected $signature = 'permissions:sync';

    protected $description = 'Sync module/tab permissions from config/modules.php';

    public function handle(): int
    {
        $created = 0;
        $existing = 0;

        foreach (config('modules', []) as $moduleKey => $module) {
            $name = "module.view.{$moduleKey}";
            $permission = Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
            $permission->wasRecentlyCreated ? $created++ : $existing++;

            foreach ($module['tabs'] ?? [] as $tabKey => $tab) {
                if (!empty($tab['exempt'])) {
                    continue;
                }

                $tabName = "module.tab.{$moduleKey}.{$tabKey}";
                $tabPermission = Permission::firstOrCreate(['name' => $tabName, 'guard_name' => 'web']);
                $tabPermission->wasRecentlyCreated ? $created++ : $existing++;
            }
        }

        $this->info("Module permissions synced: {$created} created, {$existing} already existed.");

        return self::SUCCESS;
    }
}
