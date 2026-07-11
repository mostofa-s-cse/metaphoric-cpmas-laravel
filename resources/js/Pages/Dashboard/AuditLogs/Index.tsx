import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { ToastContainer } from '@/Components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import { Select } from '@/Components/ui/Select';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import {
  ShieldAlert, Search, Loader2, Calendar, User, Activity, History, ArrowLeft, ArrowRight,
  RefreshCw, SlidersHorizontal, X, Trash2, AlertTriangle
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export default function AuditLogsPage() {
  const { auth } = usePage().props as any;
  const currentUser = auth?.user;
  const { toasts, removeToast, success, error, handlePromise } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionGroup, setActionGroup] = useState('ALL');
  const [entityType, setEntityType] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [page, setPage] = useState(1);
  const limit = 15;

  // Pruning state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isPruning, setIsPruning] = useState(false);

  // Data states
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Debounce search input to prevent database spamming
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on search
    }, 450);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchAuditLogs = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsFetching(true);
    setFetchError(false);

    try {
      const res = await axios.get('/api/audit-logs', {
        params: {
          page,
          limit,
          search: debouncedSearch,
          actionGroup,
          entityType,
          startDate,
          endDate,
        }
      });
      if (res.data.status === 'success') {
        setAuditLogs(res.data.data.auditLogs || []);
        setTotalLogs(res.data.data.total || 0);
        setTotalPages(res.data.data.totalPages || 1);
      } else {
        setFetchError(true);
      }
    } catch (err) {
      setFetchError(true);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, debouncedSearch, actionGroup, entityType, startDate, endDate]);

  const refetch = () => {
    fetchAuditLogs(true);
  };

  // Reset to page 1 on filter changes
  const handleActionGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionGroup(e.target.value);
    setPage(1);
  };

  const handleEntityTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEntityType(e.target.value);
    setPage(1);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    setPage(1);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setActionGroup('ALL');
    setEntityType('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handlePruneLogs = async () => {
    if (!startDate || !endDate) return;
    setIsPruning(true);
    try {
      await handlePromise(
        axios.delete('/api/audit-logs', { data: { startDate, endDate } }),
        { successMessage: 'Audit logs pruned successfully' }
      );
      setDeleteConfirmOpen(false);
      fetchAuditLogs();
    } catch (err) {
      // Handled by toast helper
    } finally {
      setIsPruning(false);
    }
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    actionGroup !== 'ALL' ||
    entityType !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  const canPrune = startDate !== '' && endDate !== '' && currentUser?.role === 'SUPER_ADMIN';

  // Render check for Super Admin or Admin roles
  if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN')) {
    return (
      <AuthenticatedLayout>
        <Head title="Access Restricted" />
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
          <div className="h-14 w-14 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-2xl flex items-center justify-center mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 mb-1">Access Restricted</h2>
          <p className="text-slate-400 text-sm max-w-sm">
            You do not have the required administrative clearance to view the system audit logs.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-850 active:scale-[0.98] transition-all"
          >
            Return to Safety
          </a>
        </div>
      </AuthenticatedLayout>
    );
  }

  const getActionBadge = (action: string) => {
    const actUpper = action.toUpperCase();
    if (actUpper.startsWith('CREATE') || actUpper.startsWith('POST')) {
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
    }
    if (actUpper.startsWith('UPDATE') || actUpper.startsWith('PUT') || actUpper.startsWith('SUBMIT') || actUpper.startsWith('PRUNE')) {
      return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25';
    }
    if (actUpper.startsWith('DELETE') || actUpper.startsWith('REMOVE')) {
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/25';
    }
    return 'bg-slate-500/10 text-slate-400 border border-slate-500/25';
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <AuthenticatedLayout>
      <Head title="System Audit Logs" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-350 flex items-center gap-2">
              <History className="h-5.5 w-5.5 text-cyan-400" />
              System Audit Logs
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Security logs tracking all database changes and user login transactions
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={refetch}
            loading={isFetching}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>

        {/* Filter and search bar controls */}
        <div className="bg-slate-950/20 border border-slate-800/60 rounded-2xl p-4 space-y-4">
          <div className="flex flex-col xl:flex-row gap-3">
            {/* Search bar */}
            <div className="flex-1">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs by action, details description, user name or email..."
                icon={<Search className="h-4 w-4" />}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Action type filter */}
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <Select
                  value={actionGroup}
                  onChange={handleActionGroupChange}
                  className="min-w-[130px]"
                >
                  <option value="ALL">All Actions</option>
                  <option value="CREATE">CREATE / POST</option>
                  <option value="UPDATE">UPDATE / PUT</option>
                  <option value="DELETE">DELETE / REMOVE</option>
                  <option value="USER_LOGIN">USER LOGIN</option>
                </Select>
              </div>

              {/* Entity type filter */}
              <div className="flex items-center gap-2">
                <Select
                  value={entityType}
                  onChange={handleEntityTypeChange}
                  className="min-w-[140px]"
                >
                  <option value="ALL">All Modules</option>
                  <option value="PROJECT">Projects</option>
                  <option value="SUPPLIER">Suppliers</option>
                  <option value="VENDOR">Vendors</option>
                  <option value="EMPLOYEE">Employees</option>
                  <option value="LABOUR">Site Labour</option>
                  <option value="MATERIAL">Materials Log</option>
                  <option value="CASH_IN">Cash In Ledger</option>
                  <option value="CASH_OUT">Cash Out Ledger</option>
                  <option value="DOCUMENT">Documents</option>
                </Select>
              </div>

              {/* Date Range Filters */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="bg-slate-950/40 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/80 cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                />
                <span className="text-[10px] text-slate-500 font-semibold uppercase">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  className="bg-slate-950/40 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/80 cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Pruning actions */}
              {canPrune && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  title="Clear logs in selected date range"
                >
                  Clear History
                </Button>
              )}

              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleClearFilters}
                  className="p-2.5 rounded-xl"
                  title="Clear Filters"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="border border-slate-800/60 rounded-2xl bg-slate-950/20 backdrop-blur-md overflow-hidden shadow-2xl relative z-10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/30 text-slate-400 font-semibold text-[10px] tracking-wider uppercase">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User Operator</th>
                  <th className="px-6 py-4">Action Event</th>
                  <th className="px-6 py-4">Detailed Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-7 w-7 text-cyan-400 animate-spin" />
                        <span className="text-slate-400 text-xs font-medium">Fetching auditing records...</span>
                      </div>
                    </td>
                  </tr>
                ) : fetchError ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-rose-400 font-medium">
                      Failed to fetch audit logs. Please try again.
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-slate-500 font-medium">
                      No matching audit logs found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          <span>{formatDateTime(log.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.user ? (
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 bg-slate-900 border border-slate-800 text-slate-300 rounded-full flex items-center justify-center text-[10px] font-bold">
                              {log.user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-200">{log.user.fullName}</div>
                              <div className="text-[10px] text-slate-500">{log.user.email}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-500 font-medium">
                            <User className="h-3.5 w-3.5" />
                            <span>System / Non-Auth</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-md uppercase ${getActionBadge(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-medium max-w-sm">
                        <div className="flex items-start gap-1.5 font-medium">
                          <Activity className="h-3.5 w-3.5 mt-0.5 text-cyan-500/60 shrink-0" />
                          <span className="leading-relaxed break-words">{log.details}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!isLoading && !fetchError && totalLogs > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/10">
              <span className="text-[10px] text-slate-500 font-medium">
                Showing <strong className="text-slate-400">{(page - 1) * limit + 1}</strong> to{' '}
                <strong className="text-slate-400">
                  {Math.min(page * limit, totalLogs)}
                </strong>{' '}
                of <strong className="text-slate-400">{totalLogs}</strong> audit logs
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center text-xs font-semibold px-2 text-slate-400">
                  Page {page} of {totalPages}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg disabled:opacity-40 transition-all cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl relative animate-in fade-in duration-200">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-350 bg-slate-850/40 border border-slate-850 rounded-lg animate-none shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="h-12 w-12 bg-rose-500/10 border border-rose-500/20 text-rose-455 rounded-xl flex items-center justify-center animate-none shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Clear Activity Log History?</h3>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                  You are about to permanently delete the activity history logs from <strong className="text-slate-300">{startDate}</strong> to <strong className="text-slate-300">{endDate}</strong>.
                  This is a secure system action and cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handlePruneLogs}
                  loading={isPruning}
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  className="bg-rose-600 hover:bg-rose-550 text-slate-950 font-bold border-none"
                >
                  Yes, Clear History
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
