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

import {
  FolderKanban, Plus, Search, MapPin, Calendar, DollarSign,
  TrendingUp, Percent, X, Trash2, Edit2, FileText, Hammer,
  Users, HardHat, Loader2, TrendingDown, Info, Briefcase
} from 'lucide-react';

// Replicate Zod schemas locally since importing typescript schemas might have path issues
const projectStatusEnum = z.enum(['PLANNING', 'RUNNING', 'COMPLETED', 'ARCHIVED']);
const projectTypeEnum = z.enum(['CONSULTANCY', 'SUPERVISION', 'CONSTRUCTION', 'SUPPLYING']);

const projectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(120, 'Project name is too long'),
  code: z.string().min(2, 'Project code is required').max(30, 'Project code is too long')
    .regex(/^[A-Z0-9\-_]+$/i, 'Code can only contain letters, numbers, hyphens and underscores'),
  clientName: z.string().min(2, 'Client name is required'),
  clientContactNumber: z.string().min(5, 'Contact number is required'),
  projectLocation: z.string().min(3, 'Location is required'),
  startDate: z.string().min(1, 'Start date is required'),
  expectedCompletionDate: z.string().min(1, 'Completion date is required'),
  estimatedBudget: z.string().min(1, 'Budget is required')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, { message: 'Budget must be a positive number' }),
  status: projectStatusEnum,
  projectType: projectTypeEnum,
  description: z.string().max(1000, 'Description too long').optional().or(z.literal('')),
}).refine(
  (data) => new Date(data.expectedCompletionDate) > new Date(data.startDate),
  { message: 'Completion date must be after start date', path: ['expectedCompletionDate'] }
);

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ApiProject {
  id: string;
  name: string;
  code: string;
  clientName: string;
  clientContactNumber: string;
  projectLocation: string;
  startDate: string;
  expectedCompletionDate: string;
  estimatedBudget: number;
  status: 'PLANNING' | 'RUNNING' | 'COMPLETED' | 'ARCHIVED';
  projectType: 'CONSULTANCY' | 'SUPERVISION' | 'CONSTRUCTION' | 'SUPPLYING';
  description?: string;
  cashIns?: any[];
  cashOuts?: any[];
  materials?: any[];
  labours?: any[];
  documents?: any[];
  projectVendors?: { id: string; contractAmount: number; paidAmount: number; dueAmount: number; vendor?: { id: string; name: string; workType: string } }[];
  projectSuppliers?: { id: string; contractAmount: number; paidAmount: number; dueAmount: number; supplier?: { id: string; name: string } }[];
}

export default function ProjectsPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;
  const { toasts, removeToast, success, error, handlePromise } = useToast();

  if (!user) return null;

  if (user.role !== 'SUPER_ADMIN') {
    return (
      <AuthenticatedLayout>
        <Head title="Projects" />
        <div className="border border-slate-800 rounded-2xl p-16 text-center text-slate-500">
          <FolderKanban className="h-10 w-10 mx-auto text-slate-700 mb-3" />
          <p className="font-semibold text-sm">Forbidden Access</p>
          <p className="text-xs mt-1 text-slate-600">You do not have permissions to view projects.</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Projects list state
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Modal & Edit states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Details drawer state
  const [selectedProject, setSelectedProject] = useState<ApiProject | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // Form states
  const [isBusy, setIsBusy] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      code: '',
      clientName: '',
      clientContactNumber: '',
      projectLocation: '',
      startDate: '',
      expectedCompletionDate: '',
      estimatedBudget: '',
      status: 'PLANNING',
      projectType: 'CONSTRUCTION',
      description: '',
    },
    mode: 'all',
  });

  const fetchProjects = async () => {
    setIsFetching(true);
    setFetchError(false);
    try {
      const res = await axios.get('/api/projects', {
        params: {
          page,
          limit,
          search: debouncedSearchTerm,
          status: statusFilter !== 'ALL' ? statusFilter : undefined
        }
      });
      if (res.data.status === 'success') {
        setProjects(res.data.data.projects || []);
        setTotalItems(res.data.data.total || 0);
      } else {
        setFetchError(true);
      }
    } catch (err) {
      setFetchError(true);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [page, limit, statusFilter, debouncedSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Track selected project updates when projects list refreshes
  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find((p) => p.id === selectedProject.id);
      if (updated) {
        setSelectedProject(updated);
      }
    }
  }, [projects, selectedProject]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedProjectId(null);
    reset({
      name: '',
      code: '',
      clientName: '',
      clientContactNumber: '',
      projectLocation: '',
      startDate: '',
      expectedCompletionDate: '',
      estimatedBudget: '',
      status: 'PLANNING',
      projectType: 'CONSTRUCTION',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project: ApiProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode('edit');
    setSelectedProjectId(project.id);
    reset({
      name: project.name,
      code: project.code,
      clientName: project.clientName,
      clientContactNumber: project.clientContactNumber,
      projectLocation: project.projectLocation,
      startDate: new Date(project.startDate).toISOString().split('T')[0],
      expectedCompletionDate: new Date(project.expectedCompletionDate).toISOString().split('T')[0],
      estimatedBudget: project.estimatedBudget.toString(),
      status: project.status,
      projectType: project.projectType,
      description: project.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await handlePromise(axios.delete(`/api/projects/${projectToDelete}`), {
        successMessage: 'Project deleted successfully',
      });
      fetchProjects();
      if (selectedProject?.id === projectToDelete) {
        setIsDetailsOpen(false);
      }
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
    } catch (err) {
      // Handled by toast
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (values: ProjectFormValues) => {
    setIsBusy(true);
    try {
      const payload = {
        ...values,
        estimatedBudget: parseFloat(values.estimatedBudget),
      };
      if (modalMode === 'create') {
        await handlePromise(axios.post('/api/projects', payload), {
          successMessage: 'Project created successfully',
        });
      } else if (selectedProjectId) {
        await handlePromise(axios.patch(`/api/projects/${selectedProjectId}`, payload), {
          successMessage: 'Project updated successfully',
        });
      }
      fetchProjects();
      setIsModalOpen(false);
    } catch (err) {
      // Handled by toast
    } finally {
      setIsBusy(false);
    }
  };

  const handleProjectClick = async (project: ApiProject) => {
    setSelectedProject(project);
    setIsDetailsOpen(true);
    // Fetch deep relations if not present
    try {
      const res = await axios.get(`/api/projects/${project.id}`);
      if (res.data.status === 'success') {
        setSelectedProject(res.data.data.project);
      }
    } catch (err) {
      // Silent error
    }
  };

  // Profitability calculations
  const calculateProfitability = (project: ApiProject | null) => {
    if (!project) return null;

    const projectCashIns = project.cashIns || [];
    const revenue =
      projectCashIns.reduce((sum: number, ci: any) => sum + ci.amount, 0) ||
      project.estimatedBudget;

    const cashOuts = project.cashOuts || [];
    const materialsCost = cashOuts
      .filter((co: any) => co.expenseCategory === 'MATERIALS')
      .reduce((sum: number, co: any) => sum + co.amount, 0);
    const laborCost = cashOuts
      .filter((co: any) => co.expenseCategory === 'LABOR')
      .reduce((sum: number, co: any) => sum + co.amount, 0);
    const vendorCost = cashOuts
      .filter((co: any) => co.expenseCategory === 'VENDOR_PAYMENT')
      .reduce((sum: number, co: any) => sum + co.amount, 0);
    const salaryCost = cashOuts
      .filter((co: any) => co.expenseCategory === 'EMPLOYEE_SALARY')
      .reduce((sum: number, co: any) => sum + co.amount, 0);
    const otherCost = cashOuts
      .filter(
        (co: any) =>
          !['MATERIALS', 'LABOR', 'VENDOR_PAYMENT', 'EMPLOYEE_SALARY'].includes(
            co.expenseCategory
          )
      )
      .reduce((sum: number, co: any) => sum + co.amount, 0);

    const totalCost = materialsCost + laborCost + vendorCost + salaryCost + otherCost;
    const grossProfit = revenue - totalCost;
    const netProfit = grossProfit;
    const profitPercentage = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      revenue,
      materialsCost,
      laborCost,
      vendorCost,
      salaryCost,
      otherCost,
      totalCost,
      grossProfit,
      netProfit,
      profitPercentage,
    };
  };

  const profitability = calculateProfitability(selectedProject);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'text-slate-400 border-slate-500/20 bg-slate-500/5';
      case 'RUNNING':
        return 'text-blue-400 border-blue-500/20 bg-blue-500/5';
      case 'COMPLETED':
        return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'ARCHIVED':
        return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
      default:
        return 'text-slate-400 border-slate-500/20 bg-slate-500/5';
    }
  };

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'CONSULTANCY':
        return 'Consultancy';
      case 'SUPERVISION':
        return 'Supervision';
      case 'CONSTRUCTION':
        return 'Construction';
      case 'SUPPLYING':
        return 'Supplying';
      default:
        return type || 'N/A';
    }
  };

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'CONSULTANCY':
        return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      case 'SUPERVISION':
        return 'text-purple-400 border-purple-500/20 bg-purple-500/5';
      case 'CONSTRUCTION':
        return 'text-sky-400 border-sky-500/20 bg-sky-500/5';
      case 'SUPPLYING':
        return 'text-teal-400 border-teal-500/20 bg-teal-500/5';
      default:
        return 'text-slate-500 border-slate-500/20 bg-slate-500/5';
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Projects" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex-1 space-y-6">
        {/* Header section */}
        <div className="flex flex-col items-start md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 flex items-center gap-2">
              <FolderKanban className="h-6 w-6 text-cyan-400" />
              Construction Projects
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Manage infrastructure development sites, client details, and budgets
            </p>
          </div>

          {/* Action buttons */}
          {(user?.role === 'SUPER_ADMIN' ||
            user?.role === 'ADMIN' ||
            user?.role === 'PROJECT_MANAGER') && (
            <Button
              onClick={handleOpenCreate}
              icon={<Plus className="h-5 w-5" />}
            >
              New Project
            </Button>
          )}
        </div>

        {/* Filter and search bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Search by project name, code, client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL" className="bg-slate-900 text-slate-200">All Statuses</option>
            <option value="PLANNING" className="bg-slate-900 text-slate-200">PLANNING</option>
            <option value="RUNNING" className="bg-slate-900 text-slate-200">RUNNING</option>
            <option value="COMPLETED" className="bg-slate-900 text-slate-200">COMPLETED</option>
            <option value="ARCHIVED" className="bg-slate-900 text-slate-200">ARCHIVED</option>
          </Select>
        </div>

        {/* Main Content Area */}
        {isFetching && projects.length === 0 ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
            <p className="text-slate-500 text-xs font-semibold">Loading projects database...</p>
          </div>
        ) : fetchError ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-6">
            <Info className="h-10 w-10 text-rose-500 mb-3" />
            <p className="text-slate-400 text-sm font-semibold">Failed to fetch project listings</p>
            <p className="text-slate-500 text-xs mt-1">Please try refreshing the page.</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4">
            <FolderKanban className="h-12 w-12 text-slate-800 mb-3" />
            <p className="text-slate-400 text-sm font-bold">No projects found</p>
            <p className="text-slate-600 text-xs mt-1 max-w-xs mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or status filter settings.'
                : 'Create a new project workspace to start tracking materials and accounting.'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/25 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <th className="py-4 px-6">Code &amp; Name</th>
                    <th className="py-4 px-4">Client Contact</th>
                    <th className="py-4 px-4">Type</th>
                    <th className="py-4 px-4 text-right">Total Amount</th>
                    <th className="py-4 px-4 text-right">Paid Amount</th>
                    <th className="py-4 px-4 text-right">Due Amount</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {projects.map((project) => {
                    const paidAmount = project.cashIns?.reduce((sum: number, ci: any) => sum + ci.amount, 0) || 0;
                    const dueAmount = project.estimatedBudget - paidAmount;
                    return (
                      <tr
                        key={project.id}
                        onClick={() => handleProjectClick(project)}
                        className="hover:bg-slate-900/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-6 max-w-xs">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                            {project.code}
                          </span>
                          <h4 className="font-bold text-slate-200 mt-0.5 group-hover:text-cyan-300 transition-colors truncate">
                            {project.name}
                          </h4>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-slate-300 block truncate w-32">
                            {project.clientName}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {project.clientContactNumber}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getProjectTypeColor(
                              project.projectType
                            )}`}
                          >
                            {getProjectTypeLabel(project.projectType)}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-200 text-right">
                          {formatCurrencyLocal(project.estimatedBudget)}
                        </td>
                        <td className="py-4 px-4 font-bold text-emerald-400 text-right">
                          {formatCurrencyLocal(paidAmount)}
                        </td>
                        <td className="py-4 px-4 font-bold text-right">
                          <span className={dueAmount > 0 ? 'text-rose-500' : 'text-emerald-400'}>
                            {formatCurrencyLocal(dueAmount)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(
                              project.status
                            )}`}
                          >
                            {project.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {(user?.role === 'SUPER_ADMIN' ||
                              user?.role === 'ADMIN' ||
                              user?.role === 'PROJECT_MANAGER') && (
                              <button
                                onClick={(e) => handleOpenEdit(project, e)}
                                className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/5 rounded-lg border border-transparent hover:border-cyan-500/10 transition-all cursor-pointer"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                            {user?.role === 'SUPER_ADMIN' && (
                              <button
                                onClick={(e) => handleDeleteClick(project.id, e)}
                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg border border-transparent hover:border-rose-500/10 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

        {/* Details Slide-Over Drawer */}
        {selectedProject && profitability && (
          <Drawer
            open={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            title={<span className="line-clamp-1">{selectedProject.name}</span>}
            description={`Project Code: ${selectedProject.code}`}
            size="md"
          >
            <div className="space-y-6">
                {/* Project Stats Summary Widgets */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                      <DollarSign className="h-4 w-4 text-cyan-400" />
                      Project Revenue
                    </div>
                    <span className="text-base font-bold text-slate-100">
                      {formatCurrencyLocal(profitability.revenue)}
                    </span>
                    <p className="text-[9px] text-slate-500 mt-0.5">Based on client collections</p>
                  </div>

                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                      <TrendingDown className="h-4 w-4 text-rose-400" />
                      Total Expenses
                    </div>
                    <span className="text-base font-bold text-slate-100">
                      {formatCurrencyLocal(profitability.totalCost)}
                    </span>
                    <p className="text-[9px] text-slate-500 mt-0.5">Material + Labor + Vendor + Salary</p>
                  </div>

                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      Net Profit
                    </div>
                    <span
                      className={`text-base font-bold ${
                        profitability.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrencyLocal(profitability.netProfit)}
                    </span>
                    <p className="text-[9px] text-slate-500 mt-0.5">Revenue minus total cost</p>
                  </div>

                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
                      <Percent className="h-4 w-4 text-purple-400" />
                      Profit Margin
                    </div>
                    <span
                      className={`text-base font-bold ${
                        profitability.profitPercentage >= 0 ? 'text-purple-400' : 'text-rose-400'
                      }`}
                    >
                      {profitability.profitPercentage.toFixed(2)}%
                    </span>
                    <p className="text-[9px] text-slate-500 mt-0.5">Gross return yield</p>
                  </div>
                </div>

                {/* Detailed Expense Breakdown */}
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">
                    Expense Cost Center breakdown
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-400">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <Hammer className="h-3.5 w-3.5 text-slate-500" />
                        Materials Purchase:
                      </span>
                      <span className="font-bold text-slate-200">
                        {formatCurrencyLocal(profitability.materialsCost)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <HardHat className="h-3.5 w-3.5 text-slate-500" />
                        Labor Wages:
                      </span>
                      <span className="font-bold text-slate-200">
                        {formatCurrencyLocal(profitability.laborCost)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                        Vendor Payments:
                      </span>
                      <span className="font-bold text-slate-200">
                        {formatCurrencyLocal(profitability.vendorCost)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-slate-500" />
                        Engineers &amp; Staff Salaries:
                      </span>
                      <span className="font-bold text-slate-200">
                        {formatCurrencyLocal(profitability.salaryCost)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <Info className="h-3.5 w-3.5 text-slate-500" />
                        Other &amp; Office Overheads:
                      </span>
                      <span className="font-bold text-slate-200">
                        {formatCurrencyLocal(profitability.otherCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stakeholders Count */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 border border-slate-800 rounded-xl bg-slate-950/20">
                    <span className="block text-[10px] text-slate-500 font-semibold uppercase">
                      Materials Purchase
                    </span>
                    <span className="block text-sm font-bold text-slate-200 mt-1">
                      {selectedProject.materials?.length || 0} Invoice(s)
                    </span>
                  </div>
                  <div className="p-3 border border-slate-800 rounded-xl bg-slate-950/20">
                    <span className="block text-[10px] text-slate-500 font-semibold uppercase">
                      Assigned Labor
                    </span>
                    <span className="block text-sm font-bold text-slate-200 mt-1">
                      {selectedProject.labours?.length || 0} worker(s)
                    </span>
                  </div>
                  <div className="p-3 border border-slate-800 rounded-xl bg-slate-950/20">
                    <span className="block text-[10px] text-slate-500 font-semibold uppercase">
                      Assigned Vendors
                    </span>
                    <span className="block text-sm font-bold text-slate-200 mt-1">
                      {selectedProject.projectVendors?.length || 0} vendor(s)
                    </span>
                  </div>
                  <div className="p-3 border border-slate-800 rounded-xl bg-slate-950/20">
                    <span className="block text-[10px] text-slate-500 font-semibold uppercase">
                      Assigned Suppliers
                    </span>
                    <span className="block text-sm font-bold text-slate-200 mt-1">
                      {selectedProject.projectSuppliers?.length || 0} supplier(s)
                    </span>
                  </div>
                  <div className="p-3 border border-slate-800 rounded-xl bg-slate-950/20">
                    <span className="block text-[10px] text-slate-500 font-semibold uppercase">
                      Related Docs
                    </span>
                    <span className="block text-sm font-bold text-slate-200 mt-1">
                      {selectedProject.documents?.length || 0} document(s)
                    </span>
                  </div>
                </div>

                {/* Assigned Vendors & Suppliers — who's owed what on this project */}
                {((selectedProject.projectVendors?.length ?? 0) > 0 || (selectedProject.projectSuppliers?.length ?? 0) > 0) && (
                  <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/10">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">
                      Assigned Vendors &amp; Suppliers
                    </h3>
                    <div className="space-y-2 text-xs">
                      {selectedProject.projectVendors?.map((pv) => (
                        <div key={pv.id} className="flex justify-between items-baseline">
                          <span className="text-slate-300">
                            {pv.vendor?.name || 'Unknown vendor'}{' '}
                            <span className="text-slate-600">· Vendor · {pv.vendor?.workType}</span>
                          </span>
                          <span className="text-slate-400">
                            Contract {formatCurrencyLocal(pv.contractAmount)} ·{' '}
                            <span className="text-rose-400 font-bold">Due {formatCurrencyLocal(pv.dueAmount)}</span>
                          </span>
                        </div>
                      ))}
                      {selectedProject.projectSuppliers?.map((ps) => (
                        <div key={ps.id} className="flex justify-between items-baseline">
                          <span className="text-slate-300">
                            {ps.supplier?.name || 'Unknown supplier'} <span className="text-slate-600">· Supplier</span>
                          </span>
                          <span className="text-slate-400">
                            Contract {formatCurrencyLocal(ps.contractAmount)} ·{' '}
                            <span className="text-rose-400 font-bold">Due {formatCurrencyLocal(ps.dueAmount)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Basic Info */}
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/10 space-y-2 text-xs text-slate-400">
                  <p>
                    <span className="font-bold text-slate-300">Client Name:</span>{' '}
                    {selectedProject.clientName}
                  </p>
                  <p>
                    <span className="font-bold text-slate-300">Contact Number:</span>{' '}
                    {selectedProject.clientContactNumber}
                  </p>
                  <p>
                    <span className="font-bold text-slate-300">Project Type:</span>{' '}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getProjectTypeColor(selectedProject.projectType)}`}>
                      {getProjectTypeLabel(selectedProject.projectType)}
                    </span>
                  </p>
                  <p>
                    <span className="font-bold text-slate-300">Project Location:</span>{' '}
                    {selectedProject.projectLocation}
                  </p>
                  <p>
                    <span className="font-bold text-slate-300">Description:</span>{' '}
                    {selectedProject.description || 'No description provided.'}
                  </p>
                </div>
              </div>
          </Drawer>
        )}

        {/* Create/Edit Modal */}
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-cyan-400" />
              {modalMode === 'create' ? 'Create Construction Project' : 'Edit Project Details'}
            </div>
          }
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Project Name</label>
                    <Input
                      {...register('name')}
                      placeholder="e.g. Skyline Heights"
                      error={errors.name?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Project Code</label>
                    <Input
                      disabled={modalMode === 'edit'}
                      {...register('code')}
                      placeholder="e.g. PRJ-SKY-001"
                      error={errors.code?.message}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Client Name</label>
                    <Input
                      {...register('clientName')}
                      placeholder="e.g. Vertex Devs Ltd"
                      error={errors.clientName?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Client Contact</label>
                    <Input
                      {...register('clientContactNumber')}
                      placeholder="e.g. +1 555-1234"
                      error={errors.clientContactNumber?.message}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Location</label>
                  <Input
                    {...register('projectLocation')}
                    placeholder="e.g. 12 Bridge Lane, West Side"
                    error={errors.projectLocation?.message}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Start Date</label>
                    <Controller
                      name="startDate"
                      control={control}
                      render={({ field }) => (
                        <DatePickerInput
                          id="startDate"
                          value={field.value}
                          onChange={field.onChange}
                          error={!!errors.startDate}
                        />
                      )}
                    />
                    {errors.startDate && <p className="text-rose-400 text-[10px] mt-1">{errors.startDate.message}</p>}
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Completion Date</label>
                    <Controller
                      name="expectedCompletionDate"
                      control={control}
                      render={({ field }) => (
                        <DatePickerInput
                          id="expectedCompletionDate"
                          value={field.value}
                          onChange={field.onChange}
                          error={!!errors.expectedCompletionDate}
                        />
                      )}
                    />
                    {errors.expectedCompletionDate && (
                      <p className="text-rose-400 text-[10px] mt-1">{errors.expectedCompletionDate.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Est. Budget ($)</label>
                    <Input
                      {...register('estimatedBudget')}
                      placeholder="e.g. 1500000"
                      error={errors.estimatedBudget?.message}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Current Status</label>
                    <Select
                      {...register('status')}
                      error={errors.status?.message}
                    >
                      <option value="PLANNING" className="bg-slate-900 text-slate-200">PLANNING</option>
                      <option value="RUNNING" className="bg-slate-900 text-slate-200">RUNNING</option>
                      <option value="COMPLETED" className="bg-slate-900 text-slate-200">COMPLETED</option>
                      <option value="ARCHIVED" className="bg-slate-900 text-slate-200">ARCHIVED</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Project Type</label>
                    <Select
                      {...register('projectType')}
                      error={errors.projectType?.message}
                    >
                      <option value="CONSULTANCY" className="bg-slate-900 text-slate-200">Consultancy</option>
                      <option value="SUPERVISION" className="bg-slate-900 text-slate-200">Supervision</option>
                      <option value="CONSTRUCTION" className="bg-slate-900 text-slate-200">Construction</option>
                      <option value="SUPPLYING" className="bg-slate-900 text-slate-200">Supplying</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Description</label>
                  <textarea
                    rows={3}
                    {...register('description')}
                    placeholder="Enter project summary details..."
                    className={`w-full px-3 py-2 bg-slate-950/40 border border-slate-800 focus:border-cyan-500/80 focus:ring-cyan-500/30 rounded-xl text-slate-200 focus:outline-none focus:ring-1 text-xs transition-all placeholder:text-slate-700 shadow-inner ${
                      errors.description
                        ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
                        : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/30'
                    }`}
                  />
                  {errors.description && <p className="text-rose-400 text-[10px] mt-1">{errors.description.message}</p>}
                </div>

                <div className="pt-4 flex justify-end gap-2.5">
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
                    {modalMode === 'create' ? 'Create Project' : 'Save Changes'}
                  </Button>
                </div>
              </form>
        </Modal>

        {/* Delete Confirmation Alert */}
        <AlertDialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Project?"
          description="Are you sure you want to delete this project? This will permanently remove all material records, labour assignments, and transactions related to this project."
          confirmText="Delete Project"
          isConfirming={isDeleting}
        />
      </div>
    </AuthenticatedLayout>
  );
}
