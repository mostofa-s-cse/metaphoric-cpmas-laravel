import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { DatePickerInput } from '@/Components/ui/DatePickerInput';
import { Modal } from '@/Components/ui/Modal';
import { Drawer } from '@/Components/ui/Drawer';
import { AlertDialog } from '@/Components/ui/AlertDialog';
import { Pagination } from '@/Components/ui/Pagination';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import { Select } from '@/Components/ui/Select';
import { ToastContainer } from '@/Components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';

import {
  HardHat, Plus, Search, UserPlus, Users2, Trash2, Loader2, CalendarCheck, Check, X, AlertCircle,
  CreditCard, History,
} from 'lucide-react';

const labourSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phoneNumber: z.string().min(5, 'Phone number is required'),
  trade: z.string().min(2, 'Trade is required'),
  dailyWage: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
    message: 'Daily wage must be a positive number',
  }),
  projectId: z.string().min(1, 'Project assignment is required'),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE']),
});

type LabourFormValues = z.infer<typeof labourSchema>;

interface ApiLabour {
  id: string;
  name: string;
  phoneNumber: string;
  trade: string;
  dailyWage: number;
  projectId: string;
  employmentStatus: 'ACTIVE' | 'INACTIVE';
  project?: {
    id: string;
    name: string;
    code: string;
  };
}

export default function LaboursPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;
  const { toasts, removeToast, error, handlePromise } = useToast();

  const [activeTab, setActiveTab] = useState<'labour' | 'attendance' | 'wages'>('labour');
  const [wagesProjectFilter, setWagesProjectFilter] = useState('ALL');
  const [wagesMonthFilter, setWagesMonthFilter] = useState(''); // '' = all months

  const [labours, setLabours] = useState<ApiLabour[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const [isFetchingLabours, setIsFetchingLabours] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [searchLabour, setSearchLabour] = useState('');
  const [debouncedSearchLabour, setDebouncedSearchLabour] = useState('');

  const [labPage, setLabPage] = useState(1);
  const [labLimit, setLabLimit] = useState(10);
  const [labTotal, setLabTotal] = useState(0);

  // Attendance logging states
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LEAVE'>>({});
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  const [isLabourModalOpen, setIsLabourModalOpen] = useState(false);
  const [isCreatingLabour, setIsCreatingLabour] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [labourToDelete, setLabourToDelete] = useState<string | null>(null);

  // Per-labour total wages paid, scoped server-side to the current
  // project/month filter — avoids pulling every cash-out client-side.
  const [wageTotals, setWageTotals] = useState<Record<string, number>>({});

  // Pay Wage modal
  const [isWageModalOpen, setIsWageModalOpen] = useState(false);
  const [isWageHistoryOpen, setIsWageHistoryOpen] = useState(false);
  const [selectedLabourForWage, setSelectedLabourForWage] = useState<ApiLabour | null>(null);
  const [wageHistory, setWageHistory] = useState<any[]>([]);
  const [isFetchingWageHistory, setIsFetchingWageHistory] = useState(false);
  const [isPayingWage, setIsPayingWage] = useState(false);
  const [wageFormData, setWageFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    projectId: '',
    amount: '',
    paymentMethod: 'CASH',
    referenceNumber: '',
    notes: '',
  });

  const {
    register: registerLabour,
    handleSubmit: handleSubmitLabour,
    reset: resetLabour,
    formState: { errors: labourErrors },
  } = useForm<LabourFormValues>({
    resolver: zodResolver(labourSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      trade: 'Mason',
      dailyWage: '',
      projectId: '',
      employmentStatus: 'ACTIVE',
    },
    mode: 'all',
  });

  const fetchLabours = async () => {
    setIsFetchingLabours(true);
    try {
      const res = await axios.get('/api/labours', {
        params: { page: labPage, limit: labLimit, search: debouncedSearchLabour }
      });
      if (res.data.status === 'success') {
        setLabours(res.data.data.labours || []);
        setLabTotal(res.data.data.total || 0);
      }
    } catch (err) {
      setFetchError(true);
    } finally {
      setIsFetchingLabours(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      if (res.data.status === 'success') {
        setProjects(res.data.data.projects || []);
      }
    } catch (err) {
      // silent fail
    }
  };

  const fetchWageTotals = async () => {
    try {
      const res = await axios.get('/api/labours/wage-totals', {
        params: { projectId: wagesProjectFilter, month: wagesMonthFilter || undefined },
      });
      if (res.data.status === 'success') {
        setWageTotals(res.data.data.totals || {});
      }
    } catch (err) {
      // silent
    }
  };

  const fetchWageHistory = async (labourId: string) => {
    setIsFetchingWageHistory(true);
    try {
      const res = await axios.get('/api/transactions/cash-out', { params: { labourId, limit: 200 } });
      if (res.data.status === 'success') {
        setWageHistory(res.data.data.cashOuts || []);
      }
    } catch (err) {
      // silent
    } finally {
      setIsFetchingWageHistory(false);
    }
  };

  const fetchAttendance = async () => {
    if (activeTab !== 'attendance') return;
    setIsFetchingAttendance(true);
    try {
      const res = await axios.get('/api/attendance', { params: { date: selectedDate } });
      const fetchedRecords = res.data.data?.attendances || [];
      const records: Record<string, 'PRESENT' | 'ABSENT' | 'LEAVE'> = {};
      fetchedRecords.forEach((att: any) => {
        records[att.labourId] = att.status;
      });

      labours.forEach((l) => {
        if (!records[l.id] && l.employmentStatus === 'ACTIVE') {
          records[l.id] = 'PRESENT';
        }
      });
      setAttendanceRecords(records);
    } catch (err) {
      // silent
    } finally {
      setIsFetchingAttendance(false);
    }
  };

  useEffect(() => {
    fetchLabours();
  }, [labPage, labLimit, debouncedSearchLabour]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchWageTotals();
  }, [wagesProjectFilter, wagesMonthFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchLabour(searchLabour);
      setLabPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchLabour]);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, activeTab, labours]);

  const handleOpenLabourCreate = () => {
    if (projects.length === 0) {
      error('Please create a project first before registering site labor.');
      return;
    }
    resetLabour({
      name: '',
      phoneNumber: '',
      trade: 'Mason',
      dailyWage: '',
      projectId: '',
      employmentStatus: 'ACTIVE',
    });
    setIsLabourModalOpen(true);
  };

  const onLabourSubmit = async (values: LabourFormValues) => {
    setIsCreatingLabour(true);
    try {
      await handlePromise(axios.post('/api/labours', {
        ...values,
        dailyWage: parseFloat(values.dailyWage),
      }), {
        successMessage: 'Worker registered successfully'
      });
      fetchLabours();
      setIsLabourModalOpen(false);
    } catch (err) {
      // handled
    } finally {
      setIsCreatingLabour(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setLabourToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!labourToDelete) return;
    try {
      await handlePromise(axios.delete(`/api/labours/${labourToDelete}`), {
        successMessage: 'Labour record deleted successfully'
      });
      fetchLabours();
      setDeleteConfirmOpen(false);
      setLabourToDelete(null);
    } catch (err) {
      // handled
    }
  };

  const handleSaveAttendance = async () => {
    setIsSavingAttendance(true);
    const recordsArray = Object.entries(attendanceRecords).map(([labourId, status]) => {
      const worker = labours.find((l) => l.id === labourId);
      return {
        labourId,
        status,
        projectId: worker?.projectId,
      };
    });

    try {
      await handlePromise(
        axios.post('/api/attendance', {
          date: selectedDate,
          records: recordsArray,
        }),
        {
          successMessage: 'Labor attendance logs saved successfully'
        }
      );
      fetchAttendance();
    } catch (err) {
      // handled
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const toggleAttendanceStatus = (labourId: string, status: 'PRESENT' | 'ABSENT' | 'LEAVE') => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [labourId]: status,
    }));
  };

  const handleOpenPayWage = (lab: ApiLabour) => {
    setSelectedLabourForWage(lab);
    setWageFormData({
      date: new Date().toISOString().split('T')[0],
      projectId: lab.projectId || '',
      amount: lab.dailyWage.toString(),
      paymentMethod: 'CASH',
      referenceNumber: '',
      notes: '',
    });
    setIsWageModalOpen(true);
  };

  const handleViewWageHistory = (lab: ApiLabour) => {
    setSelectedLabourForWage(lab);
    fetchWageHistory(lab.id);
    setIsWageHistoryOpen(true);
  };

  const handlePayWageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLabourForWage) return;
    if (!wageFormData.projectId) {
      error('Select the project this wage is being paid from');
      return;
    }
    const amount = parseFloat(wageFormData.amount) || 0;
    if (amount <= 0) {
      error('Enter a valid wage amount');
      return;
    }

    setIsPayingWage(true);
    try {
      await handlePromise(
        axios.post('/api/transactions/cash-out', {
          date: wageFormData.date,
          projectId: wageFormData.projectId,
          expenseCategory: 'LABOR',
          paidTo: selectedLabourForWage.name,
          amount,
          paymentMethod: wageFormData.paymentMethod,
          referenceNumber: wageFormData.referenceNumber,
          notes: wageFormData.notes,
          labourId: selectedLabourForWage.id,
        }),
        { successMessage: `Successfully paid ${formatCurrencyLocal(amount)} wages to ${selectedLabourForWage.name}` }
      );
      fetchWageHistory(selectedLabourForWage.id);
      fetchWageTotals();
      setIsWageModalOpen(false);
    } catch (err) {
      // handled
    } finally {
      setIsPayingWage(false);
    }
  };

  // Which pool (Main Balance or the selected project's own share) a
  // prospective wage payment will draw from, and how much is available —
  // fetched live from the backend so it matches the admin-configured
  // percentage/category rules in Settings > Main Balance, and the exact
  // amount storeCashOut will enforce on submit.
  const [balanceInfo, setBalanceInfo] = useState<{
    source: 'main' | 'project'; allocated: number; available: number; spent: number; percentage: number;
  } | null>(null);

  const fetchAvailableBalance = async (projectId: string | null, category: string) => {
    try {
      const res = await axios.get('/api/transactions/available-balance', {
        params: { projectId: projectId || undefined, category },
      });
      if (res.data.status === 'success') {
        setBalanceInfo(res.data.data);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (isWageModalOpen && wageFormData.projectId) {
      fetchAvailableBalance(wageFormData.projectId, 'LABOR');
    }
  }, [isWageModalOpen, wageFormData.projectId]);

  const BalanceWidget = ({ info }: { info: typeof balanceInfo }) => {
    if (!info) {
      return <div className="mt-2 text-[10px] text-slate-600">Loading balance...</div>;
    }
    const label = info.source === 'main'
      ? `Main Balance (All Projects, ${info.percentage}%)`
      : `Project Balance (${info.percentage}% of budget)`;
    return (
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="p-1.5 bg-slate-950/40 border border-slate-800 rounded-lg">
          <span className="text-slate-550 block text-[9px] uppercase">{label}</span>
          <span className="text-slate-200 font-bold">{formatCurrencyLocal(info.allocated)}</span>
        </div>
        <div className="p-1.5 bg-slate-950/40 border border-slate-800 rounded-lg">
          <span className="text-slate-550 block text-[9px] uppercase">Spent</span>
          <span className="text-rose-400 font-bold">{formatCurrencyLocal(info.spent)}</span>
        </div>
        <div className="p-1.5 bg-slate-950/40 border border-cyan-500/20 rounded-lg">
          <span className="text-slate-550 block text-[9px] uppercase">Remaining</span>
          <span className={`font-bold ${info.available >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
            {formatCurrencyLocal(info.available)}
          </span>
        </div>
      </div>
    );
  };

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <AuthenticatedLayout>
      <Head title="Labour Management" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-350 flex items-center gap-2">
              <HardHat className="h-5.5 w-5.5 text-cyan-400" />
              Labour Management
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Register site labor, assign to active projects, and log daily attendance sheets.
            </p>
          </div>

          {user && user.role !== 'DATA_ENTRY_OPERATOR' && activeTab === 'labour' && (
            <Button
              onClick={handleOpenLabourCreate}
              icon={<UserPlus className="h-4.5 w-4.5" />}
            >
              Register Labour
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab('labour')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'labour'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Labour Registry ({labours.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Daily Labor Attendance
          </button>
          <button
            onClick={() => setActiveTab('wages')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'wages'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Labour Wages
          </button>
        </div>

        {/* Tab 1: Labour Registry */}
        {activeTab === 'labour' && (
          <div className="space-y-4">
            <Input
              placeholder="Search by worker name or trade craft..."
              value={searchLabour}
              onChange={(e) => setSearchLabour(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />

            {isFetchingLabours && labours.length === 0 ? (
              <div className="h-60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10">
                <Loader2 className="h-7 w-7 animate-spin text-cyan-400 mb-2" />
                <span className="text-slate-500 text-xs">Loading labor logs...</span>
              </div>
            ) : fetchError ? (
              <div className="h-60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4">
                <Users2 className="h-10 w-10 text-rose-500 mb-2" />
                <span className="text-slate-355 text-xs font-semibold">Failed to fetch labors registry</span>
              </div>
            ) : labours.length === 0 ? (
              <div className="h-60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4 text-slate-500 text-xs">
                No workers registered in labour registry.
              </div>
            ) : (
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-900/20 backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <th className="p-4">Name</th>
                        <th className="p-4">Assigned Project</th>
                        <th className="p-4">Trade Craft</th>
                        <th className="p-4">Phone Number</th>
                        <th className="p-4 text-right">Daily Wage</th>
                        <th className="p-4 text-center">Status</th>
                        {user?.role === 'SUPER_ADMIN' && <th className="p-4 text-right">Delete</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {labours.map((lab) => (
                        <tr key={lab.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-4 font-semibold text-slate-200">{lab.name}</td>
                          <td className="p-4">
                            <span className="font-semibold text-slate-300 block">{lab.project?.name}</span>
                            <span className="text-[10px] font-mono text-cyan-400 block mt-0.5">
                              {lab.project?.code}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-slate-300">{lab.trade}</td>
                          <td className="p-4 text-slate-400">{lab.phoneNumber}</td>
                          <td className="p-4 text-right font-bold text-slate-200">
                            {formatCurrencyLocal(lab.dailyWage)}/day
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                                lab.employmentStatus === 'ACTIVE'
                                  ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                                  : 'text-slate-400 border-slate-500/20 bg-slate-500/5'
                              }`}
                            >
                              {lab.employmentStatus}
                            </span>
                          </td>
                          {user?.role === 'SUPER_ADMIN' && (
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteClick(lab.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg border border-transparent hover:border-rose-500/10 transition-all cursor-pointer animate-in duration-200"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={labPage}
                  totalPages={Math.ceil(labTotal / labLimit)}
                  totalItems={labTotal}
                  limit={labLimit}
                  onPageChange={setLabPage}
                  onLimitChange={(l) => { setLabLimit(l); setLabPage(1); }}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Daily Attendance */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 p-4 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-cyan-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Daily labor attendance log sheet</h3>
                  <p className="text-[10px] text-slate-500">Record check-ins to run payroll billing</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DatePickerInput
                  id="attendanceDate"
                  value={selectedDate}
                  onChange={setSelectedDate}
                />
                {user && user.role !== 'DATA_ENTRY_OPERATOR' && (
                  <button
                    onClick={handleSaveAttendance}
                    disabled={isSavingAttendance || labours.length === 0}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingAttendance && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Save Attendance</span>
                  </button>
                )}
              </div>
            </div>

            {isFetchingAttendance ? (
              <div className="h-60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10">
                <Loader2 className="h-7 w-7 animate-spin text-cyan-400 mb-2" />
                <span className="text-slate-500 text-xs">Loading attendance log sheet...</span>
              </div>
            ) : labours.length === 0 ? (
              <div className="h-60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4 text-slate-500 text-xs">
                No active labour force registered.
              </div>
            ) : (
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/20 backdrop-blur-md">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <th className="p-4">Worker Name</th>
                      <th className="p-4">Assigned Project</th>
                      <th className="p-4">Craft Type</th>
                      <th className="p-4 text-center">Attendance Logs status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {labours
                      .filter((l) => l.employmentStatus === 'ACTIVE')
                      .map((l) => {
                        const currentStatus = attendanceRecords[l.id] || 'PRESENT';
                        return (
                          <tr key={l.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="p-4 font-semibold text-slate-200">{l.name}</td>
                            <td className="p-4 text-slate-400">{l.project?.name}</td>
                            <td className="p-4 text-cyan-400 font-mono">{l.trade}</td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  disabled={user?.role === 'DATA_ENTRY_OPERATOR'}
                                  onClick={() => toggleAttendanceStatus(l.id, 'PRESENT')}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    currentStatus === 'PRESENT'
                                      ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20'
                                      : 'bg-transparent text-slate-600 hover:text-slate-400 border border-transparent'
                                  }`}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>PRESENT</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={user?.role === 'DATA_ENTRY_OPERATOR'}
                                  onClick={() => toggleAttendanceStatus(l.id, 'ABSENT')}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    currentStatus === 'ABSENT'
                                      ? 'bg-rose-500/10 text-rose-455 border border-rose-500/20'
                                      : 'bg-transparent text-slate-600 hover:text-slate-400 border border-transparent'
                                  }`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>ABSENT</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={user?.role === 'DATA_ENTRY_OPERATOR'}
                                  onClick={() => toggleAttendanceStatus(l.id, 'LEAVE')}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    currentStatus === 'LEAVE'
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      : 'bg-transparent text-slate-600 hover:text-slate-400 border border-transparent'
                                  }`}
                                >
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  <span>LEAVE</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Labour Wages */}
        {activeTab === 'wages' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase">Project</label>
                <Select
                  value={wagesProjectFilter}
                  onChange={(e) => setWagesProjectFilter(e.target.value)}
                  className="sm:w-[280px]"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">All Projects</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                      {p.code} - {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-56">
                <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase">Filter by Month</label>
                <Input
                  type="month"
                  value={wagesMonthFilter}
                  onChange={(e) => setWagesMonthFilter(e.target.value)}
                />
              </div>
              {wagesMonthFilter && (
                <button
                  onClick={() => setWagesMonthFilter('')}
                  className="px-3 py-2 text-[10px] font-bold text-slate-400 hover:text-cyan-400 border border-slate-800 rounded-lg hover:border-cyan-500/30 transition-all cursor-pointer"
                >
                  All Months
                </button>
              )}
            </div>

            {labours.filter((l) => wagesProjectFilter === 'ALL' || l.projectId === wagesProjectFilter).length === 0 ? (
              <div className="h-60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4 text-slate-500 text-xs">
                No workers found for this project.
              </div>
            ) : (
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-900/20 backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <th className="p-4">Worker</th>
                        <th className="p-4">Assigned Project</th>
                        <th className="p-4 text-right">Daily Wage</th>
                        <th className="p-4 text-right">{wagesMonthFilter ? 'Paid (Month)' : 'Total Paid'}</th>
                        {user && ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(user.role) && (
                          <th className="p-4 text-right">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {labours
                        .filter((l) => wagesProjectFilter === 'ALL' || l.projectId === wagesProjectFilter)
                        .map((lab) => {
                        const totalPaid = wageTotals[lab.id] || 0;
                        return (
                          <tr key={lab.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="p-4 font-semibold text-slate-200">{lab.name}</td>
                            <td className="p-4">
                              <span className="font-semibold text-slate-300 block">{lab.project?.name}</span>
                              <span className="text-[10px] font-mono text-cyan-400 block mt-0.5">{lab.project?.code}</span>
                            </td>
                            <td className="p-4 text-right font-bold text-slate-200">
                              {formatCurrencyLocal(lab.dailyWage)}/day
                            </td>
                            <td className="p-4 text-right font-bold text-emerald-400">
                              {formatCurrencyLocal(totalPaid)}
                            </td>
                            {user && ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(user.role) && (
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleViewWageHistory(lab)}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] transition-all cursor-pointer shadow inline-flex items-center gap-1"
                                >
                                  <History className="h-3 w-3" />
                                  <span>Payment History</span>
                                </button>
                                <button
                                  onClick={() => handleOpenPayWage(lab)}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 font-bold rounded-lg text-[10px] transition-all cursor-pointer shadow inline-flex items-center gap-1"
                                >
                                  <CreditCard className="h-3 w-3" />
                                  <span>Pay Wage</span>
                                </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Register Labour */}
        <Modal
          open={isLabourModalOpen}
          onClose={() => setIsLabourModalOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <HardHat className="h-4.5 w-4.5 text-cyan-400" />
              Register Site Labour Worker
            </div>
          }
          size="lg"
        >
          <form onSubmit={handleSubmitLabour(onLabourSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Worker Name</label>
                <Input
                  {...registerLabour('name')}
                  placeholder="e.g. Mason Robert"
                  error={labourErrors.name?.message}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Phone Number</label>
                <Input
                  {...registerLabour('phoneNumber')}
                  placeholder="e.g. +1 555-8910"
                  error={labourErrors.phoneNumber?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Trade Craft</label>
                <Select
                  {...registerLabour('trade')}
                  error={labourErrors.trade?.message}
                >
                  <option value="Mason" className="bg-slate-900 text-slate-200">Mason</option>
                  <option value="Carpenter" className="bg-slate-900 text-slate-200">Carpenter</option>
                  <option value="Steel Worker" className="bg-slate-900 text-slate-200">Steel Worker</option>
                  <option value="Plumber" className="bg-slate-900 text-slate-200">Plumber</option>
                  <option value="Electrician" className="bg-slate-900 text-slate-200">Electrician</option>
                  <option value="Helper / Laborer" className="bg-slate-900 text-slate-200">Helper / Laborer</option>
                  <option value="Site Supervisor" className="bg-slate-900 text-slate-200">Site Supervisor</option>
                </Select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Daily Wage ($)</label>
                <Input
                  {...registerLabour('dailyWage')}
                  placeholder="e.g. 150"
                  error={labourErrors.dailyWage?.message}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Assign to Project</label>
              <Select
                {...registerLabour('projectId')}
                error={labourErrors.projectId?.message}
              >
                <option value="" disabled className="bg-slate-900 text-slate-250">Select Project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                    {p.code} - {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="pt-4 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsLabourModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isCreatingLabour}
              >
                Register Worker
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Pay Wage */}
        {selectedLabourForWage && (
          <Modal
            open={isWageModalOpen}
            onClose={() => setIsWageModalOpen(false)}
            title={
              <div className="flex items-center gap-2">
                <CreditCard className="h-4.5 w-4.5 text-emerald-400" />
                Pay Labour Wage
              </div>
            }
            size="md"
          >
            <form onSubmit={handlePayWageSubmit} className="space-y-4">
              <div className="p-3 border border-slate-800 rounded-xl bg-slate-950/40 text-xs space-y-1">
                <p>
                  <span className="font-bold text-slate-400">Worker:</span> {selectedLabourForWage.name}
                </p>
                <p>
                  <span className="font-bold text-slate-400">Trade:</span> {selectedLabourForWage.trade}
                </p>
                <p>
                  <span className="font-bold text-slate-400">Daily Wage:</span>{' '}
                  {formatCurrencyLocal(selectedLabourForWage.dailyWage)}
                </p>
              </div>


              <div>
                <label className="block text-slate-450 text-xs font-semibold mb-2">Pay From Project</label>
                <Select
                  value={wageFormData.projectId}
                  onChange={(e) => setWageFormData({ ...wageFormData, projectId: e.target.value })}
                  required
                >
                  <option value="" disabled className="bg-slate-900 text-slate-250">Select Project...</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                      {p.code} - {p.name}
                    </option>
                  ))}
                </Select>
                <BalanceWidget info={balanceInfo} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-450 text-xs font-semibold mb-2">Amount ($)</label>
                  <Input
                    type="number"
                    step="any"
                    required
                    value={wageFormData.amount}
                    onChange={(e) => setWageFormData({ ...wageFormData, amount: e.target.value })}
                    className="font-bold text-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-450 text-xs font-semibold mb-2">Date</label>
                  <DatePickerInput
                    id="wageDate"
                    value={wageFormData.date}
                    onChange={(v) => setWageFormData({ ...wageFormData, date: v })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-450 text-xs font-semibold mb-2">Payment Method</label>
                <Select
                  value={wageFormData.paymentMethod}
                  onChange={(e) => setWageFormData({ ...wageFormData, paymentMethod: e.target.value })}
                >
                  <option value="CASH" className="bg-slate-900 text-slate-200">CASH</option>
                  <option value="BANK" className="bg-slate-900 text-slate-200">BANK TRANSFER</option>
                  <option value="CHEQUE" className="bg-slate-900 text-slate-200">CHEQUE</option>
                  <option value="MOBILE_BANKING" className="bg-slate-900 text-slate-200">MOBILE BANKING</option>
                </Select>
              </div>

              <div>
                <label className="block text-slate-450 text-xs font-semibold mb-2">Reference # (optional)</label>
                <Input
                  value={wageFormData.referenceNumber}
                  onChange={(e) => setWageFormData({ ...wageFormData, referenceNumber: e.target.value })}
                  placeholder="e.g. TXN-10294"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2.5">
                <Button type="button" variant="secondary" onClick={() => setIsWageModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={isPayingWage}>
                  Pay Wage
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Drawer: Wage Payment History */}
        <Drawer
          open={isWageHistoryOpen && !!selectedLabourForWage}
          onClose={() => setIsWageHistoryOpen(false)}
          title={
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-200 text-sm leading-none">{selectedLabourForWage?.name}</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">Wage Payment History</p>
              </div>
            </div>
          }
          size="md"
        >
          {isFetchingWageHistory ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : wageHistory.length === 0 ? (
            <p className="text-slate-500 text-xs italic p-6">No wage payments logged yet.</p>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {wageHistory.map((w: any) => (
                <div key={w.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-200">{new Date(w.date).toLocaleDateString()}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{w.project?.code || 'No project'}</span>
                  </div>
                  <span className="text-emerald-400 font-semibold">{formatCurrencyLocal(w.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Drawer>

        {/* Delete Confirmation Alert */}
        <AlertDialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Labour Record?"
          description="Are you sure you want to delete this labour record? This action cannot be undone."
          confirmText="Delete"
        />
      </div>
    </AuthenticatedLayout>
  );
}
