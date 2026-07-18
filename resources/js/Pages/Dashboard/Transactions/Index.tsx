import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { DatePickerInput } from '@/Components/ui/DatePickerInput';
import { Modal } from '@/Components/ui/Modal';
import { AlertDialog } from '@/Components/ui/AlertDialog';
import { Pagination } from '@/Components/ui/Pagination';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import { Select } from '@/Components/ui/Select';
import { ToastContainer } from '@/Components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { useResourceList } from '@/hooks/useResourceList';
import { useCrudMutations } from '@/hooks/useCrudMutations';

import {
  ArrowUpDown, Plus, Search, ArrowUpRight, ArrowDownRight, DollarSign, Calendar, X, Loader2, Trash2
} from 'lucide-react';

const paymentMethodEnum = z.enum(['CASH', 'BANK', 'CHEQUE', 'MOBILE_BANKING']);

const cashInSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  projectId: z.string().optional().or(z.literal('')),
  clientName: z.string().min(2, 'Client name is required'),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
    message: 'Amount must be positive',
  }),
  paymentMethod: paymentMethodEnum,
  bankOrCash: z.string().min(1, 'Account/Cash name is required'),
  referenceNumber: z.string().optional().or(z.literal('')),
  source: z.string().min(1, 'Source is required'),
  notes: z.string().max(500).optional().or(z.literal('')),
});

const cashOutSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  projectId: z.string().optional().or(z.literal('')),
  expenseCategory: z.string().min(1, 'Category is required'),
  paidTo: z.string().min(2, 'Paid to is required'),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
    message: 'Amount must be positive',
  }),
  paymentMethod: paymentMethodEnum,
  referenceNumber: z.string().optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  vendorId: z.string().optional().or(z.literal('')),
  supplierId: z.string().optional().or(z.literal('')),
});

type CashInFormValues = z.infer<typeof cashInSchema>;
type CashOutFormValues = z.infer<typeof cashOutSchema>;

interface ApiCashIn {
  id: string;
  date: string;
  clientName: string;
  amount: number;
  paymentMethod: string;
  bankOrCash: string;
  source: string;
  referenceNumber?: string;
  notes?: string;
  project?: {
    id: string;
    name: string;
    code: string;
  };
}

interface ApiCashOut {
  id: string;
  date: string;
  paidTo: string;
  amount: number;
  paymentMethod: string;
  expenseCategory: string;
  referenceNumber?: string;
  notes?: string;
  project?: {
    id: string;
    name: string;
    code: string;
  };
}

interface TransactionSummary {
  cashIn: { total: number; byMode: Record<string, number> };
  cashOut: { total: number; byMode: Record<string, number> };
  net: number;
  mainBalance?: { allocated: number; available: number };
  projectBalance?: { allocated: number; available: number };
}

export default function TransactionsPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;
  const { toasts, removeToast, success, error, handlePromise } = useToast();

  const [activeTab, setActiveTab] = useState<'cashin' | 'cashout'>('cashin');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [summary, setSummary] = useState<TransactionSummary | null>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{ id: string; type: 'in' | 'out' } | null>(null);

  // Data states
  const [projects, setProjects] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Fetch + pagination state for the active tab's cash ledger. The endpoint and
  // listKey switch with the tab, since Cash In/Out are separate list endpoints.
  const cashEndpoint = activeTab === 'cashin' ? '/api/transactions/cash-in' : '/api/transactions/cash-out';
  const cashListKey = activeTab === 'cashin' ? 'cashIns' : 'cashOuts';

  const {
    items: cashItems, totalItems, isFetching, fetchError, refetch: fetchCashTransactions,
    page, setPage, limit, setLimit, searchTerm, setSearchTerm,
  } = useResourceList<ApiCashIn | ApiCashOut>(cashEndpoint, {
    listKey: cashListKey,
    filters: { projectId: projectFilter !== 'ALL' ? projectFilter : undefined },
  });

  // Only one of these is ever populated at a time (mirrors the previous per-tab
  // state); every JSX usage below already gates on `activeTab`.
  const cashIns = activeTab === 'cashin' ? (cashItems as ApiCashIn[]) : [];
  const cashOuts = activeTab === 'cashout' ? (cashItems as ApiCashOut[]) : [];

  // Processing states
  const [isCreatingCashIn, setIsCreatingCashIn] = useState(false);
  const [isCreatingCashOut, setIsCreatingCashOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals state
  const [isCashInModalOpen, setIsCashInModalOpen] = useState(false);
  const [isCashOutModalOpen, setIsCashOutModalOpen] = useState(false);

  // React Hook Form for Cash In
  const {
    register: registerCashIn,
    handleSubmit: handleSubmitCashIn,
    reset: resetCashIn,
    control: controlCashIn,
    formState: { errors: cashInErrors },
  } = useForm<CashInFormValues>({
    resolver: zodResolver(cashInSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      projectId: '',
      clientName: '',
      amount: '',
      paymentMethod: 'CASH',
      bankOrCash: '',
      source: 'CLIENT_PAYMENT',
      referenceNumber: '',
      notes: '',
    },
    mode: 'all',
  });

  // React Hook Form for Cash Out
  const {
    register: registerCashOut,
    handleSubmit: handleSubmitCashOut,
    reset: resetCashOut,
    control: controlCashOut,
    watch: watchCashOut,
    setValue: setCashOutValue,
    formState: { errors: cashOutErrors },
  } = useForm<CashOutFormValues>({
    resolver: zodResolver(cashOutSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      projectId: '',
      expenseCategory: 'MATERIALS',
      paidTo: '',
      amount: '',
      paymentMethod: 'CASH',
      referenceNumber: '',
      notes: '',
      vendorId: '',
      supplierId: '',
    },
    mode: 'all',
  });

  const expenseCategory = watchCashOut('expenseCategory');
  const cashOutProjectId = watchCashOut('projectId');

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      if (res.data.status === 'success') {
        setProjects(res.data.data.projects || []);
      }
    } catch (err) {
      // ignore
    }
  };

  const fetchVendors = async (projectId?: string) => {
    try {
      const res = await axios.get('/api/vendors/list', {
        params: projectId && projectId !== 'GENERAL' ? { projectId } : undefined,
      });
      if (res.data.status === 'success') {
        setVendors(res.data.data.vendors || []);
      }
    } catch (err) {
      // ignore
    }
  };

  const fetchSuppliers = async (projectId?: string) => {
    try {
      const res = await axios.get('/api/suppliers/list', {
        params: projectId && projectId !== 'GENERAL' ? { projectId } : undefined,
      });
      if (res.data.status === 'success') {
        setSuppliers(res.data.data.suppliers || []);
      }
    } catch (err) {
      // ignore
    }
  };

  // Vendor/supplier picks are project-scoped assignments, so the dropdown
  // must be re-fetched (and cleared) whenever the linked project changes —
  // otherwise a partner not assigned to the selected project could be picked
  // and its per-project due/paid balance would never sync.
  useEffect(() => {
    fetchVendors(cashOutProjectId);
    fetchSuppliers(cashOutProjectId);
    setCashOutValue('vendorId', '');
    setCashOutValue('supplierId', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashOutProjectId]);

  const fetchSummary = async () => {
    try {
      const res = await axios.get('/api/transactions/summary', {
        params: {
          projectId: projectFilter !== 'ALL' ? projectFilter : undefined,
        }
      });
      if (res.data.status === 'success') {
        setSummary(res.data.data.summary);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [projectFilter]);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Every mutation needs to refresh both the ledger list and the summary tiles.
  const refetchCashData = () => {
    fetchCashTransactions();
    fetchSummary();
  };

  const { create: createCashIn, remove: removeCashIn } =
    useCrudMutations('/api/transactions/cash-in', handlePromise, refetchCashData);
  const { create: createCashOut, remove: removeCashOut } =
    useCrudMutations('/api/transactions/cash-out', handlePromise, refetchCashData);

  const handleOpenCashIn = () => {
    resetCashIn({
      date: new Date().toISOString().split('T')[0],
      projectId: '',
      clientName: '',
      amount: '',
      paymentMethod: 'CASH',
      bankOrCash: '',
      source: 'CLIENT_PAYMENT',
      referenceNumber: '',
      notes: '',
    });
    setIsCashInModalOpen(true);
  };

  const handleOpenCashOut = () => {
    resetCashOut({
      date: new Date().toISOString().split('T')[0],
      projectId: '',
      expenseCategory: 'MATERIALS',
      paidTo: '',
      amount: '',
      paymentMethod: 'CASH',
      referenceNumber: '',
      notes: '',
      vendorId: '',
      supplierId: '',
    });
    setIsCashOutModalOpen(true);
  };

  const onCashInSubmit = async (values: CashInFormValues) => {
    setIsCreatingCashIn(true);
    try {
      const payload = {
        ...values,
        amount: parseFloat(values.amount),
        projectId: values.projectId === 'GENERAL' || values.projectId === '' ? null : values.projectId,
      };
      await createCashIn(payload, 'Cash In transaction logged successfully');
      setIsCashInModalOpen(false);
    } catch (err) {
      // ignore
    } finally {
      setIsCreatingCashIn(false);
    }
  };

  const onCashOutSubmit = async (values: CashOutFormValues) => {
    setIsCreatingCashOut(true);
    try {
      const payload = {
        ...values,
        amount: parseFloat(values.amount),
        projectId: values.projectId === 'GENERAL' || values.projectId === '' ? null : values.projectId,
        vendorId: values.expenseCategory === 'VENDOR_PAYMENT' && values.vendorId ? values.vendorId : null,
        supplierId: values.expenseCategory === 'SUPPLIER_PAYMENT' && values.supplierId ? values.supplierId : null,
      };
      await createCashOut(payload, 'Cash Out transaction logged successfully');
      setIsCashOutModalOpen(false);
    } catch (err) {
      // ignore
    } finally {
      setIsCreatingCashOut(false);
    }
  };

  const handleDeleteClick = (id: string, type: 'in' | 'out') => {
    setTransactionToDelete({ id, type });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    try {
      if (transactionToDelete.type === 'in') {
        await removeCashIn(transactionToDelete.id, 'Transaction deleted successfully');
      } else {
        await removeCashOut(transactionToDelete.id, 'Transaction deleted successfully');
      }
      setDeleteConfirmOpen(false);
      setTransactionToDelete(null);
    } catch (err) {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <AuthenticatedLayout>
      <Head title="Financial Ledger" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-350 flex items-center gap-2">
              <ArrowUpDown className="h-5.5 w-5.5 text-cyan-400" />
              Financial Ledger
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Log raw client mobilization collections and general corporate cash overhead outflows
            </p>
          </div>

          {user && user.role !== 'PROJECT_MANAGER' && (
            <div className="flex gap-2">
              <Button
                onClick={handleOpenCashIn}
                icon={<Plus className="h-4 w-4" />}
              >
                Record Cash In
              </Button>
              <Button
                onClick={handleOpenCashOut}
                variant="secondary"
                icon={<Plus className="h-4 w-4" />}
              >
                Record Cash Out
              </Button>
            </div>
          )}
        </div>

        {/* Project Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Select
            value={projectFilter}
            onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
            className="sm:w-[280px]"
          >
            <option value="ALL" className="bg-slate-900 text-slate-200">All Projects</option>
            <option value="GENERAL" className="bg-slate-900 text-slate-200">General Corporate (No Project)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                {p.code} - {p.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Cash Flow Summary */}
        {summary && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
                <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Cash In</span>
                <span className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                  <ArrowUpRight className="h-4 w-4" />
                  {formatCurrencyLocal(summary.cashIn.total)}
                </span>
              </div>
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
                <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Cash Out</span>
                <span className="text-base font-bold text-rose-400 flex items-center gap-1.5">
                  <ArrowDownRight className="h-4 w-4" />
                  {formatCurrencyLocal(summary.cashOut.total)}
                </span>
              </div>
              <div className="p-4 bg-slate-950/40 border border-cyan-500/20 rounded-xl">
                <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Net</span>
                <span className={`text-base font-bold ${summary.net >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {formatCurrencyLocal(summary.net)}
                </span>
              </div>
              {summary.mainBalance && (
                <div className="p-4 bg-slate-950/40 border border-amber-500/20 rounded-xl">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Main Balance Available</span>
                  <span className={`text-base font-bold ${summary.mainBalance.available >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {formatCurrencyLocal(summary.mainBalance.available)}
                  </span>
                  <span className="block text-[10px] text-slate-600 mt-0.5">
                    of {formatCurrencyLocal(summary.mainBalance.allocated)} total paid-in
                  </span>
                </div>
              )}
              {summary.projectBalance && (
                <div className="p-4 bg-slate-950/40 border border-amber-500/20 rounded-xl">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Project Balance Available</span>
                  <span className={`text-base font-bold ${summary.projectBalance.available >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {formatCurrencyLocal(summary.projectBalance.available)}
                  </span>
                  <span className="block text-[10px] text-slate-600 mt-0.5">
                    of {formatCurrencyLocal(summary.projectBalance.allocated)} paid-in for this project
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800/60">
              {(['CASH', 'BANK', 'CHEQUE', 'MOBILE_BANKING'] as const).map((mode) => (
                <div key={mode} className="p-2.5 bg-slate-950/30 border border-slate-800 rounded-lg text-[10px]">
                  <span className="block text-slate-500 font-bold uppercase tracking-wide mb-1">{mode.replace('_', ' ')}</span>
                  <span className="block text-emerald-400 font-semibold">
                    +{formatCurrencyLocal(summary.cashIn.byMode[mode] || 0)}
                  </span>
                  <span className="block text-rose-400 font-semibold">
                    -{formatCurrencyLocal(summary.cashOut.byMode[mode] || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => {
              setActiveTab('cashin');
              setSearchTerm('');
            }}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'cashin'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Collections / Cash In
          </button>
          <button
            onClick={() => {
              setActiveTab('cashout');
              setSearchTerm('');
            }}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'cashout'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Expenses / Cash Out
          </button>
        </div>

        {/* Filters */}
        <Input
          placeholder={
            activeTab === 'cashin'
              ? 'Search client collections by name or source...'
              : 'Search expenses by category or beneficiary...'
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search className="h-4 w-4" />}
        />

        {/* Ledger Table */}
        {isFetching && (activeTab === 'cashin' ? cashIns.length === 0 : cashOuts.length === 0) ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
            <span className="text-slate-500 text-xs font-semibold">Loading ledger logs...</span>
          </div>
        ) : fetchError ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-6">
            <ArrowUpDown className="h-10 w-10 text-rose-500 mb-3" />
            <p className="text-slate-355 text-sm font-semibold">Failed to fetch ledger transactions</p>
            <p className="text-slate-500 text-xs mt-1">Please try refreshing the page.</p>
          </div>
        ) : (activeTab === 'cashin' ? cashIns.length === 0 : cashOuts.length === 0) ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4">
            <ArrowUpDown className="h-12 w-12 text-slate-800 mb-3" />
            <p className="text-slate-400 text-sm font-bold">No ledger transactions registered</p>
            <p className="text-slate-600 text-xs mt-1 max-w-xs mx-auto">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Create a cash transaction to build project cash flow logs.'}
            </p>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/20 backdrop-blur-md">
            <div className="overflow-x-auto">
              {activeTab === 'cashin' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <th className="p-4">Date</th>
                      <th className="p-4">Paid By (Client)</th>
                      <th className="p-4">Source Category</th>
                      <th className="p-4">Deposit To (Bank/Cash)</th>
                      <th className="p-4">Linked Project</th>
                      <th className="p-4 text-right">Amount</th>
                      {user?.role === 'SUPER_ADMIN' && <th className="p-4 text-right">Delete</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {cashIns.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 text-slate-550 font-mono text-[10px]">
                          {new Date(t.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-semibold text-slate-200">
                          <div>{t.clientName}</div>
                          {t.referenceNumber && (
                            <span className="text-[9px] text-slate-500 font-mono">Ref: {t.referenceNumber}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-400 border border-cyan-500/10 font-bold uppercase font-mono tracking-wide">
                            {t.source?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">
                          {t.bankOrCash}{' '}
                          <span className="text-[10px] text-slate-650 block mt-0.5 font-semibold">
                            via {t.paymentMethod}
                          </span>
                        </td>
                        <td className="p-4 text-slate-350">{t.project?.name || 'General Income'}</td>
                        <td className="p-4 text-right font-bold text-emerald-450">
                          +{formatCurrencyLocal(t.amount)}
                        </td>
                        {user?.role === 'SUPER_ADMIN' && (
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDeleteClick(t.id, 'in')}
                              className="p-1.5 text-slate-400 hover:text-rose-450 hover:bg-rose-500/5 rounded-lg border border-transparent hover:border-rose-500/10 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <th className="p-4">Date</th>
                      <th className="p-4">Paid To (Beneficiary)</th>
                      <th className="p-4">Expense Category</th>
                      <th className="p-4">Payment Method</th>
                      <th className="p-4">Linked Project</th>
                      <th className="p-4 text-right">Amount</th>
                      {user?.role === 'SUPER_ADMIN' && <th className="p-4 text-right">Delete</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {cashOuts.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 text-slate-550 font-mono text-[10px]">
                          {new Date(t.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-semibold text-slate-200">
                          <div>{t.paidTo}</div>
                          {t.referenceNumber && (
                            <span className="text-[9px] text-slate-500 font-mono">Ref: {t.referenceNumber}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-rose-400 border border-rose-550/10 font-bold uppercase font-mono tracking-wide">
                            {t.expenseCategory?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">
                          via {t.paymentMethod}
                        </td>
                        <td className="p-4 text-slate-350">{t.project?.name || 'Office Overhead'}</td>
                        <td className="p-4 text-right font-bold text-rose-400">
                          -{formatCurrencyLocal(t.amount)}
                        </td>
                        {user?.role === 'SUPER_ADMIN' && (
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDeleteClick(t.id, 'out')}
                              className="p-1.5 text-slate-400 hover:text-rose-455 hover:bg-rose-500/5 rounded-lg border border-transparent hover:border-rose-500/10 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(totalItems / limit)}
              totalItems={totalItems}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(l) => { setLimit(l); setPage(1); }}
            />
          </div>
        )}

        {/* Modal: Cash In Form */}
        <Modal
          open={isCashInModalOpen}
          onClose={() => setIsCashInModalOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4.5 w-4.5 text-emerald-400" />
              Record Cash Mobilization (Collection)
            </div>
          }
          size="lg"
        >
          <form onSubmit={handleSubmitCashIn(onCashInSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Collection Date</label>
                <Controller
                  name="date"
                  control={controlCashIn}
                  render={({ field }) => (
                    <DatePickerInput
                      id="cashInDate"
                      value={field.value}
                      onChange={field.onChange}
                      error={!!cashInErrors.date}
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Paid By (Client Name)</label>
                <Input
                  {...registerCashIn('clientName')}
                  placeholder="e.g. Vertex Devs Ltd"
                  error={cashInErrors.clientName?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Mobilized Amount ($)</label>
                <Input
                  {...registerCashIn('amount')}
                  placeholder="e.g. 50000"
                  error={cashInErrors.amount?.message}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Cash / Deposit Account</label>
                <Input
                  {...registerCashIn('bankOrCash')}
                  placeholder="e.g. Chase Bank Checking A/C"
                  error={cashInErrors.bankOrCash?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Payment Mode</label>
                <Select
                  {...registerCashIn('paymentMethod')}
                  error={cashInErrors.paymentMethod?.message}
                >
                  <option value="BANK" className="bg-slate-900 text-slate-200">Bank Wire</option>
                  <option value="CHEQUE" className="bg-slate-900 text-slate-200">Cheque</option>
                  <option value="CASH" className="bg-slate-900 text-slate-200">Cash in Hand</option>
                  <option value="MOBILE_BANKING" className="bg-slate-900 text-slate-200">Mobile Banking</option>
                </Select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Income Source</label>
                <Select
                  {...registerCashIn('source')}
                  error={cashInErrors.source?.message}
                >
                  <option value="SIGNING_AGREEMENT" className="bg-slate-900 text-slate-200">Signing Agreement</option>
                  <option value="MATERIAL_PREPS" className="bg-slate-900 text-slate-200">Material Purpose</option>
                  <option value="LABER_PREPS" className="bg-slate-900 text-slate-200">Labor Purpose</option>
                  <option value="RUNNING_BILL" className="bg-slate-900 text-slate-200">Running Bill</option>
                  <option value="FINAL_BILL" className="bg-slate-900 text-slate-200">Final Bill</option>
                  <option value="CLIENT_PAYMENT" className="bg-slate-900 text-slate-200">Client Progress Invoice</option>
                  <option value="ADVANCE_PAYMENT" className="bg-slate-900 text-slate-200">Project Mobilization Advance</option>
                  <option value="INSTALLMENT" className="bg-slate-900 text-slate-200">Periodic Installment</option>
                  <option value="OTHER_INCOME" className="bg-slate-900 text-slate-200">Other Miscellaneous Income</option>
                </Select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Linked Project</label>
                <Select
                  {...registerCashIn('projectId')}
                  error={cashInErrors.projectId?.message}
                >
                  <option value="" disabled className="bg-slate-900 text-slate-200">Select Project...</option>
                  <option value="GENERAL" className="bg-slate-900 text-slate-200">General Corporate (No project)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                      {p.code} - {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Reference # (Check/Txn ID)</label>
              <Input
                {...registerCashIn('referenceNumber')}
                placeholder="e.g. CHQ-9281-Chase"
                error={cashInErrors.referenceNumber?.message}
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Ledger Notes</label>
              <textarea
                rows={2}
                {...registerCashIn('notes')}
                placeholder="Enter deposit transaction details..."
                className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 text-xs transition-all placeholder:text-slate-650"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCashInModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isCreatingCashIn}
              >
                Log Income
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Cash Out Form */}
        <Modal
          open={isCashOutModalOpen}
          onClose={() => setIsCashOutModalOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4.5 w-4.5 text-rose-400" />
              Record Cash Disbursed (Expense)
            </div>
          }
          size="lg"
        >
          <form onSubmit={handleSubmitCashOut(onCashOutSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Payment Date</label>
                <Controller
                  name="date"
                  control={controlCashOut}
                  render={({ field }) => (
                    <DatePickerInput
                      id="cashOutDate"
                      value={field.value}
                      onChange={field.onChange}
                      error={!!cashOutErrors.date}
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Paid To (Beneficiary)</label>
                <Input
                  {...registerCashOut('paidTo')}
                  placeholder="e.g. John Materials Supplier"
                  error={cashOutErrors.paidTo?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Disbursed Amount ($)</label>
                <Input
                  {...registerCashOut('amount')}
                  placeholder="e.g. 1500"
                  error={cashOutErrors.amount?.message}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Payment Mode</label>
                <Select
                  {...registerCashOut('paymentMethod')}
                  error={cashOutErrors.paymentMethod?.message}
                >
                  <option value="BANK" className="bg-slate-900 text-slate-200">Bank Transfer</option>
                  <option value="CHEQUE" className="bg-slate-900 text-slate-200">Cheque payment</option>
                  <option value="CASH" className="bg-slate-900 text-slate-200">Cash Disbursed</option>
                  <option value="MOBILE_BANKING" className="bg-slate-900 text-slate-200">Mobile Banking</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Cost Center Category</label>
                <Select
                  {...registerCashOut('expenseCategory')}
                  error={cashOutErrors.expenseCategory?.message}
                >
                  <option value="SIGNING_AGREEMENT" className="bg-slate-900 text-slate-200">Signing Agreement</option>
                  <option value="MATERIAL_PREPS" className="bg-slate-900 text-slate-200">Material Purpose</option>
                  <option value="LABER_PREPS" className="bg-slate-900 text-slate-200">Labor Purpose</option>
                  <option value="RUNNING_BILL" className="bg-slate-900 text-slate-200">Running Bill</option>
                  <option value="FINAL_BILL" className="bg-slate-900 text-slate-200">Final Bill</option>
                  <option value="MATERIALS" className="bg-slate-900 text-slate-200">Raw Materials Purchase</option>
                  <option value="LABOR" className="bg-slate-900 text-slate-200">Site Labor Daily Wages</option>
                  <option value="VENDOR_PAYMENT" className="bg-slate-900 text-slate-200">Vendor Payment Milestone</option>
                  <option value="SUPPLIER_PAYMENT" className="bg-slate-900 text-slate-200">Supplier Payment Milestone</option>
                  <option value="EMPLOYEE_SALARY" className="bg-slate-900 text-slate-200">Employee Salary</option>
                  <option value="OFFICE_RENT" className="bg-slate-900 text-slate-200">Office Rent</option>
                  <option value="UTILITIES" className="bg-slate-900 text-slate-200">Electricity &amp; Internet Utilities</option>
                  <option value="TRANSPORTATION" className="bg-slate-900 text-slate-200">Transportation</option>
                  <option value="FUEL" className="bg-slate-900 text-slate-200">Fuel</option>
                  <option value="EQUIPMENT_RENTAL" className="bg-slate-900 text-slate-200">Heavy Crane/Equipment Rental</option>
                  <option value="MISCELLANEOUS" className="bg-slate-900 text-slate-200">Miscellaneous / Petty Cash</option>
                </Select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Linked Project</label>
                <Select
                  {...registerCashOut('projectId')}
                  error={cashOutErrors.projectId?.message}
                >
                  <option value="" disabled className="bg-slate-900 text-slate-200">Select Project...</option>
                  <option value="GENERAL" className="bg-slate-900 text-slate-200">General Overhead (No project)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                      {p.code} - {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {expenseCategory === 'VENDOR_PAYMENT' && (
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Vendor</label>
                <Select
                  {...registerCashOut('vendorId')}
                  error={cashOutErrors.vendorId?.message}
                >
                  <option value="" className="bg-slate-900 text-slate-200">Select a vendor...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                      {v.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {expenseCategory === 'SUPPLIER_PAYMENT' && (
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Supplier</label>
                <Select
                  {...registerCashOut('supplierId')}
                  error={cashOutErrors.supplierId?.message}
                >
                  <option value="" className="bg-slate-900 text-slate-200">Select a supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Reference # (Check/Txn ID)</label>
              <Input
                {...registerCashOut('referenceNumber')}
                placeholder="e.g. TXN-8192-Chase"
                error={cashOutErrors.referenceNumber?.message}
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Ledger Notes</label>
              <textarea
                rows={2}
                {...registerCashOut('notes')}
                placeholder="Enter payout transaction details..."
                className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 text-xs transition-all placeholder:text-slate-650"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCashOutModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isCreatingCashOut}
              >
                Log Outflow
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation */}
        <AlertDialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Transaction?"
          description="Are you sure you want to delete this cash transaction? Project accounting cash balances will adjust accordingly."
          confirmText="Delete"
          isConfirming={isDeleting}
        />
      </div>
    </AuthenticatedLayout>
  );
}
