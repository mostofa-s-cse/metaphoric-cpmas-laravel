import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { useResourceList } from '@/hooks/useResourceList';
import { useCrudMutations } from '@/hooks/useCrudMutations';

import {
  Users2, Plus, Search, Building, X, Loader2, UserPlus, CreditCard, Trash2, Edit2,
  History, Wallet, Receipt,
} from 'lucide-react';
import { TakaIcon } from '@/Components/ui/TakaIcon';

function monthsBetween(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  let [y, m] = startMonth.split('-').map(Number);
  const [endY, endM] = endMonth.split('-').map(Number);
  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return months;
}

const employeeStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
const employeeSchema = z.object({
  employeeId: z.string().min(2, 'Employee ID is required'),
  fullName: z.string().min(2, 'Full name is required'),
  designation: z.string().min(2, 'Designation is required'),
  department: z.string().min(2, 'Department is required'),
  phoneNumber: z.string().min(5, 'Phone number is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  joiningDate: z.string().min(1, 'Joining date is required'),
  monthlySalary: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
    message: 'Monthly salary must be a positive number',
  }),
  employmentStatus: employeeStatusEnum,
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface ApiEmployee {
  id: string;
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
  phoneNumber: string;
  email?: string;
  joiningDate: string;
  monthlySalary: number;
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  salaries?: any[];
}

interface ApiBankAccount {
  id: string;
  name: string;
  accountType: 'BANK' | 'CASH' | 'MOBILE_BANKING';
  currentBalance: number;
  isActive: boolean;
}

// Expense categories treated as general "office" overhead — these (plus
// employee salaries) are what draw down a project's Main Balance.
const OFFICE_EXPENSE_CATEGORIES = [
  { key: 'OFFICE_RENT', label: 'Office Rent' },
  { key: 'UTILITIES', label: 'Electricity & Internet Utilities' },
  { key: 'TRANSPORTATION', label: 'Transportation' },
  { key: 'FUEL', label: 'Fuel' },
  { key: 'EQUIPMENT_RENTAL', label: 'Heavy Crane/Equipment Rental' },
  { key: 'MISCELLANEOUS', label: 'Miscellaneous / Petty Cash' },
];
const OFFICE_CATEGORY_KEYS = OFFICE_EXPENSE_CATEGORIES.map((c) => c.key);

export default function EmployeesPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;
  const { toasts, removeToast, success, error, handlePromise } = useToast();

  const [activeTab, setActiveTab] = useState<'expense' | 'employees' | 'salary'>('employees');
  const [salaryMonthFilter, setSalaryMonthFilter] = useState(''); // '' = all months
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Employees list — paginated/searchable via useResourceList (mirrors Suppliers/Vendor).
  const {
    items: employees, totalItems: empTotal, isFetching: isFetchingEmployees, fetchError,
    refetch: fetchEmployees, page: empPage, setPage: setEmpPage, limit: empLimit, setLimit: setEmpLimit,
    searchTerm: searchEmployee, setSearchTerm: setSearchEmployee,
  } = useResourceList<ApiEmployee>('/api/employees', { listKey: 'employees' });

  // Modals state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [employeeModalMode, setEmployeeModalMode] = useState<'create' | 'edit'>('create');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isSalaryHistoryOpen, setIsSalaryHistoryOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<ApiEmployee | null>(null);

  // Full (unpaginated) employee list — used by the Employee Salary tab (totals
  // per employee), since the paginated `employees` list may not include
  // everyone. Employee headcount grows slowly (staff, not transactions), so
  // an all-at-once list stays cheap here unlike cash-out ledgers. Reuses
  // useResourceList (not useFetchList) because /api/employees always
  // responds shaped as { employees, total } — useFetchList assumes
  // res.data.data IS the array directly, which doesn't apply here.
  const {
    items: allEmployees, isFetching: isFetchingAllEmployees, refetch: fetchAllEmployees,
  } = useResourceList<ApiEmployee>('/api/employees', { listKey: 'employees', initialLimit: 1000 });

  // Office Expense ledger — fetched page-by-page, filtered server-side to
  // office-overhead categories, instead of pulling up to 1000 cash-outs and
  // filtering client-side (which silently drops older rows past that cap).
  const {
    items: officeCashOuts, totalItems: expenseTotal, isFetching: isFetchingCashOuts, refetch: fetchOfficeCashOuts,
    page: expensePage, setPage: setExpensePage, limit: expenseLimit, setLimit: setExpenseLimit,
  } = useResourceList<any>('/api/transactions/cash-out', {
    listKey: 'cashOuts',
    filters: { categories: OFFICE_CATEGORY_KEYS.join(',') },
  });

  // Pay Salary modal: payment history
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [isFetchingSalaryHistory, setIsFetchingSalaryHistory] = useState(false);

  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  // Salary disbursement manual form state
  const [salaryFormData, setSalaryFormData] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    basicSalary: '',
    bonus: '0',
    deduction: '0',
    paidAmount: '',
    bankAccountId: '',
    referenceNumber: '',
    notes: '',
  });

  // Office expense form state
  const [expenseFormData, setExpenseFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    expenseCategory: 'OFFICE_RENT',
    paidTo: '',
    amount: '',
    bankAccountId: '',
    referenceNumber: '',
    notes: '',
  });

  // Bank accounts — every office expense / salary disbursement draws from a
  // specific account here (replaces the old company-wide "Main Balance" pool
  // check for these two forms), so the dropdown and the balance-remaining
  // preview both read straight from this list.
  const [bankAccounts, setBankAccounts] = useState<ApiBankAccount[]>([]);
  const activeBankAccounts = bankAccounts.filter((a) => a.isActive);

  const fetchBankAccounts = async () => {
    try {
      const res = await axios.get('/api/bank-accounts');
      if (res.data.status === 'success') {
        setBankAccounts(res.data.data.accounts || []);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [isProcessingSalary, setIsProcessingSalary] = useState(false);
  const [isLoggingExpense, setIsLoggingExpense] = useState(false);

  // React Hook Form for Employee
  const {
    register: registerEmployee,
    handleSubmit: handleSubmitEmployee,
    reset: resetEmployee,
    control: controlEmployee,
    formState: { errors: employeeErrors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeId: '',
      fullName: '',
      designation: '',
      department: 'Engineering',
      phoneNumber: '',
      email: '',
      joiningDate: new Date().toISOString().split('T')[0],
      monthlySalary: '',
      employmentStatus: 'ACTIVE',
    },
    mode: 'all',
  });

  // Combined refetch used by both the employee list and the salary tab's
  // full roster, since create/edit/delete need to refresh both.
  const refetchEmployeeLists = () => { fetchEmployees(); fetchAllEmployees(); };
  const { create: createEmployee, update: updateEmployee, remove: removeEmployee } =
    useCrudMutations('/api/employees', handlePromise, refetchEmployeeLists);

  const handleOpenEmployeeCreate = () => {
    setEmployeeModalMode('create');
    setSelectedEmployeeId(null);
    resetEmployee({
      employeeId: '',
      fullName: '',
      designation: '',
      department: 'Engineering',
      phoneNumber: '',
      email: '',
      joiningDate: new Date().toISOString().split('T')[0],
      monthlySalary: '',
      employmentStatus: 'ACTIVE',
    });
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEmployeeEdit = (emp: ApiEmployee) => {
    setEmployeeModalMode('edit');
    setSelectedEmployeeId(emp.id);
    resetEmployee({
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      designation: emp.designation,
      department: emp.department,
      phoneNumber: emp.phoneNumber,
      email: emp.email || '',
      joiningDate: emp.joiningDate.split('T')[0],
      monthlySalary: emp.monthlySalary.toString(),
      employmentStatus: emp.employmentStatus,
    });
    setIsEmployeeModalOpen(true);
  };

  const onEmployeeSubmit = async (values: EmployeeFormValues) => {
    setIsCreatingEmployee(true);
    try {
      const payload = { ...values, monthlySalary: parseFloat(values.monthlySalary) };
      if (employeeModalMode === 'create') {
        await createEmployee(payload, 'Employee created successfully');
      } else if (selectedEmployeeId) {
        await updateEmployee(selectedEmployeeId, payload, 'Employee updated successfully');
      }
      setIsEmployeeModalOpen(false);
    } catch (err) {
      // handled
    } finally {
      setIsCreatingEmployee(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setEmployeeToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await removeEmployee(employeeToDelete, 'Employee deleted successfully');
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
    } catch (err) {
      // handled
    }
  };

  const fetchSalaryHistory = async (employeeId: string) => {
    setIsFetchingSalaryHistory(true);
    try {
      const res = await axios.get(`/api/employees/${employeeId}/salaries`);
      if (res.data.status === 'success') {
        setSalaryHistory(res.data.data.salaries || []);
      }
    } catch (err) {
      // silent
    } finally {
      setIsFetchingSalaryHistory(false);
    }
  };

  const handleOpenSalaryDisburse = (emp: ApiEmployee) => {
    setSelectedEmployee(emp);
    setSalaryFormData({
      month: new Date().toISOString().slice(0, 7),
      basicSalary: emp.monthlySalary.toString(),
      bonus: '0',
      deduction: '0',
      paidAmount: emp.monthlySalary.toString(),
      bankAccountId: activeBankAccounts[0]?.id || '',
      referenceNumber: '',
      notes: '',
    });
    fetchBankAccounts();
    setIsSalaryModalOpen(true);
  };

  const handleViewSalaryHistory = (emp: ApiEmployee) => {
    setSelectedEmployee(emp);
    fetchSalaryHistory(emp.id);
    setIsSalaryHistoryOpen(true);
  };

  // Salary disbursement is create-only and per-employee, so the mutation
  // endpoint is derived from whichever employee is currently selected.
  // fetchSalaryHistory itself stays a plain function (not useFetchList/
  // useResourceList) since it's invoked imperatively for an arbitrary
  // employee id chosen at click-time — it doesn't fit either hook's
  // fixed-endpoint, auto-fetch-on-mount assumption.
  const refetchSalary = () => {
    if (selectedEmployee) fetchSalaryHistory(selectedEmployee.id);
    fetchAllEmployees();
  };
  const { create: createSalary } = useCrudMutations(
    selectedEmployee ? `/api/employees/${selectedEmployee.id}/salaries` : '',
    handlePromise,
    refetchSalary
  );

  const handleDisburseSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const basic = parseFloat(salaryFormData.basicSalary) || 0;
    const bonus = parseFloat(salaryFormData.bonus) || 0;
    const ded = parseFloat(salaryFormData.deduction) || 0;
    const paid = parseFloat(salaryFormData.paidAmount) || 0;

    if (paid > 0 && !salaryFormData.bankAccountId) {
      error('Select a bank account to disburse from');
      return;
    }

    setIsProcessingSalary(true);
    try {
      await createSalary(
        {
          month: salaryFormData.month,
          basicSalary: basic,
          bonus: bonus,
          deduction: ded,
          paidAmount: paid,
          bankAccountId: salaryFormData.bankAccountId,
          referenceNumber: salaryFormData.referenceNumber,
          notes: salaryFormData.notes,
        },
        `Successfully logged salary disbursement of ${formatCurrencyLocal(paid)} for ${selectedEmployee.fullName}`
      );
      fetchBankAccounts();
      setIsSalaryModalOpen(false);
    } catch (err) {
      // handled
    } finally {
      setIsProcessingSalary(false);
    }
  };

  // Office expense log is create-only; refetch mirrors the original
  // "reset to page 1, then refetch" so a freshly-logged expense is visible
  // even if the ledger wasn't already on page 1.
  const refetchExpense = () => { setExpensePage(1); fetchOfficeCashOuts(); };
  const { create: createExpense } = useCrudMutations('/api/transactions/cash-out', handlePromise, refetchExpense);

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseFormData.amount) || 0;
    if (amount <= 0) {
      error('Enter a valid expense amount');
      return;
    }
    if (!expenseFormData.bankAccountId) {
      error('Select a bank account to pay from');
      return;
    }

    setIsLoggingExpense(true);
    try {
      await createExpense(
        {
          date: expenseFormData.date,
          projectId: null,
          expenseCategory: expenseFormData.expenseCategory,
          paidTo: expenseFormData.paidTo || OFFICE_EXPENSE_CATEGORIES.find((c) => c.key === expenseFormData.expenseCategory)?.label,
          amount,
          bankAccountId: expenseFormData.bankAccountId,
          referenceNumber: expenseFormData.referenceNumber,
          notes: expenseFormData.notes,
        },
        `Successfully logged office expense of ${formatCurrencyLocal(amount)}`
      );
      setExpenseFormData({
        date: new Date().toISOString().split('T')[0],
        expenseCategory: 'OFFICE_RENT',
        paidTo: '',
        amount: '',
        bankAccountId: activeBankAccounts[0]?.id || '',
        referenceNumber: '',
        notes: '',
      });
      fetchBankAccounts();
      setIsExpenseModalOpen(false);
    } catch (err) {
      // handled
    } finally {
      setIsLoggingExpense(false);
    }
  };

  const formatCurrencyLocal = (amount: number) => {
    const sign = amount < 0 ? '-' : '';
    return `${sign}৳ ${Math.abs(amount).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Replaces the old company-wide "Main Balance" check for office expense /
  // salary forms — the account actually being debited is the source of truth
  // now, so this just previews its balance before/after the entered amount.
  const BankAccountBalanceWidget = ({ accountId, amount }: { accountId: string; amount: number }) => {
    const account = bankAccounts.find((a) => a.id === accountId);
    if (!account) {
      return (
        <div className="mt-2 text-[10px] text-slate-600">
          {activeBankAccounts.length === 0 ? 'No active bank account found — create one in Bank Accounts first.' : 'Select a bank account.'}
        </div>
      );
    }
    const remaining = account.currentBalance - amount;
    return (
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="p-1.5 bg-slate-950/40 border border-slate-800 rounded-lg">
          <span className="text-slate-550 block text-[9px] uppercase">Account Balance</span>
          <span className="text-slate-200 font-bold">{formatCurrencyLocal(account.currentBalance)}</span>
        </div>
        <div className="p-1.5 bg-slate-950/40 border border-slate-800 rounded-lg">
          <span className="text-slate-550 block text-[9px] uppercase">This Expense</span>
          <span className="text-rose-400 font-bold">{formatCurrencyLocal(amount)}</span>
        </div>
        <div className="p-1.5 bg-slate-950/40 border border-cyan-500/20 rounded-lg">
          <span className="text-slate-550 block text-[9px] uppercase">Remaining After</span>
          <span className={`font-bold ${remaining >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
            {formatCurrencyLocal(remaining)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <AuthenticatedLayout>
      <Head title="Office Management" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-350 flex items-center gap-2">
              <Users2 className="h-5.5 w-5.5 text-cyan-400" />
              Office Management
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Log office expenses, register staff, and disburse monthly salaries — all reconciled against each project's Main Balance.
            </p>
          </div>

          {user && user.role !== 'DATA_ENTRY_OPERATOR' && activeTab === 'employees' && (
            <Button
              onClick={handleOpenEmployeeCreate}
              icon={<UserPlus className="h-4.5 w-4.5" />}
            >
              Register Employee
            </Button>
          )}
          {user && user.role !== 'DATA_ENTRY_OPERATOR' && activeTab === 'expense' && (
            <Button
              onClick={() => {
                setExpenseFormData((prev) => ({ ...prev, bankAccountId: prev.bankAccountId || activeBankAccounts[0]?.id || '' }));
                fetchBankAccounts();
                setIsExpenseModalOpen(true);
              }}
              icon={<Receipt className="h-4.5 w-4.5" />}
            >
              Log Expense
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab('expense')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'expense'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Expense
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'employees'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Employees ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('salary')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'salary'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-350'
            }`}
          >
            Employee Salary
          </button>
        </div>

        {/* Tab: Expense */}
        {activeTab === 'expense' && (
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
              <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <Wallet className="h-4.5 w-4.5 text-cyan-400" />
                Office Expense Ledger
              </h2>
              {isFetchingCashOuts ? (
                <div className="h-40 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                </div>
              ) : officeCashOuts.length === 0 ? (
                <p className="text-slate-500 text-xs italic">No office expenses logged yet.</p>
              ) : (
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Paid To</th>
                        <th className="py-2.5 px-3">Project</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {officeCashOuts.map((co: any) => (
                          <tr key={co.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-3 px-3 text-slate-450 font-mono text-[10px]">
                              {new Date(co.date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-400 font-bold uppercase font-mono">
                                {co.expenseCategory.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300 font-semibold">{co.paidTo}</td>
                            <td className="py-3 px-3 text-slate-400">{co.project?.code || '—'}</td>
                            <td className="py-3 px-3 text-right font-bold text-rose-400">
                              -{formatCurrencyLocal(co.amount)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
              {expenseTotal > 0 && (
                <Pagination
                  currentPage={expensePage}
                  totalPages={Math.ceil(expenseTotal / expenseLimit)}
                  totalItems={expenseTotal}
                  limit={expenseLimit}
                  onPageChange={setExpensePage}
                  onLimitChange={(l) => { setExpenseLimit(l); setExpensePage(1); }}
                />
              )}
          </div>
        )}

        {/* Tab: Employees */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            <Input
              placeholder="Search by ID, name or designation..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />

            {isFetchingEmployees && employees.length === 0 ? (
              <div className="h-60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10">
                <Loader2 className="h-7 w-7 animate-spin text-cyan-400 mb-2" />
                <span className="text-slate-500 text-xs">Loading employee logs...</span>
              </div>
            ) : fetchError ? (
              <div className="h-60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4">
                <Users2 className="h-10 w-10 text-rose-500 mb-2" />
                <span className="text-slate-350 text-xs font-semibold">Failed to fetch employees</span>
              </div>
            ) : employees.length === 0 ? (
              <div className="h-60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4 text-slate-500 text-xs">
                No employees registered.
              </div>
            ) : (
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-900/20 backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <th className="p-4">Employee ID</th>
                        <th className="p-4">Full Name</th>
                        <th className="p-4">Designation</th>
                        <th className="p-4">Department</th>
                        <th className="p-4">Joining Date</th>
                        <th className="p-4 text-right">Monthly Salary</th>
                        <th className="p-4 text-center">Status</th>
                        {user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role) && <th className="p-4 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-4 font-bold text-cyan-400 font-mono">{emp.employeeId}</td>
                          <td className="p-4 font-semibold text-slate-200">{emp.fullName}</td>
                          <td className="p-4 text-slate-350">{emp.designation}</td>
                          <td className="p-4 text-slate-400">{emp.department}</td>
                          <td className="p-4 text-slate-500">{new Date(emp.joiningDate).toLocaleDateString()}</td>
                          <td className="p-4 text-right font-bold text-slate-200">
                            {formatCurrencyLocal(emp.monthlySalary)}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                                emp.employmentStatus === 'ACTIVE'
                                  ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                                  : 'text-slate-400 border-slate-500/20 bg-slate-500/5'
                              }`}
                            >
                              {emp.employmentStatus}
                            </span>
                          </td>
                          {user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role) && (
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEmployeeEdit(emp)}
                                  className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/5 rounded-lg border border-transparent hover:border-cyan-500/10 transition-all cursor-pointer"
                                  title="Edit employee"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                {user.role === 'SUPER_ADMIN' && (
                                  <button
                                    onClick={() => handleDeleteClick(emp.id)}
                                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg border border-transparent hover:border-rose-500/10 transition-all cursor-pointer animate-in duration-200"
                                    title="Delete employee"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={empPage}
                  totalPages={Math.ceil(empTotal / empLimit)}
                  totalItems={empTotal}
                  limit={empLimit}
                  onPageChange={setEmpPage}
                  onLimitChange={(l) => { setEmpLimit(l); setEmpPage(1); }}
                />
              </div>
            )}
          </div>
        )}

        {/* Tab: Employee Salary */}
        {activeTab === 'salary' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-56">
                <label className="block text-slate-450 text-[10px] font-semibold mb-1.5 uppercase">Filter by Month</label>
                <Input
                  type="month"
                  value={salaryMonthFilter}
                  onChange={(e) => setSalaryMonthFilter(e.target.value)}
                />
              </div>
              {salaryMonthFilter && (
                <button
                  onClick={() => setSalaryMonthFilter('')}
                  className="mt-5 px-3 py-2 text-[10px] font-bold text-slate-400 hover:text-cyan-400 border border-slate-800 rounded-lg hover:border-cyan-500/30 transition-all cursor-pointer"
                >
                  All Months
                </button>
              )}
            </div>

            {isFetchingAllEmployees && allEmployees.length === 0 ? (
              <div className="h-60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10">
                <Loader2 className="h-7 w-7 animate-spin text-cyan-400 mb-2" />
                <span className="text-slate-500 text-xs">Loading payroll data...</span>
              </div>
            ) : allEmployees.length === 0 ? (
              <div className="h-60 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4 text-slate-500 text-xs">
                No employees registered.
              </div>
            ) : (
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-900/20 backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <th className="p-4">Employee</th>
                        <th className="p-4 text-right">Monthly Salary</th>
                        <th className="p-4 text-right">{salaryMonthFilter ? 'Paid (Month)' : 'Total Paid'}</th>
                        <th className="p-4 text-right">{salaryMonthFilter ? 'Due (Month)' : 'Total Due'}</th>
                        {user && ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(user.role) && (
                          <th className="p-4 text-right">Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {allEmployees.map((emp: any) => {
                        const joiningMonth = emp.joiningDate ? emp.joiningDate.slice(0, 7) : currentMonthStr;
                        const salaryByMonth = new Map<string, any>((emp.salaries || []).map((s: any) => [s.month, s]));
                        const filterOutOfRange = !!salaryMonthFilter && (salaryMonthFilter < joiningMonth || salaryMonthFilter > currentMonthStr);
                        const relevantMonths = salaryMonthFilter
                          ? [salaryMonthFilter]
                          : monthsBetween(joiningMonth, currentMonthStr);

                        let totalPaid = 0;
                        let totalDue = 0;
                        if (!filterOutOfRange) {
                          relevantMonths.forEach((month) => {
                            if (month < joiningMonth || month > currentMonthStr) return;
                            const sal = salaryByMonth.get(month);
                            if (sal) {
                              totalPaid += sal.paidAmount || 0;
                              totalDue += sal.dueAmount || 0;
                            } else {
                              // No salary logged for this month yet — the full month's salary is owed.
                              totalDue += emp.monthlySalary || 0;
                            }
                          });
                        }
                        return (
                          <tr key={emp.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="p-4">
                              <p className="font-semibold text-slate-200">{emp.fullName}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{emp.designation}</p>
                            </td>
                            <td className="p-4 text-right font-bold text-slate-200">
                              {formatCurrencyLocal(emp.monthlySalary)}
                            </td>
                            <td className="p-4 text-right font-bold text-emerald-400">
                              {filterOutOfRange ? <span className="text-slate-600 italic font-normal">Not processed</span> : formatCurrencyLocal(totalPaid)}
                            </td>
                            <td className={`p-4 text-right font-bold ${totalDue > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                              {filterOutOfRange ? '—' : formatCurrencyLocal(totalDue)}
                            </td>
                            {user && ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(user.role) && (
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleViewSalaryHistory(emp)}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] transition-all cursor-pointer shadow inline-flex items-center gap-1"
                                  >
                                    <History className="h-3 w-3" />
                                    <span>Payment History</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenSalaryDisburse(emp)}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 font-bold rounded-lg text-[10px] transition-all cursor-pointer shadow inline-flex items-center gap-1"
                                  >
                                    <CreditCard className="h-3 w-3" />
                                    <span>Pay Salary</span>
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

        {/* Modal 1: Register Employee */}
        <Modal
          open={isEmployeeModalOpen}
          onClose={() => setIsEmployeeModalOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <Building className="h-4.5 w-4.5 text-cyan-400" />
              {employeeModalMode === 'create' ? 'Register Staff Employee' : 'Edit Staff Employee'}
            </div>
          }
          size="lg"
        >
          <form onSubmit={handleSubmitEmployee(onEmployeeSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Employee ID</label>
                <Input
                  {...registerEmployee('employeeId')}
                  placeholder="e.g. EMP-202"
                  error={employeeErrors.employeeId?.message}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Full Name</label>
                <Input
                  {...registerEmployee('fullName')}
                  placeholder="e.g. David Smith"
                  error={employeeErrors.fullName?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Designation</label>
                <Input
                  {...registerEmployee('designation')}
                  placeholder="e.g. Project Engineer"
                  error={employeeErrors.designation?.message}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Department</label>
                <Select
                  {...registerEmployee('department')}
                  error={employeeErrors.department?.message}
                >
                  <option value="Engineering" className="bg-slate-900 text-slate-200">Engineering</option>
                  <option value="Accounts & Finance" className="bg-slate-900 text-slate-200">Accounts & Finance</option>
                  <option value="Operations & Management" className="bg-slate-900 text-slate-200">Operations & Management</option>
                  <option value="Human Resources" className="bg-slate-900 text-slate-200">Human Resources</option>
                  <option value="Procurement" className="bg-slate-900 text-slate-200">Procurement</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Phone Number</label>
                <Input
                  {...registerEmployee('phoneNumber')}
                  placeholder="e.g. +1 555-0199"
                  error={employeeErrors.phoneNumber?.message}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Email Address</label>
                <Input
                  type="email"
                  {...registerEmployee('email')}
                  placeholder="e.g. david@cpmas.com"
                  error={employeeErrors.email?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Joining Date</label>
                <Controller
                  name="joiningDate"
                  control={controlEmployee}
                  render={({ field }) => (
                    <DatePickerInput
                      id="joiningDate"
                      value={field.value}
                      onChange={field.onChange}
                      error={!!employeeErrors.joiningDate}
                    />
                  )}
                />
                {employeeErrors.joiningDate && (
                  <p className="text-rose-400 text-[10px] mt-1">{employeeErrors.joiningDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Monthly Salary ($)</label>
                <Input
                  {...registerEmployee('monthlySalary')}
                  placeholder="e.g. 5000"
                  error={employeeErrors.monthlySalary?.message}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-2">Employment Status</label>
              <Select
                {...registerEmployee('employmentStatus')}
                error={employeeErrors.employmentStatus?.message}
              >
                <option value="ACTIVE" className="bg-slate-900 text-slate-200">Active</option>
                <option value="INACTIVE" className="bg-slate-900 text-slate-200">Inactive</option>
                <option value="SUSPENDED" className="bg-slate-900 text-slate-200">Suspended</option>
              </Select>
            </div>

            <div className="pt-4 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEmployeeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isCreatingEmployee}
              >
                {employeeModalMode === 'create' ? 'Register Employee' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Log Office Expense */}
        <Modal
          open={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <Receipt className="h-4.5 w-4.5 text-cyan-400" />
              Log Office Expense
            </div>
          }
          size="md"
        >
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-450 text-xs font-semibold mb-2">Expense Category</label>
              <Select
                value={expenseFormData.expenseCategory}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, expenseCategory: e.target.value })}
              >
                {OFFICE_EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key} className="bg-slate-900 text-slate-200">{c.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-slate-450 text-xs font-semibold mb-2">Paid To (optional)</label>
              <Input
                value={expenseFormData.paidTo}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, paidTo: e.target.value })}
                placeholder="e.g. Landlord, Electric Co."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-450 text-xs font-semibold mb-2">Amount ($)</label>
                <Input
                  type="number"
                  step="any"
                  required
                  value={expenseFormData.amount}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-slate-450 text-xs font-semibold mb-2">Date</label>
                <DatePickerInput
                  id="expenseDate"
                  value={expenseFormData.date}
                  onChange={(v) => setExpenseFormData({ ...expenseFormData, date: v })}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-450 text-xs font-semibold mb-2">Bank Account</label>
              <Select
                value={expenseFormData.bankAccountId}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, bankAccountId: e.target.value })}
              >
                <option value="" disabled className="bg-slate-900 text-slate-200">Select account...</option>
                {activeBankAccounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-900 text-slate-200">
                    {a.name} ({formatCurrencyLocal(a.currentBalance)})
                  </option>
                ))}
              </Select>
              <BankAccountBalanceWidget accountId={expenseFormData.bankAccountId} amount={parseFloat(expenseFormData.amount) || 0} />
            </div>

            <div>
              <label className="block text-slate-450 text-xs font-semibold mb-2">Reference # (optional)</label>
              <Input
                value={expenseFormData.referenceNumber}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, referenceNumber: e.target.value })}
                placeholder="e.g. INV-2093"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsExpenseModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isLoggingExpense}>
                Log Expense
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal 2: Disburse Salary */}
        {selectedEmployee && (
          <Modal
            open={isSalaryModalOpen}
            onClose={() => setIsSalaryModalOpen(false)}
            title={
              <div className="flex items-center gap-2">
                <TakaIcon className="h-4.5 w-4.5 text-emerald-400" />
                Disburse Salary / Wages
              </div>
            }
            size="md"
          >
            <form onSubmit={handleDisburseSalarySubmit} className="space-y-4">
              <div className="p-3 border border-slate-800 rounded-xl bg-slate-950/40 text-xs text-slate-200 space-y-1">
                <p>
                  <span className="font-bold text-slate-400">Employee:</span> {selectedEmployee.fullName}
                </p>
                <p>
                  <span className="font-bold text-slate-400">Designation:</span> {selectedEmployee.designation}
                </p>
                <p>
                  <span className="font-bold text-slate-400">Fixed monthly pay:</span>{' '}
                  {formatCurrencyLocal(selectedEmployee.monthlySalary)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-450 text-xs font-semibold mb-2">Billing Month</label>
                  <Input
                    type="month"
                    required
                    value={salaryFormData.month}
                    onChange={(e) => setSalaryFormData({ ...salaryFormData, month: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-slate-455 text-xs font-semibold mb-2">Basic Salary ($)</label>
                  <Input
                    type="number"
                    step="any"
                    required
                    value={salaryFormData.basicSalary}
                    onChange={(e) => {
                      const basic = e.target.value;
                      const bonus = salaryFormData.bonus;
                      const ded = salaryFormData.deduction;
                      setSalaryFormData({
                        ...salaryFormData,
                        basicSalary: basic,
                        paidAmount: (
                          (parseFloat(basic) || 0) +
                          (parseFloat(bonus) || 0) -
                          (parseFloat(ded) || 0)
                        ).toString(),
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-455 text-xs font-semibold mb-2">Allowance/Bonus ($)</label>
                  <Input
                    type="number"
                    step="any"
                    value={salaryFormData.bonus}
                    onChange={(e) => {
                      const basic = salaryFormData.basicSalary;
                      const bonus = e.target.value;
                      const ded = salaryFormData.deduction;
                      setSalaryFormData({
                        ...salaryFormData,
                        bonus: bonus,
                        paidAmount: (
                          (parseFloat(basic) || 0) +
                          (parseFloat(bonus) || 0) -
                          (parseFloat(ded) || 0)
                        ).toString(),
                      });
                    }}
                  />
                </div>

                <div>
                  <label className="block text-slate-455 text-xs font-semibold mb-2">Deductions ($)</label>
                  <Input
                    type="number"
                    step="any"
                    value={salaryFormData.deduction}
                    onChange={(e) => {
                      const basic = salaryFormData.basicSalary;
                      const bonus = salaryFormData.bonus;
                      const ded = e.target.value;
                      setSalaryFormData({
                        ...salaryFormData,
                        deduction: ded,
                        paidAmount: (
                          (parseFloat(basic) || 0) +
                          (parseFloat(bonus) || 0) -
                          (parseFloat(ded) || 0)
                        ).toString(),
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-455 text-xs font-semibold mb-2">Actual Paid Net ($)</label>
                  <Input
                    type="number"
                    step="any"
                    required
                    value={salaryFormData.paidAmount}
                    onChange={(e) => setSalaryFormData({ ...salaryFormData, paidAmount: e.target.value })}
                    className="font-bold text-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-455 text-xs font-semibold mb-2">Bank Account</label>
                  <Select
                    value={salaryFormData.bankAccountId}
                    onChange={(e) => setSalaryFormData({ ...salaryFormData, bankAccountId: e.target.value })}
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-200">Select account...</option>
                    {activeBankAccounts.map((a) => (
                      <option key={a.id} value={a.id} className="bg-slate-900 text-slate-200">
                        {a.name} ({formatCurrencyLocal(a.currentBalance)})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <BankAccountBalanceWidget accountId={salaryFormData.bankAccountId} amount={parseFloat(salaryFormData.paidAmount) || 0} />

              <div>
                <label className="block text-slate-455 text-xs font-semibold mb-2">Reference # (Check/Receipt No.)</label>
                <Input
                  type="text"
                  value={salaryFormData.referenceNumber}
                  onChange={(e) => setSalaryFormData({ ...salaryFormData, referenceNumber: e.target.value })}
                  placeholder="e.g. TXN-10294"
                />
              </div>

              <div>
                <label className="block text-slate-455 text-xs font-semibold mb-2">Transaction Notes</label>
                <textarea
                  rows={2}
                  value={salaryFormData.notes}
                  onChange={(e) => setSalaryFormData({ ...salaryFormData, notes: e.target.value })}
                  placeholder="Add payroll transaction details..."
                  className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 text-xs transition-all placeholder:text-slate-650 shadow-inner"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsSalaryModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isProcessingSalary}
                >
                  Disburse Salary
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Drawer: Salary Payment History */}
        <Drawer
          open={isSalaryHistoryOpen && !!selectedEmployee}
          onClose={() => setIsSalaryHistoryOpen(false)}
          title={
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-200 text-sm leading-none">{selectedEmployee?.fullName}</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">Salary Payment History</p>
              </div>
            </div>
          }
          size="md"
        >
          {isFetchingSalaryHistory ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : salaryHistory.length === 0 ? (
            <p className="text-slate-500 text-xs italic p-6">No salary payments logged yet.</p>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {salaryHistory.map((s: any) => (
                <div key={s.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-200">{s.month}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{s.project?.code || 'No project'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-semibold">{formatCurrencyLocal(s.paidAmount)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      s.paymentStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-400'
                        : s.paymentStatus === 'PARTIAL' ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {s.paymentStatus}
                    </span>
                  </div>
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
          title="Delete Employee?"
          description="Are you sure you want to delete this employee record? This action cannot be undone."
          confirmText="Delete"
        />
      </div>
    </AuthenticatedLayout>
  );
}
