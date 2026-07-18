import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
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
  Briefcase, Plus, Search, Phone, MapPin, Hammer, Trash2, Edit2, Loader2, Clock, X
} from 'lucide-react';

const vendorSchema = z.object({
  name: z.string().min(2, 'Vendor name is required'),
  companyName: z.string().optional().or(z.literal('')),
  contactNumber: z.string().min(5, 'Contact number is required'),
  address: z.string().optional().or(z.literal('')),
  workType: z.string().min(2, 'Work type is required'),
  notes: z.string().max(500).optional().or(z.literal('')),
  assignments: z.array(z.object({
    projectId: z.string().min(1, 'Project is required'),
    contractAmount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: 'Contract amount must be a non-negative number',
    }),
  })).optional(),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

interface ApiVendor {
  id: string;
  name: string;
  companyName?: string;
  contactNumber: string;
  address?: string;
  workType: string;
  contractAmount: number;
  paidAmount: number;
  dueAmount: number;
  notes?: string;
  materials?: any[];
  cashOuts?: any[];
  projectAssignments?: any[];
}

export default function VendorsPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;
  const { toasts, removeToast, success, error, handlePromise } = useToast();

  const [projects, setProjects] = useState<any[]>([]);
  const [projectFilter, setProjectFilter] = useState('ALL');

  const {
    items: vendors, setItems: setVendors, totalItems, isFetching, fetchError, refetch: fetchVendors,
    page, setPage, limit, setLimit, searchTerm, setSearchTerm,
  } = useResourceList<ApiVendor>('/api/vendors', {
    listKey: 'vendors',
    filters: { projectId: projectFilter !== 'ALL' ? projectFilter : undefined },
  });

  const { create: createVendor, update: updateVendor, remove: removeVendor } =
    useCrudMutations('/api/vendors', handlePromise, fetchVendors);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const [selectedVendor, setSelectedVendor] = useState<ApiVendor | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<string | null>(null);

  const [isBusy, setIsBusy] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      companyName: '',
      contactNumber: '',
      address: '',
      workType: '',
      notes: '',
      assignments: [],
    },
    mode: 'all',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'assignments',
  });

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

  useEffect(() => {
    fetchProjects();
  }, []);

  // Track updates to selected vendor when list refreshes
  useEffect(() => {
    if (selectedVendor) {
      const updated = vendors.find((v) => v.id === selectedVendor.id);
      if (updated) {
        setSelectedVendor(updated);
      }
    }
  }, [vendors, selectedVendor]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedVendorId(null);
    reset({
      name: '',
      companyName: '',
      contactNumber: '',
      address: '',
      workType: '',
      notes: '',
      assignments: [{ projectId: '', contractAmount: '' }],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vnd: ApiVendor, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode('edit');
    setSelectedVendorId(vnd.id);

    const formAssignments = (vnd.projectAssignments || []).map((pa) => ({
      projectId: pa.projectId,
      contractAmount: pa.contractAmount.toString(),
    }));

    reset({
      name: vnd.name,
      companyName: vnd.companyName || '',
      contactNumber: vnd.contactNumber,
      address: vnd.address || '',
      workType: vnd.workType,
      notes: vnd.notes || '',
      assignments: formAssignments,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVendorToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!vendorToDelete) return;
    setIsDeleting(true);
    try {
      await removeVendor(vendorToDelete, 'Vendor deleted successfully');
      if (selectedVendor?.id === vendorToDelete) {
        setIsHistoryOpen(false);
      }
      setDeleteConfirmOpen(false);
      setVendorToDelete(null);
    } catch (err) {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (values: VendorFormValues) => {
    setIsBusy(true);
    try {
      const payload = {
        ...values,
        assignments: (values.assignments || []).map((a) => ({
          projectId: a.projectId,
          contractAmount: parseFloat(a.contractAmount || '0'),
        })),
      };
      if (modalMode === 'create') {
        await createVendor(payload, 'Vendor registered successfully');
      } else if (selectedVendorId) {
        await updateVendor(selectedVendorId, payload, 'Vendor updated successfully');
      }
      setIsModalOpen(false);
    } catch (err) {
      // ignore
    } finally {
      setIsBusy(false);
    }
  };

  const handleViewHistory = async (vnd: ApiVendor) => {
    setSelectedVendor(vnd);
    setIsHistoryOpen(true);
    try {
      const res = await axios.get(`/api/vendors/${vnd.id}`);
      if (res.data.status === 'success') {
        setSelectedVendor(res.data.data.vendor);
      }
    } catch (err) {
      // ignore
    }
  };

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AuthenticatedLayout>
      <Head title="Vendors" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-350 flex items-center gap-2">
              <Briefcase className="h-5.5 w-5.5 text-cyan-400" />
              Vendor Assignments
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Register subcontracting partners, assign multiple project contracts, track overall/project billing milestones and dues
            </p>
          </div>

          {user && !['ACCOUNTANT', 'DATA_ENTRY_OPERATOR'].includes(user.role) && (
            <Button
              onClick={handleOpenCreate}
              icon={<Plus className="h-4.5 w-4.5" />}
            >
              Register Vendor
            </Button>
          )}
        </div>

        {/* Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by company, vendor name or trade type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="flex-1"
          />
          <Select
            value={projectFilter}
            onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
            className="sm:w-[260px]"
          >
            <option value="ALL" className="bg-slate-900 text-slate-200">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                {p.code} - {p.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Vendors registry grid */}
        {isFetching && vendors.length === 0 ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
            <span className="text-slate-500 text-xs font-semibold">Loading vendors database...</span>
          </div>
        ) : fetchError ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-6">
            <Briefcase className="h-10 w-10 text-rose-500 mb-3" />
            <p className="text-slate-350 text-sm font-semibold">Failed to fetch vendors registry</p>
            <p className="text-slate-500 text-xs mt-1">Please try refreshing the page.</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4">
            <Briefcase className="h-12 w-12 text-slate-800 mb-3" />
            <p className="text-slate-400 text-sm font-bold">No vendors registered</p>
            <p className="text-slate-600 text-xs mt-1 max-w-xs mx-auto">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'Add a subcontracting partner to track tasks, contract scopes, and billings.'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/25 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md animate-in fade-in duration-300">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <th className="py-5 px-6">Vendor</th>
                    <th className="py-5 px-6">Projects Assigned</th>
                    <th className="py-5 px-6">Contact</th>
                    <th className="py-5 px-6 text-right">Total Contract</th>
                    <th className="py-5 px-6 text-right">Total Paid</th>
                    <th className="py-5 px-6 text-right">Total Due</th>
                    {user && !['ACCOUNTANT', 'DATA_ENTRY_OPERATOR'].includes(user.role) && (
                      <th className="py-5 px-6 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {vendors.map((vnd) => (
                    <tr
                      key={vnd.id}
                      onClick={() => handleViewHistory(vnd)}
                      className="hover:bg-slate-900/40 transition-colors cursor-pointer"
                    >
                      <td className="py-5 px-6 max-w-[220px]">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                          <Hammer className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{vnd.workType}</span>
                        </span>
                        <h4 className="font-bold text-slate-200 mt-0.5 truncate">{vnd.name}</h4>
                        {vnd.companyName && (
                          <p className="text-slate-400 text-[11px] font-semibold mt-0.5 truncate">{vnd.companyName}</p>
                        )}
                      </td>
                      <td className="py-5 px-6 max-w-[200px]">
                        {vnd.projectAssignments && vnd.projectAssignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {vnd.projectAssignments.map((pa: any) => (
                              <span
                                key={pa.id}
                                className="text-[9px] font-bold px-2 py-1 bg-slate-950/80 border border-slate-850 text-slate-400 rounded-lg uppercase tracking-wider font-mono hover:text-cyan-400 transition-colors"
                                title={`${pa.project?.name || ''} (Contract: ${formatCurrencyLocal(pa.contractAmount)})`}
                              >
                                {pa.project?.code || pa.project?.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-5 px-6 text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{vnd.contactNumber}</span>
                        </div>
                        {vnd.address && (
                          <div className="flex items-center gap-1.5 mt-1 max-w-[180px]">
                            <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{vnd.address}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-5 px-6 text-right font-bold text-slate-200">
                        {formatCurrencyLocal(vnd.contractAmount)}
                      </td>
                      <td className="py-5 px-6 text-right font-bold text-emerald-400">
                        {formatCurrencyLocal(vnd.paidAmount)}
                      </td>
                      <td className="py-5 px-6 text-right">
                        <span className={`font-bold ${vnd.dueAmount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                          {formatCurrencyLocal(vnd.dueAmount)}
                        </span>
                      </td>
                      {user && !['ACCOUNTANT', 'DATA_ENTRY_OPERATOR'].includes(user.role) && (
                        <td className="py-5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => handleOpenEdit(vnd, e)}
                              className="p-1.5 text-slate-450 hover:text-cyan-400 hover:bg-cyan-500/5 rounded-lg border border-transparent hover:border-cyan-500/10 transition-all cursor-pointer"
                              title="Edit vendor"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {['SUPER_ADMIN', 'ADMIN'].includes(user.role) && (
                              <button
                                onClick={(e) => handleDeleteClick(vnd.id, e)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg border border-transparent hover:border-rose-500/10 transition-all cursor-pointer"
                                title="Delete vendor"
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
              currentPage={page}
              totalPages={Math.ceil(totalItems / limit)}
              totalItems={totalItems}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(l) => { setLimit(l); setPage(1); }}
            />
          </div>
        )}

        {/* History Drawer */}
        <Drawer
          open={isHistoryOpen && !!selectedVendor}
          onClose={() => setIsHistoryOpen(false)}
          title={
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-200 text-sm leading-none">{selectedVendor?.name}</h2>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">Vendor Ledger Log</p>
              </div>
            </div>
          }
          size="md"
        >
          {selectedVendor && (
            <div className="space-y-6">
                {/* Project-wise Billings */}
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30">
                  <h3 className="text-xs font-bold text-slate-350 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">
                    Project-wise Billings Breakdown
                  </h3>
                  {!selectedVendor.projectAssignments || selectedVendor.projectAssignments.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">No active project assignments.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedVendor.projectAssignments.map((pa) => (
                        <div key={pa.id} className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-200 text-xs">{pa.project?.code} - {pa.project?.name}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                            <div>
                              <span className="text-slate-550 block">Contract</span>
                              <span className="font-semibold text-slate-300">{formatCurrencyLocal(pa.contractAmount)}</span>
                            </div>
                            <div>
                              <span className="text-slate-550 block">Paid</span>
                              <span className="font-semibold text-emerald-400">{formatCurrencyLocal(pa.paidAmount)}</span>
                            </div>
                            <div>
                              <span className="text-slate-550 block">Due</span>
                              <span className={`font-semibold ${pa.dueAmount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                {formatCurrencyLocal(pa.dueAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payments History */}
                <div>
                  <h3 className="text-xs font-bold text-slate-350 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    Milestone Payments Disbursed
                  </h3>
                  {!selectedVendor.cashOuts || selectedVendor.cashOuts.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">No cash disbursements logged.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {selectedVendor.cashOuts.map((co: any) => (
                        <div
                          key={co.id}
                          className="text-xs p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm"
                        >
                          <div>
                            <p className="font-semibold text-slate-200">Disbursed via {co.paymentMethod}</p>
                            <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                              {new Date(co.date).toLocaleDateString()} • Ref:{' '}
                              {co.referenceNumber || 'N/A'}
                            </span>
                          </div>
                          <span className="font-bold text-emerald-400">{formatCurrencyLocal(co.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Progress Summary */}
                <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/30 text-xs space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Vendor billing status
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-slate-450">Agreed Contract Cap (Total):</span>
                    <span className="font-bold text-slate-200">{formatCurrencyLocal(selectedVendor.contractAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">Disbursed Milestones (Total):</span>
                    <span className="font-bold text-emerald-400">{formatCurrencyLocal(selectedVendor.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800/80 font-semibold">
                    <span className="text-slate-300">Remaining Due Liability (Total):</span>
                    <span className={`font-bold ${selectedVendor.dueAmount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {formatCurrencyLocal(selectedVendor.dueAmount)}
                    </span>
                  </div>
                </div>
            </div>
          )}
        </Drawer>

        {/* CRUD Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
                <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <Briefcase className="h-4.5 w-4.5 text-cyan-400" />
                  {modalMode === 'create' ? 'Register Vendor Profile' : 'Edit Vendor Profile'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-100 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Vendor Name</label>
                    <Input
                      {...register('name')}
                      placeholder="e.g. John Doe"
                      error={errors.name?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Company Name</label>
                    <Input
                      {...register('companyName')}
                      placeholder="e.g. Doe Excavations LLC"
                      error={errors.companyName?.message}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Contact Number</label>
                    <Input
                      {...register('contactNumber')}
                      placeholder="e.g. +1 555-9090"
                      error={errors.contactNumber?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Work Assignment (Trade)</label>
                    <Input
                      {...register('workType')}
                      placeholder="e.g. Electrical &amp; Wiring"
                      error={errors.workType?.message}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Office Address</label>
                  <Input
                    {...register('address')}
                    placeholder="e.g. 22 Trench Rd, West City"
                    error={errors.address?.message}
                  />
                </div>

                {/* Project Assignments Section */}
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest">
                      Project Assignments
                    </h4>
                    <button
                      type="button"
                      onClick={() => append({ projectId: '', contractAmount: '' })}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:text-slate-100 rounded-lg text-[10px] font-bold text-slate-400 transition-all cursor-pointer"
                    >
                      <Plus className="h-3 w-3 text-cyan-400" />
                      <span>Add Project Assignment</span>
                    </button>
                  </div>

                  {fields.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No project assignments added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-3 items-end bg-slate-950/40 p-3 border border-slate-850 rounded-xl">
                          <div className="col-span-8">
                            <label className="block text-slate-500 text-[10px] font-semibold mb-1.5">Project</label>
                            <Select
                              {...register(`assignments.${index}.projectId` as const)}
                              error={errors.assignments?.[index]?.projectId?.message}
                            >
                              <option value="" disabled className="bg-slate-900 text-slate-250">Select Project...</option>
                              {projects.map((p) => (
                                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                                  {p.code} - {p.name}
                                </option>
                              ))}
                            </Select>
                          </div>

                          <div className="col-span-3">
                            <label className="block text-slate-500 text-[10px] font-semibold mb-1.5">Contract ($)</label>
                            <Input
                              placeholder="0.00"
                              {...register(`assignments.${index}.contractAmount` as const)}
                              error={errors.assignments?.[index]?.contractAmount?.message}
                            />
                          </div>

                          <div className="col-span-1 flex justify-center pb-1">
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-md transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.assignments?.message && (
                    <p className="text-rose-400 text-[10px] mt-1">{errors.assignments.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Notes</label>
                  <textarea
                    rows={2}
                    {...register('notes')}
                    placeholder="e.g. Piling and foundations supplier..."
                    className={`w-full px-3 py-2 bg-slate-950/40 border border-slate-800 focus:border-cyan-500/80 focus:ring-cyan-500/30 rounded-xl text-slate-200 focus:outline-none focus:ring-1 text-xs transition-all placeholder:text-slate-650 shadow-inner ${
                      errors.notes
                        ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
                        : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/30'
                    }`}
                  />
                  {errors.notes && <p className="text-rose-400 text-[10px] mt-1">{errors.notes.message}</p>}
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
                    {modalMode === 'create' ? 'Register' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Alert */}
        <AlertDialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Vendor?"
          description="Are you sure you want to delete this vendor assignment? All associated transaction histories will no longer point to this vendor."
          confirmText="Delete"
          isConfirming={isDeleting}
        />
      </div>
    </AuthenticatedLayout>
  );
}
