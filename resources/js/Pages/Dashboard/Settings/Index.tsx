import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ToastContainer } from '@/Components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';

import {
  Settings,
  User,
  Key,
  Save,
  Loader2,
  Building2,
  Shield,
  Crown,
  UserCheck,
  UserCog,
  Users2,
  Eye,
  EyeOff,
  Bell,
  Info,
  CheckCircle2,
  Camera,
} from 'lucide-react';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

// ─── Role Config ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  ACCOUNTANT: 'Accountant',
  PROJECT_MANAGER: 'Project Manager',
  DATA_ENTRY_OPERATOR: 'Data Entry Operator',
};

const ROLE_DESCRIPTIONS: Record<string, { icon: React.ComponentType<{ className?: string }>; desc: string; color: string }> = {
  SUPER_ADMIN: { icon: Crown, desc: 'You have unrestricted access to all modules, users, and system settings.', color: 'text-amber-400' },
  ADMIN: { icon: Shield, desc: 'You can manage all projects, financials, suppliers, vendors, and view reports.', color: 'text-cyan-400' },
  ACCOUNTANT: { icon: UserCheck, desc: 'You have access to financial records, transactions, and can generate reports.', color: 'text-green-400' },
  PROJECT_MANAGER: { icon: UserCog, desc: 'You can manage projects, vendors, materials, and field labor operations.', color: 'text-blue-400' },
  DATA_ENTRY_OPERATOR: { icon: Users2, desc: 'You can enter transactions, upload documents, and handle basic data operations.', color: 'text-slate-400' },
};

interface SmtpSettings {
  host: string;
  port: string | number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  notificationEmail: string;
}

export default function SettingsPage() {
  const { auth } = usePage().props as any;
  const authUser = auth?.user;
  const { toasts, removeToast, handlePromise } = useToast();

  // Local mirror of the current user so profile/avatar changes reflect immediately
  // on this page. The sidebar (AuthenticatedLayout) reads the Inertia shared prop
  // directly and will only pick up changes after a full page refresh.
  const [currentUser, setCurrentUser] = useState<any>(authUser);
  useEffect(() => {
    setCurrentUser(authUser);
  }, [authUser]);

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'smtp' | 'about'>('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);

  // Avatar photo picked but not yet saved — only persisted when the user
  // clicks Save, not the instant a file is chosen.
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isUpdatingSetting, setIsUpdatingSetting] = useState(false);

  const [smtpForm, setSmtpForm] = useState<SmtpSettings>({
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    fromEmail: '',
    notificationEmail: '',
  });

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    setIsLoadingSettings(true);
    axios
      .get('/api/website/settings')
      .then((res) => {
        if (cancelled) return;
        if (res.data.status === 'success' && res.data.data?.SMTP_SETTINGS) {
          const s = res.data.data.SMTP_SETTINGS;
          setSmtpForm({
            host: s.host || '',
            port: String(s.port || '587'),
            secure: s.secure === true,
            user: s.user || '',
            pass: s.pass || '',
            fromEmail: s.fromEmail || '',
            notificationEmail: s.notificationEmail || '',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSettings(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const onSmtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingSetting(true);
    try {
      await handlePromise(axios.post('/api/website/settings', { key: 'SMTP_SETTINGS', value: smtpForm }), {
        successMessage: 'SMTP settings updated successfully.',
        errorMessage: 'Failed to update SMTP settings.',
      });
    } catch {
      // handled by toast
    } finally {
      setIsUpdatingSetting(false);
    }
  };

  // ─── Profile Form ──────────────────────────────────────────────────────────

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', email: '' },
    mode: 'all',
  });

  useEffect(() => {
    if (currentUser) {
      profileForm.reset({ fullName: currentUser.fullName, email: currentUser.email });
    }
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const onProfileSubmit = async (values: ProfileFormData) => {
    if (!currentUser) return;
    setIsUpdating(true);
    try {
      await handlePromise(axios.patch(`/api/users/${currentUser.id}`, values), {
        successMessage: 'Profile updated successfully. Please refresh to see changes in the sidebar.',
        errorMessage: 'Failed to update profile.',
      });
      setCurrentUser((prev: any) => ({ ...prev, ...values }));
    } catch {
      // handled by toast
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setPendingAvatar(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveAvatar = async () => {
    if (!currentUser || !pendingAvatar) return;
    setIsSavingAvatar(true);
    try {
      await handlePromise(axios.patch(`/api/users/${currentUser.id}`, { profileImage: pendingAvatar }), {
        successMessage: 'Profile image updated successfully.',
        errorMessage: 'Failed to update profile image.',
      });
      setCurrentUser((prev: any) => ({ ...prev, profileImage: pendingAvatar }));
      setPendingAvatar(null);
    } catch {
      // handled by toast
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // ─── Password Form ─────────────────────────────────────────────────────────

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'all',
  });

  const onPasswordSubmit = async (values: PasswordFormData) => {
    if (!currentUser) return;
    setIsUpdating(true);
    try {
      await handlePromise(axios.patch(`/api/users/${currentUser.id}`, { newPassword: values.newPassword }), {
        successMessage: 'Password changed successfully. You may be logged out on next session.',
        errorMessage: 'Failed to update password.',
      });
      passwordForm.reset();
    } catch {
      // handled by toast
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── Role info ─────────────────────────────────────────────────────────────

  const roleInfo = currentUser ? ROLE_DESCRIPTIONS[currentUser.role] : null;
  const RoleIcon = roleInfo?.icon || Info;

  const newPassword = passwordForm.watch('newPassword');
  const confirmPassword = passwordForm.watch('confirmPassword');

  return (
    <AuthenticatedLayout>
      <Head title="Settings" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
            Account Settings
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Manage your personal profile, security credentials, and view system information.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left - Profile Summary Card */}
          <div className="lg:col-span-1 space-y-4">
            {/* Avatar Card */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center">
              <div className="relative group mb-3">
                <div className="h-20 w-20 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-2 border-cyan-500/30 rounded-full flex items-center justify-center text-cyan-400 text-2xl font-bold uppercase overflow-hidden">
                  {pendingAvatar || currentUser?.profileImage ? (
                    <img src={pendingAvatar || currentUser.profileImage} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    currentUser?.fullName?.slice(0, 2) || 'U'
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-slate-950/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="h-6 w-6 text-slate-200" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      handleAvatarSelect(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {pendingAvatar && (
                <div className="flex items-center gap-2 mb-3 -mt-1">
                  <button
                    type="button"
                    onClick={saveAvatar}
                    disabled={isSavingAvatar}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-[11px] font-bold rounded-lg shadow hover:shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSavingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAvatar(null)}
                    disabled={isSavingAvatar}
                    className="px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg transition-all cursor-pointer disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <p className="font-bold text-slate-200 text-sm">{currentUser?.fullName}</p>
              <p className="text-slate-500 text-xs mt-0.5">{currentUser?.email}</p>

              {roleInfo && (
                <div className={`mt-3 flex items-center gap-1.5 text-xs font-bold ${roleInfo.color}`}>
                  <RoleIcon className="h-3.5 w-3.5" />
                  {currentUser && ROLE_LABELS[currentUser.role]}
                </div>
              )}
            </div>

            {/* Role Permissions Card */}
            {roleInfo && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Your Permissions</p>
                <p className="text-xs text-slate-400 leading-relaxed">{roleInfo.desc}</p>
              </div>
            )}
          </div>

          {/* Right - Tabs + Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Tab Bar */}
            <div className="flex gap-1 bg-slate-900/50 border border-slate-800 rounded-xl p-1">
              {[
                { id: 'profile' as const, label: 'Profile', icon: User },
                { id: 'security' as const, label: 'Security', icon: Key },
                ...(isAdmin ? [{ id: 'smtp' as const, label: 'Email SMTP Config', icon: Settings }] : []),
                { id: 'about' as const, label: 'System Info', icon: Info },
              ].map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-slate-800 text-slate-100 shadow'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-5">
                  <User className="h-4 w-4 text-cyan-400" />
                  Personal Information
                </h2>

                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Full Name</label>
                    <input
                      type="text"
                      {...profileForm.register('fullName')}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-sm"
                    />
                    {profileForm.formState.errors.fullName && (
                      <p className="text-rose-400 text-[11px] mt-1">{profileForm.formState.errors.fullName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Email Address</label>
                    <input
                      type="email"
                      {...profileForm.register('email')}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-sm"
                    />
                    {profileForm.formState.errors.email && (
                      <p className="text-rose-400 text-[11px] mt-1">{profileForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">System Role</label>
                    <div className="px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-500 text-sm cursor-not-allowed">
                      {currentUser && ROLE_LABELS[currentUser.role]}{' '}
                      <span className="text-slate-600 text-[10px]">(managed by Admin)</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold rounded-xl shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Profile
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-5">
                  <Key className="h-4 w-4 text-cyan-400" />
                  Change Password
                </h2>

                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 6 characters"
                        {...passwordForm.register('newPassword')}
                        className="w-full px-3 py-2.5 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-rose-400 text-[11px] mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Confirm New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      {...passwordForm.register('confirmPassword')}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-sm"
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-rose-400 text-[11px] mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  {/* Password requirements */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-500 space-y-1">
                    <p className={`flex items-center gap-1.5 ${newPassword.length >= 6 ? 'text-emerald-400' : ''}`}>
                      <CheckCircle2 className="h-3 w-3" />
                      Minimum 6 characters
                    </p>
                    <p className={`flex items-center gap-1.5 ${newPassword === confirmPassword && confirmPassword ? 'text-emerald-400' : ''}`}>
                      <CheckCircle2 className="h-3 w-3" />
                      Passwords match
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold rounded-xl shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SMTP Config Tab */}
            {activeTab === 'smtp' && isAdmin && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-2">
                  <Settings className="h-4 w-4 text-cyan-400" />
                  Email SMTP Configuration
                </h2>
                <p className="text-slate-400 text-xs mb-6">
                  Configure the outgoing mail server settings used to send contact inquiries and notifications.
                </p>

                {isLoadingSettings ? (
                  <div className="flex justify-center p-10"><Loader2 className="animate-spin text-cyan-500 w-8 h-8" /></div>
                ) : (
                  <form onSubmit={onSmtpSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 text-xs font-semibold mb-2">SMTP Host</label>
                        <input
                          type="text"
                          value={smtpForm.host}
                          onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                          placeholder="e.g. smtp.gmail.com"
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-xs font-semibold mb-2">SMTP Port</label>
                        <input
                          type="number"
                          value={smtpForm.port}
                          onChange={(e) => setSmtpForm({ ...smtpForm, port: e.target.value })}
                          placeholder="e.g. 587"
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 text-xs font-semibold mb-2">SMTP User</label>
                        <input
                          type="text"
                          value={smtpForm.user}
                          onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                          placeholder="e.g. user@gmail.com"
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-xs font-semibold mb-2">SMTP Password</label>
                        <div className="relative">
                          <input
                            type={showSmtpPassword ? 'text' : 'password'}
                            value={smtpForm.pass}
                            onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                            placeholder="Your SMTP password"
                            className="w-full px-3 py-2.5 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-sm"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                          >
                            {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 text-xs font-semibold mb-2">From Email (Sender)</label>
                        <input
                          type="email"
                          value={smtpForm.fromEmail}
                          onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                          placeholder="e.g. no-reply@metaphoric.com"
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-xs font-semibold mb-2">Notification Recipient Email</label>
                        <input
                          type="email"
                          value={smtpForm.notificationEmail}
                          onChange={(e) => setSmtpForm({ ...smtpForm, notificationEmail: e.target.value })}
                          placeholder="e.g. info@metaphoric.com"
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        id="smtpSecure"
                        checked={smtpForm.secure}
                        onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500/30 focus:ring-opacity-25"
                      />
                      <label htmlFor="smtpSecure" className="text-slate-400 text-xs font-semibold cursor-pointer">
                        Use Secure SSL/TLS Connection (check if using port 465)
                      </label>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isUpdatingSetting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-bold rounded-xl shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
                      >
                        {isUpdatingSetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save SMTP Config
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* System Info Tab */}
            {activeTab === 'about' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-cyan-400" />
                  System Information
                </h2>

                <div className="space-y-3 text-xs">
                  {[
                    { label: 'System Name', value: 'CPMAS ERP — Construction Project Management & Accounting System' },
                    { label: 'Version', value: '1.0.0 — Production Build' },
                    { label: 'Tech Stack', value: 'Laravel, Inertia.js, React, TailwindCSS, PostgreSQL' },
                    { label: 'Authentication', value: 'Laravel session-based auth with HTTP-only cookies' },
                    { label: 'Access Control', value: '5-tier RBAC — Super Admin / Admin / Accountant / PM / Data Entry' },
                    { label: 'Current Session', value: `${currentUser?.fullName} — ${currentUser?.role && ROLE_LABELS[currentUser.role]}` },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl">
                      <span className="text-slate-500 font-bold uppercase tracking-wider min-w-36">{item.label}</span>
                      <span className="text-slate-300">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl text-xs text-slate-400">
                  <p className="font-bold text-cyan-400 mb-1.5 flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5" />
                    Security Notice
                  </p>
                  <p className="leading-relaxed">
                    All data transmissions are secured. Passwords are hashed using bcrypt (salt rounds: 12).
                    Sessions expire after 24 hours. Always log out after each session on shared devices.
                    Financial audit logs are maintained for all critical operations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
