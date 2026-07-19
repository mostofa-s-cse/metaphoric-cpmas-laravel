import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Modal } from '@/Components/ui/Modal';
import { AlertDialog } from '@/Components/ui/AlertDialog';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import { Select } from '@/Components/ui/Select';
import { ToastContainer } from '@/Components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';

import {
  Landmark, Plus, RefreshCw, TrendingUp, TrendingDown,
  Wallet, Building2, Smartphone, Edit2, SlidersHorizontal,
  AlertTriangle, CheckCircle2, ChevronRight, Eye,
} from 'lucide-react';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const accountSchema = z.object({
  name:           z.string().min(2, 'Name is required'),
  accountType:    z.enum(['BANK', 'CASH', 'MOBILE_BANKING']),
  accountNumber:  z.string().optional().or(z.literal('')),
  bankName:       z.string().optional().or(z.literal('')),
  openingBalance: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Must be ≥ 0'),
  notes:          z.string().max(500).optional().or(z.literal('')),
});

const adjustSchema = z.object({
  newBalance: z.string().refine(v => !isNaN(parseFloat(v)), 'Valid number required'),
  reason:     z.string().min(3, 'Reason is required'),
});

type AccountForm   = z.infer<typeof accountSchema>;
type AdjustForm    = z.infer<typeof adjustSchema>;

interface BankAccount {
  id: string;
  name: string;
  accountType: 'BANK' | 'CASH' | 'MOBILE_BANKING';
  accountNumber?: string;
  bankName?: string;
  openingBalance: number;
  currentBalance: number;
  totalIn: number;
  totalOut: number;
  notes?: string;
  isActive: boolean;
}

interface Summary {
  totalBalance: number;
  bankBalance:  number;
  cashBalance:  number;
  mobileBalance:number;
}

const fmt = (n: number) =>
  '৳ ' + n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  BANK:           Building2,
  CASH:           Wallet,
  MOBILE_BANKING: Smartphone,
};

const TYPE_COLOR: Record<string, string> = {
  BANK:           'from-blue-600 to-blue-700',
  CASH:           'from-emerald-600 to-emerald-700',
  MOBILE_BANKING: 'from-violet-600 to-violet-700',
};

export default function BankAccountsPage() {
  const { toasts, removeToast, success, error } = useToast();

  const [accounts, setAccounts]   = useState<BankAccount[]>([]);
  const [summary,  setSummary]    = useState<Summary | null>(null);
  const [loading,  setLoading]    = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal states
  const [isCreateOpen,   setIsCreateOpen]   = useState(false);
  const [isEditOpen,     setIsEditOpen]     = useState(false);
  const [isAdjustOpen,   setIsAdjustOpen]   = useState(false);
  const [isDetailOpen,   setIsDetailOpen]   = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selected, setSelected] = useState<BankAccount | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── Forms ──────────────────────────────────────────────────────────────────
  const createForm = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: '', accountType: 'BANK', openingBalance: '0', accountNumber: '', bankName: '', notes: '' },
  });

  const editForm = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
  });

  const adjustForm = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { newBalance: '', reason: '' },
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/bank-accounts', {
        params: typeFilter !== 'ALL' ? { type: typeFilter } : {},
      });
      if (res.data.status === 'success') {
        setAccounts(res.data.data.accounts);
        setSummary(res.data.data.summary);
      }
    } catch {
      error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, [typeFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const onCreateSubmit = async (values: AccountForm) => {
    setIsSaving(true);
    try {
      await axios.post('/api/bank-accounts', {
        ...values,
        openingBalance: parseFloat(values.openingBalance),
      });
      success('Account created successfully');
      setIsCreateOpen(false);
      createForm.reset();
      fetchAccounts();
    } catch (e: any) {
      error(e.response?.data?.message || 'Failed to create account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditOpen = (acc: BankAccount) => {
    setSelected(acc);
    editForm.reset({
      name:          acc.name,
      accountType:   acc.accountType,
      accountNumber: acc.accountNumber || '',
      bankName:      acc.bankName || '',
      openingBalance: String(acc.openingBalance),
      notes:         acc.notes || '',
    });
    setIsEditOpen(true);
  };

  const onEditSubmit = async (values: AccountForm) => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await axios.patch(`/api/bank-accounts/${selected.id}`, {
        name:          values.name,
        accountNumber: values.accountNumber,
        bankName:      values.bankName,
        notes:         values.notes,
      });
      success('Account updated');
      setIsEditOpen(false);
      fetchAccounts();
    } catch (e: any) {
      error(e.response?.data?.message || 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustOpen = (acc: BankAccount) => {
    setSelected(acc);
    adjustForm.reset({ newBalance: String(acc.currentBalance), reason: '' });
    setIsAdjustOpen(true);
  };

  const onAdjustSubmit = async (values: AdjustForm) => {
    if (!selected) return;
    setIsSaving(true);
    try {
      const res = await axios.post(`/api/bank-accounts/${selected.id}/adjust`, {
        newBalance: parseFloat(values.newBalance),
        reason:     values.reason,
      });
      const adj = res.data.data.adjustment;
      success(`Balance adjusted: ${fmt(adj.before)} → ${fmt(adj.after)}`);
      setIsAdjustOpen(false);
      fetchAccounts();
    } catch (e: any) {
      error(e.response?.data?.message || 'Failed to adjust balance');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReconcile = async (acc: BankAccount) => {
    try {
      await axios.post(`/api/bank-accounts/${acc.id}/reconcile`);
      success('Account reconciled from raw ledger');
      fetchAccounts();
    } catch (e: any) {
      error(e.response?.data?.message || 'Reconcile failed');
    }
  };

  const handleDeactivate = async () => {
    if (!selected) return;
    try {
      await axios.delete(`/api/bank-accounts/${selected.id}`);
      success('Account deactivated');
      setIsDeactivateOpen(false);
      fetchAccounts();
    } catch (e: any) {
      error(e.response?.data?.message || 'Failed');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const active   = accounts.filter(a => a.isActive);
  const inactive = accounts.filter(a => !a.isActive);

  return (
    <AuthenticatedLayout>
      <Head title="Bank Accounts" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex-1 space-y-6">

        {/* Header */}
        <div className="flex flex-col items-start md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 flex items-center gap-2">
              <Landmark className="h-6 w-6 text-cyan-400" />
              Bank Accounts
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Manually maintained bank and cash balances
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} icon={<Plus className="w-4 h-4" />}>
            Add Account
          </Button>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Balance',   value: summary.totalBalance,  color: 'from-slate-800 to-slate-900',    icon: Landmark },
              { label: 'Bank',            value: summary.bankBalance,   color: 'from-blue-600/20 to-blue-700/10', border: 'border-blue-500/20', icon: Building2 },
              { label: 'Cash',            value: summary.cashBalance,   color: 'from-emerald-600/20 to-emerald-700/10', border: 'border-emerald-500/20', icon: Wallet },
              { label: 'Mobile Banking',  value: summary.mobileBalance, color: 'from-purple-600/20 to-purple-700/10', border: 'border-purple-500/20', icon: Smartphone },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} border ${card.border || 'border-slate-800'} rounded-2xl p-4 text-slate-100 shadow-xl`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{card.label}</span>
                    <Icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-lg font-bold font-mono">{fmt(card.value)}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'BANK', 'CASH', 'MOBILE_BANKING'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all border ${
                typeFilter === t
                  ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {t === 'ALL' ? 'All' : t === 'MOBILE_BANKING' ? 'Mobile Banking' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Important notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-200/90 leading-relaxed">
            <strong className="text-amber-400 font-bold">Office expenses</strong> (Rent, Utilities, Transport, Fuel, Equipment, Salary, Labour) are always drawn from the <strong className="text-amber-400 font-bold">global company pool</strong> — they never deduct from a project's own balance, even if a project is tagged on the expense.
          </div>
        </div>

        {/* Account cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-cyan-400 mb-2" />
            <p className="text-slate-500 text-xs">Loading accounts...</p>
          </div>
        ) : active.length === 0 ? (
          <div className="h-64 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4">
            <Landmark className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-slate-400 text-sm font-semibold">No accounts found</p>
            <p className="text-slate-600 text-xs mt-1">Add your first bank or cash account to start tracking balances.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {active.map(acc => {
              const Icon = TYPE_ICON[acc.accountType] || Building2;
              const grad = acc.accountType === 'BANK'
                ? 'from-blue-500/10 to-indigo-500/5 border-b border-blue-500/20'
                : acc.accountType === 'CASH'
                ? 'from-emerald-500/10 to-teal-500/5 border-b border-emerald-500/20'
                : 'from-purple-500/10 to-fuchsia-500/5 border-b border-purple-500/20';

              const isLow = acc.currentBalance < 0;

              return (
                <div
                  key={acc.id}
                  className="bg-slate-900/25 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden hover:border-slate-700/80 transition-all duration-300 group"
                >
                  {/* Card header */}
                  <div className={`bg-gradient-to-r ${grad} px-5 py-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-950/40 rounded-lg flex items-center justify-center border border-slate-800">
                          <Icon className="w-4 h-4 text-slate-300" />
                        </div>
                        <div>
                          <p className="text-slate-100 font-bold text-sm leading-tight group-hover:text-cyan-400 transition-colors">{acc.name}</p>
                          {acc.bankName && <p className="text-slate-400 text-[10px] mt-0.5">{acc.bankName}</p>}
                          {acc.accountNumber && <p className="text-slate-500 text-[10px] font-mono mt-0.5">{acc.accountNumber}</p>}
                        </div>
                      </div>
                      {isLow && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="mt-4">
                      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Current Balance</p>
                      <p className={`text-xl font-bold font-mono mt-1 ${isLow ? 'text-amber-500' : 'text-slate-100'}`}>
                        {fmt(acc.currentBalance)}
                      </p>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="px-5 py-4 space-y-3 bg-slate-950/20">
                    <div className="flex justify-between text-xs">
                      <div className="flex items-center gap-1 text-emerald-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="font-semibold font-mono">{fmt(acc.totalIn)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-rose-400">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span className="font-semibold font-mono">{fmt(acc.totalOut)}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Opening Balance: {fmt(acc.openingBalance)}</div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t border-slate-800/40">
                      <button
                        onClick={() => handleAdjustOpen(acc)}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 transition-all cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust
                      </button>
                      <button
                        onClick={() => handleEditOpen(acc)}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleReconcile(acc)}
                        title="Recompute from raw ledger"
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inactive accounts */}
        {inactive.length > 0 && (
          <div className="mt-6 border-t border-slate-800/60 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Deactivated Accounts ({inactive.length})</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {inactive.map(acc => (
                <div key={acc.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/10 opacity-50">
                  <span className="text-xs font-medium text-slate-400">{acc.name}</span>
                  <span className="text-xs font-bold font-mono text-slate-400">{fmt(acc.currentBalance)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Create Account Modal ─────────────────────────────────────────── */}
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Bank / Cash Account" size="md">
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">Account Name *</label>
              <Input {...createForm.register('name')} placeholder="e.g. Dutch-Bangla Bank – Main" />
              {createForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Account Type *</label>
              <Controller
                control={createForm.control}
                name="accountType"
                render={({ field }) => (
                  <Select {...field} options={[
                    { value: 'BANK',           label: 'Bank Account' },
                    { value: 'CASH',           label: 'Cash / Petty Cash' },
                    { value: 'MOBILE_BANKING', label: 'Mobile Banking' },
                  ]} />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Opening Balance (৳) *</label>
              <Input {...createForm.register('openingBalance')} type="number" step="0.01" placeholder="0.00" />
              {createForm.formState.errors.openingBalance && <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.openingBalance.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Bank Name</label>
              <Input {...createForm.register('bankName')} placeholder="e.g. Dutch-Bangla Bank" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Account / Wallet No.</label>
              <Input {...createForm.register('accountNumber')} placeholder="Account number" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
              <Input {...createForm.register('notes')} placeholder="Optional notes" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Create Account'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Account Modal ───────────────────────────────────────────── */}
      <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Account" size="md">
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">Account Name *</label>
              <Input {...editForm.register('name')} />
              {editForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Bank Name</label>
              <Input {...editForm.register('bankName')} placeholder="Bank name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Account / Wallet No.</label>
              <Input {...editForm.register('accountNumber')} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
              <Input {...editForm.register('notes')} />
            </div>
          </div>
          <p className="text-xs text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            To change the opening balance, use the <strong>Adjust Balance</strong> action instead.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Manual Balance Adjustment Modal ─────────────────────────────── */}
      <Modal open={isAdjustOpen} onClose={() => setIsAdjustOpen(false)} title="Manual Balance Adjustment" size="sm">
        {selected && (
          <form onSubmit={adjustForm.handleSubmit(onAdjustSubmit)} className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-sm">
              <p className="text-slate-400">Current balance of <strong>{selected.name}</strong></p>
              <p className="text-2xl font-bold text-slate-100 mt-1">{fmt(selected.currentBalance)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">New Actual Balance (৳) *</label>
              <Input
                {...adjustForm.register('newBalance')}
                type="number"
                step="0.01"
                placeholder="Enter the real balance you see"
              />
              {adjustForm.formState.errors.newBalance && <p className="text-red-500 text-xs mt-1">{adjustForm.formState.errors.newBalance.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Reason for Adjustment *</label>
              <Input
                {...adjustForm.register('reason')}
                placeholder="e.g. Bank statement reconciliation, Correction of entry"
              />
              {adjustForm.formState.errors.reason && <p className="text-red-500 text-xs mt-1">{adjustForm.formState.errors.reason.message}</p>}
            </div>

            <p className="text-xs text-slate-500">
              This adjustment will be recorded in the Balance Ledger for audit purposes.
            </p>

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setIsAdjustOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Adjusting…' : 'Apply Adjustment'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </AuthenticatedLayout>
  );
}
