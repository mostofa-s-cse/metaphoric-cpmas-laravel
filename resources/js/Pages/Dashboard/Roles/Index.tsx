import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import { AlertDialog } from '@/Components/ui/AlertDialog';
import { ToastContainer } from '@/Components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { ShieldCheck, Plus, Trash2, Save, Loader2, Lock, Users } from 'lucide-react';

interface ModuleTab {
  label: string;
  exempt?: boolean;
}

interface ModuleEntry {
  label: string;
  route: string;
  tabs: Record<string, ModuleTab>;
}

interface RoleRow {
  id: number;
  name: string;
  isLegacy: boolean;
  userCount: number;
  permissions: string[];
}

export default function RolesPage() {
  const { toasts, removeToast, success, error } = useToast();

  const [modules, setModules] = useState<Record<string, ModuleEntry>>({});
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null);

  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [registryRes, rolesRes] = await Promise.all([
        axios.get('/api/roles/module-registry'),
        axios.get('/api/roles'),
      ]);
      setModules(registryRes.data.data.modules);
      setRoles(rolesRes.data.data.roles);
    } catch {
      error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const selectedRole = typeof selectedId === 'number' ? roles.find((r) => r.id === selectedId) : null;

  const selectRole = (id: number) => {
    const role = roles.find((r) => r.id === id);
    if (!role) return;
    setSelectedId(id);
    setName(role.name);
    setPermissions(new Set(role.permissions));
  };

  const startCreate = () => {
    setSelectedId('new');
    setName('');
    setPermissions(new Set());
  };

  const moduleKey = (key: string) => `module.view.${key}`;
  const tabKey = (mKey: string, tKey: string) => `module.tab.${mKey}.${tKey}`;

  const toggleModule = (mKey: string, mod: ModuleEntry) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      const key = moduleKey(mKey);
      if (next.has(key)) {
        // Unchecking a module cascades to unchecking all its tabs — tab
        // access without module access is meaningless.
        next.delete(key);
        Object.keys(mod.tabs).forEach((tKey) => next.delete(tabKey(mKey, tKey)));
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleTab = (mKey: string, tKey: string) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      const key = tabKey(mKey, tKey);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onSave = async () => {
    if (!name.trim()) {
      error('Role name is required');
      return;
    }
    setIsSaving(true);
    try {
      const payload = { name: name.trim(), permissions: Array.from(permissions) };
      if (selectedId === 'new') {
        const res = await axios.post('/api/roles', payload);
        success('Role created');
        await fetchAll();
        setSelectedId(res.data.data.role.id);
      } else if (typeof selectedId === 'number') {
        await axios.patch(`/api/roles/${selectedId}`, payload);
        success('Role updated');
        await fetchAll();
      }
    } catch (e: any) {
      error(e.response?.data?.message || 'Failed to save role');
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async () => {
    if (typeof selectedId !== 'number') return;
    try {
      await axios.delete(`/api/roles/${selectedId}`);
      success('Role deleted');
      setIsDeleteOpen(false);
      setSelectedId(null);
      fetchAll();
    } catch (e: any) {
      error(e.response?.data?.message || 'Failed to delete role');
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Roles & Permissions" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
            Roles & Permissions
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Control which modules and tabs each role can access. Unchecked items are completely inaccessible — hidden in the UI and blocked on the server.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mb-2" />
            <p className="text-slate-500 text-xs">Loading roles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Role list */}
            <div className="lg:col-span-1 bg-slate-900/25 border border-slate-800/80 rounded-2xl p-3 space-y-1.5 h-fit">
              <Button onClick={startCreate} icon={<Plus className="w-4 h-4" />} className="w-full mb-2" size="sm">
                New Role
              </Button>
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => selectRole(role.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    selectedId === role.id
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-slate-400 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {role.isLegacy && <Lock className="w-3 h-3 shrink-0 text-slate-600" />}
                    {role.name}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                    <Users className="w-3 h-3" /> {role.userCount}
                  </span>
                </button>
              ))}
            </div>

            {/* Editor */}
            <div className="lg:col-span-3 bg-slate-900/25 border border-slate-800/80 rounded-2xl p-5">
              {selectedId === null ? (
                <div className="h-64 flex flex-col items-center justify-center text-center px-4">
                  <ShieldCheck className="w-10 h-10 text-slate-700 mb-3" />
                  <p className="text-slate-400 text-sm font-semibold">Select a role to edit</p>
                  <p className="text-slate-600 text-xs mt-1">Or create a new custom role.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex-1 max-w-sm">
                      <label className="block text-sm font-medium text-slate-300 mb-1">Role Name</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Site Supervisor"
                        disabled={selectedRole?.isLegacy}
                      />
                      {selectedRole?.isLegacy && (
                        <p className="text-[10px] text-slate-500 mt-1">Legacy role name is locked — used by the existing role system.</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {typeof selectedId === 'number' && !selectedRole?.isLegacy && (
                        <Button variant="danger" size="sm" onClick={() => setIsDeleteOpen(true)} icon={<Trash2 className="w-3.5 h-3.5" />}>
                          Delete
                        </Button>
                      )}
                      <Button size="sm" onClick={onSave} disabled={isSaving} icon={<Save className="w-3.5 h-3.5" />}>
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {Object.entries(modules).map(([mKey, mod]) => {
                      const modChecked = permissions.has(moduleKey(mKey));
                      const tabEntries = Object.entries(mod.tabs).filter(([, t]) => !t.exempt);
                      return (
                        <div key={mKey} className="rounded-xl border border-slate-800/60 bg-slate-950/20 p-3">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={modChecked}
                              onChange={() => toggleModule(mKey, mod)}
                              className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-sm font-bold text-slate-100">{mod.label}</span>
                          </label>

                          {tabEntries.length > 0 && (
                            <div className="mt-2.5 ml-6 flex flex-wrap gap-x-5 gap-y-2">
                              {tabEntries.map(([tKey, tab]) => (
                                <label
                                  key={tKey}
                                  className={`flex items-center gap-2 text-xs cursor-pointer ${modChecked ? 'text-slate-300' : 'text-slate-600'}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={permissions.has(tabKey(mKey, tKey))}
                                    disabled={!modChecked}
                                    onChange={() => toggleTab(mKey, tKey)}
                                    className="w-3.5 h-3.5 rounded accent-cyan-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                  {tab.label}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={onDelete}
        title="Delete Role"
        description={`Delete "${name}"? Users must be reassigned to another role first if any are currently on it.`}
        confirmText="Delete"
      />
    </AuthenticatedLayout>
  );
}
