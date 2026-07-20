import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Head, usePage } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import { Select } from '@/Components/ui/Select';
import { ToastContainer } from '@/Components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { useResourceList } from '@/hooks/useResourceList';
import { useCrudMutations } from '@/hooks/useCrudMutations';

import {
  Shield, Plus, Search, Edit2, Trash2, X, Loader2, UserCheck, Mail, Key, Crown, Users2, UserCog, Lock
} from 'lucide-react';

// Role is any dynamic role name (legacy or custom, created via Roles &
// Permissions) — validated against the live list fetched from /api/roles,
// not a fixed enum.
const createUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().min(1, 'Role is required'),
});

const editUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AvailableRole {
  id: number;
  name: string;
  isLegacy: boolean;
}

const DEFAULT_ROLE_STYLE = {
  icon: Shield,
  badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

const ROLE_CONFIG = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    icon: Crown,
    color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
    badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    desc: 'Full system access, user management, all permissions',
  },
  ADMIN: {
    label: 'Admin',
    icon: Shield,
    color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',
    badge: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    desc: 'Manage projects, suppliers, vendors, reports',
  },
  ACCOUNTANT: {
    label: 'Accountant',
    icon: UserCheck,
    color: 'text-green-400 border-green-500/20 bg-green-500/5',
    badge: 'bg-green-500/10 text-green-400 border border-green-500/20',
    desc: 'View/manage financial records, generate reports',
  },
  PROJECT_MANAGER: {
    label: 'Project Manager',
    icon: UserCog,
    color: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
    badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    desc: 'Manage projects, vendors, materials, labour',
  },
  DATA_ENTRY_OPERATOR: {
    label: 'Data Entry',
    icon: Users2,
    color: 'text-slate-400 border-slate-500/20 bg-slate-500/5',
    badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
    desc: 'Enter transactions, upload documents, basic access',
  },
};

export default function UsersPage() {
  const { auth } = usePage().props as any;
  const currentUser = auth?.user;
  const { toasts, removeToast, success, error, handlePromise } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);

  const [isBusy, setIsBusy] = useState(false);

  const {
    items: users, isFetching: isLoading, refetch: fetchUsers,
  } = useResourceList<ApiUser>('/api/users', { listKey: 'users' });

  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  useEffect(() => {
    axios.get('/api/roles').then((res) => setAvailableRoles(res.data.data.roles)).catch(() => {});
  }, []);

  const { create: createUser, update: updateUser, remove: removeUser } =
    useCrudMutations('/api/users', handlePromise, fetchUsers);

  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { fullName: '', email: '', password: '', role: 'DATA_ENTRY_OPERATOR' },
    mode: 'all',
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { fullName: '', email: '', password: '', role: 'DATA_ENTRY_OPERATOR' },
    mode: 'all',
  });

  const activeForm = modalMode === 'create' ? createForm : editForm;

  const handleOpenCreate = () => {
    setModalMode('create');
    createForm.reset({ fullName: '', email: '', password: '', role: 'DATA_ENTRY_OPERATOR' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: ApiUser) => {
    setModalMode('edit');
    setSelectedUser(u);
    editForm.reset({ fullName: u.fullName, email: u.email, password: '', role: u.role });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) return;
    try {
      await removeUser(id, `User "${name}" has been deleted.`);
    } catch (err) {
      // ignore
    }
  };

  const onCreateSubmit = async (values: CreateUserFormData) => {
    setIsBusy(true);
    try {
      await createUser(values, 'User account created successfully.');
      setIsModalOpen(false);
    } catch (err) {
      // ignore
    } finally {
      setIsBusy(false);
    }
  };

  const onEditSubmit = async (values: EditUserFormData) => {
    if (!selectedUser) return;
    setIsBusy(true);

    const body: any = {
      fullName: values.fullName,
      email: values.email,
      role: values.role,
    };
    if (values.password) body.newPassword = values.password;

    try {
      await updateUser(selectedUser.id, body, 'User updated successfully.');
      setIsModalOpen(false);
    } catch (err) {
      // ignore
    } finally {
      setIsBusy(false);
    }
  };

  // ─── Filtering ─────────────────────────────────────────────────────────────

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ─── RBAC Guard ────────────────────────────────────────────────────────────

  if (currentUser?.role !== 'SUPER_ADMIN') {
    return (
      <AuthenticatedLayout>
        <Head title="Access Restricted" />
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <Lock className="h-10 w-10 text-slate-700 mb-3" />
          <p className="font-semibold text-sm">Access Restricted</p>
          <p className="text-xs mt-1 text-slate-600">Only Super Admin can manage system users.</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Head title="User Management" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
              User Management
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Manage system access, roles, and permissions for your organization&apos;s team members.
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
            icon={<Plus className="h-4.5 w-4.5" />}
          >
            Add New User
          </Button>
        </div>

        {/* Role Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.entries(ROLE_CONFIG) as [keyof typeof ROLE_CONFIG, (typeof ROLE_CONFIG)[keyof typeof ROLE_CONFIG]][]).map(([roleKey, config]) => {
            const Icon = config.icon;
            return (
              <div
                key={roleKey}
                onClick={() => setRoleFilter(roleFilter === roleKey ? 'ALL' : roleKey)}
                className={`p-4 border rounded-2xl cursor-pointer transition-all hover:scale-[1.02] ${config.color} ${roleFilter === roleKey ? 'ring-1 ring-current/30' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-xl font-bold text-slate-100">{roleCounts[roleKey] || 0}</span>
                </div>
                <p className="text-xs font-semibold">{config.label}</p>
              </div>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <button
            onClick={() => { setSearchTerm(''); setRoleFilter('ALL'); }}
            className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer bg-slate-900/10"
          >
            Clear Filters
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60">
                  <th className="text-left text-slate-500 font-bold uppercase tracking-widest px-5 py-3.5">User</th>
                  <th className="text-left text-slate-500 font-bold uppercase tracking-widest px-5 py-3.5 hidden md:table-cell">Email</th>
                  <th className="text-left text-slate-500 font-bold uppercase tracking-widest px-5 py-3.5">Role</th>
                  <th className="text-left text-slate-500 font-bold uppercase tracking-widest px-5 py-3.5 hidden lg:table-cell">Joined</th>
                  <th className="text-right text-slate-500 font-bold uppercase tracking-widest px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                        <span>Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-500">
                      <Users2 className="h-8 w-8 mx-auto text-slate-700 mb-2" />
                      <p className="font-semibold">No users found</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const roleConf = ROLE_CONFIG[u.role as keyof typeof ROLE_CONFIG] ?? { ...DEFAULT_ROLE_STYLE, label: u.role };
                    const RoleIcon = roleConf.icon;
                    const isSelf = u.id === currentUser?.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/20 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase shrink-0">
                              {u.fullName.slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-200 flex items-center gap-1.5 font-sans">
                                {u.fullName}
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-bold">
                                    YOU
                                  </span>
                                )}
                              </p>
                              <p className="text-slate-500 mt-0.5 md:hidden">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Mail className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                            <span>{u.email}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${roleConf.badge}`}>
                            <RoleIcon className="h-3 w-3" />
                            {roleConf.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 hidden lg:table-cell">
                          {new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
                              title="Edit user"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {currentUser?.role === 'SUPER_ADMIN' && !isSelf && (
                              <button
                                onClick={() => handleDelete(u.id, u.fullName)}
                                className="p-1.5 hover:bg-rose-950/20 rounded-lg text-slate-500 hover:text-rose-455 transition-colors cursor-pointer"
                                title="Delete user"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredUsers.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-500 flex items-center justify-between">
              <span>
                Showing <span className="font-bold text-slate-300">{filteredUsers.length}</span> of{' '}
                <span className="font-bold text-slate-300">{users.length}</span> users
              </span>
              <span className="text-slate-650">CPMAS ERP · User Registry</span>
            </div>
          )}
        </div>

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-400" />
                  {modalMode === 'create' ? 'Create New User Account' : 'Edit User Profile'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-100 cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={modalMode === 'create' ? createForm.handleSubmit(onCreateSubmit) : editForm.handleSubmit(onEditSubmit)}
                className="space-y-4"
              >
                {/* Full Name */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Full Name</label>
                  <Input
                    {...activeForm.register('fullName')}
                    placeholder="e.g. Sarah Jenkins"
                    error={activeForm.formState.errors.fullName?.message}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">
                    <Mail className="h-3.5 w-3.5 inline mr-1.5 text-slate-500" />
                    Email Address
                  </label>
                  <Input
                    type="email"
                    {...activeForm.register('email')}
                    placeholder="e.g. sarah@company.com"
                    error={activeForm.formState.errors.email?.message}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">
                    <Key className="h-3.5 w-3.5 inline mr-1.5 text-slate-500" />
                    {modalMode === 'create' ? 'Password' : 'New Password (leave blank to keep current)'}
                  </label>
                  <Input
                    type="password"
                    {...activeForm.register('password')}
                    placeholder={modalMode === 'create' ? 'Min. 6 characters' : 'Leave blank to keep current'}
                    error={activeForm.formState.errors.password?.message}
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">
                    <Shield className="h-3.5 w-3.5 inline mr-1.5 text-slate-500" />
                    System Role
                  </label>
                  <Select
                    {...activeForm.register('role')}
                    error={activeForm.formState.errors.role?.message}
                  >
                    {availableRoles.map((r) => (
                      <option key={r.id} value={r.name} className="bg-slate-900 text-slate-200">
                        {ROLE_CONFIG[r.name as keyof typeof ROLE_CONFIG]?.label ?? r.name}
                        {!r.isLegacy ? ' (Custom)' : ''}
                      </option>
                    ))}
                  </Select>
                  {(() => {
                    const role = modalMode === 'create' ? createForm.watch('role') : editForm.watch('role');
                    const desc = role ? ROLE_CONFIG[role as keyof typeof ROLE_CONFIG]?.desc : null;
                    return desc ? <p className="text-[10px] text-slate-500 mt-1.5 ml-1">{desc}</p> : null;
                  })()}
                </div>

                <div className="pt-3 flex justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={isBusy}
                  >
                    {modalMode === 'create' ? 'Create Account' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
