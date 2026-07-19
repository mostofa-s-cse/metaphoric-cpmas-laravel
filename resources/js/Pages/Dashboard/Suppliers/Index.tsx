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
  Truck, Plus, Search, Phone, Mail, MapPin, X, Trash2, Edit2, Loader2, Clock, History
} from 'lucide-react';

const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  companyName: z.string().optional().or(z.literal('')),
  phoneNumber: z.string().min(5, 'Phone number is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
  assignments: z.array(z.object({
    projectId: z.string().min(1, 'Project is required'),
    contractAmount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
      message: 'Contract amount must be a non-negative number',
    }),
  })).optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface ApiSupplier {
  id: string;
  name: string;
  companyName?: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  openingBalance: number;
  notes?: string;
  currentDue: number;
  contractAmount: number;
  paidAmount: number;
  dueAmount: number;
  materials?: any[];
  cashOuts?: any[];
  projectAssignments?: any[];
}

export default function SuppliersPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;
  const { toasts, removeToast, success, error, handlePromise } = useToast();

  const [projects, setProjects] = useState<any[]>([]);
  const [projectFilter, setProjectFilter] = useState('ALL');

  const {
    items: suppliers, setItems: setSuppliers, totalItems, isFetching, fetchError, refetch: fetchSuppliers,
    page, setPage, limit, setLimit, searchTerm, setSearchTerm,
  } = useResourceList<ApiSupplier>('/api/suppliers', {
    listKey: 'suppliers',
    filters: { projectId: projectFilter !== 'ALL' ? projectFilter : undefined },
  });

  const { create: createSupplier, update: updateSupplier, remove: removeSupplier } =
    useCrudMutations('/api/suppliers', handlePromise, fetchSuppliers);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  const [selectedSupplier, setSelectedSupplier] = useState<ApiSupplier | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

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
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      companyName: '',
      phoneNumber: '',
      email: '',
      address: '',
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

  // Track updates to selected supplier when the list refreshes (e.g. after an
  // edit or delete elsewhere), without clobbering the richer detail fields
  // (materials/cashOuts) that only come from the full record fetched by
  // handleViewHistory(). The list endpoint's supplier objects are lighter
  // weight, so we keep whatever detail is already loaded and only refresh the
  // scalar fields from the list. Depending only on `suppliers` (not
  // `selectedSupplier`) prevents this effect from re-firing — and clobbering
  // the fetched detail — immediately after handleViewHistory() sets it.
  useEffect(() => {
    setSelectedSupplier((prev) => {
      if (!prev) return prev;
      const updated = suppliers.find((s) => s.id === prev.id);
      if (!updated) return prev;
      return {
        ...updated,
        materials: prev.materials ?? updated.materials,
        cashOuts: prev.cashOuts ?? updated.cashOuts,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedSupplierId(null);
    reset({
      name: '',
      companyName: '',
      phoneNumber: '',
      email: '',
      address: '',
      notes: '',
      assignments: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: ApiSupplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode('edit');
    setSelectedSupplierId(sup.id);
    reset({
      name: sup.name,
      companyName: sup.companyName || '',
      phoneNumber: sup.phoneNumber,
      email: sup.email || '',
      address: sup.address || '',
      notes: sup.notes || '',
      assignments: sup.projectAssignments?.map(a => ({
        projectId: a.projectId,
        contractAmount: a.contractAmount.toString(),
      })) || [],
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSupplierToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    try {
      await removeSupplier(supplierToDelete, 'Supplier deleted successfully');
      if (selectedSupplier?.id === supplierToDelete) {
        setIsHistoryOpen(false);
      }
      setDeleteConfirmOpen(false);
      setSupplierToDelete(null);
    } catch (err) {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (values: SupplierFormValues) => {
    setIsBusy(true);
    try {
      const payload = {
        ...values,
        email: values.email?.trim() ? values.email.trim() : undefined,
        assignments: values.assignments?.map(a => ({
          projectId: a.projectId,
          contractAmount: parseFloat(a.contractAmount || '0'),
        })) || [],
      };
      if (modalMode === 'create') {
        await createSupplier(payload, 'Supplier created successfully');
      } else if (selectedSupplierId) {
        await updateSupplier(selectedSupplierId, payload, 'Supplier updated successfully');
      }
      setIsModalOpen(false);
    } catch (err) {
      // ignore
    } finally {
      setIsBusy(false);
    }
  };

  const handleViewHistory = async (sup: ApiSupplier) => {
    setSelectedSupplier(sup);
    setIsHistoryOpen(true);
    try {
      const res = await axios.get(`/api/suppliers/${sup.id}`);
      if (res.data.status === 'success') {
        setSelectedSupplier(res.data.data.supplier);
      }
    } catch (err) {
      // ignore
    }
  };

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <AuthenticatedLayout>
      <Head title="Suppliers" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-350 flex items-center gap-2">
              <Truck className="h-5.5 w-5.5 text-cyan-400" />
              Supplier Registry
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Log procurement vendors, raw material purchases, outstanding liabilities and dues
            </p>
          </div>

          {user && user.role !== 'PROJECT_MANAGER' && (
            <Button
              onClick={handleOpenCreate}
              icon={<Plus className="h-4.5 w-4.5" />}
            >
              New Supplier
            </Button>
          )}
        </div>

        {/* Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by company or supplier name..."
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

        {/* Suppliers Table/Grid */}
        {isFetching && suppliers.length === 0 ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
            <span className="text-slate-500 text-xs font-semibold">Loading suppliers database...</span>
          </div>
        ) : fetchError ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-6">
            <Truck className="h-10 w-10 text-rose-500 mb-3" />
            <p className="text-slate-350 text-sm font-semibold">Failed to fetch suppliers registry</p>
            <p className="text-slate-500 text-xs mt-1">Please try refreshing the page.</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4">
            <Truck className="h-12 w-12 text-slate-800 mb-3" />
            <p className="text-slate-400 text-sm font-bold">No suppliers registered</p>
            <p className="text-slate-600 text-xs mt-1 max-w-xs mx-auto">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'Add a materials supplier to begin logging material purchases.'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/25 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md animate-in fade-in duration-300">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <th className="py-5 px-6">Supplier</th>
                    <th className="py-5 px-6">Projects Assigned</th>
                    <th className="py-5 px-6">Contact</th>
                    <th className="py-5 px-6 text-right">Total Contract</th>
                    <th className="py-5 px-6 text-right">Total Paid</th>
                    <th className="py-5 px-6 text-right">Total Due</th>
                    {user && user.role !== 'PROJECT_MANAGER' && <th className="py-5 px-6 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {suppliers.map((sup) => (
                    <tr
                      key={sup.id}
                      onClick={() => handleViewHistory(sup)}
                      className="hover:bg-slate-900/40 transition-colors cursor-pointer"
                    >
                      <td className="py-5 px-6 max-w-[220px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-200 truncate">{sup.name}</h4>
                          {!sup.phoneNumber && (
                            <span
                              className="shrink-0 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] font-bold text-amber-400 uppercase tracking-wide"
                              title="Auto-created from a Material Purchase's 'Other' supplier field — profile details (phone, address) were never filled in."
                            >
                              Other Entry
                            </span>
                          )}
                        </div>
                        {sup.companyName && (
                          <p className="text-slate-400 text-[11px] font-semibold mt-0.5 truncate">{sup.companyName}</p>
                        )}
                      </td>
                      <td className="py-5 px-6 max-w-[200px]">
                        {sup.projectAssignments && sup.projectAssignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {sup.projectAssignments.map((pa: any) => (
                              <span key={pa.id} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-[9px] font-semibold text-slate-400">
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
                          <span>{sup.phoneNumber || '—'}</span>
                        </div>
                        {sup.email && (
                          <div className="flex items-center gap-1.5 mt-1 max-w-[180px]">
                            <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{sup.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-5 px-6 text-right font-bold text-slate-200">
                        {formatCurrencyLocal(sup.contractAmount)}
                      </td>
                      <td className="py-5 px-6 text-right font-bold text-emerald-400">
                        {formatCurrencyLocal(sup.paidAmount)}
                      </td>
                      <td className="py-5 px-6 text-right">
                        <span className={`font-bold ${sup.dueAmount > 0 ? 'text-amber-400' : 'text-slate-450'}`}>
                          {formatCurrencyLocal(sup.dueAmount)}
                        </span>
                      </td>
                      {user && user.role !== 'PROJECT_MANAGER' && (
                        <td className="py-5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => handleOpenEdit(sup, e)}
                              className="p-1.5 text-slate-450 hover:text-cyan-400 hover:bg-cyan-500/5 rounded-lg border border-transparent hover:border-cyan-500/10 transition-all cursor-pointer"
                              title="Edit supplier"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {['SUPER_ADMIN', 'ADMIN'].includes(user.role) && (
                              <button
                                onClick={(e) => handleDeleteClick(sup.id, e)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg border border-transparent hover:border-rose-500/10 transition-all cursor-pointer"
                                title="Delete supplier"
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
        {isHistoryOpen && selectedSupplier && (
          <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10">
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)} />
            <div className="w-screen max-w-xl bg-slate-900 border-l border-slate-800 relative flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-355">
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-200 text-sm leading-none">{selectedSupplier.name}</h2>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Vendor Account Statement</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-slate-400 hover:text-slate-100 p-2 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Project-wise Billings */}
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30">
                  <h3 className="text-xs font-bold text-slate-350 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">
                    Project-wise Supply Billings
                  </h3>
                  {!selectedSupplier.projectAssignments || selectedSupplier.projectAssignments.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">No active project assignments.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedSupplier.projectAssignments.map((pa: any) => (
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

                {/* Purchases Logs */}
                <div>
                  <h3 className="text-xs font-bold text-slate-350 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <History className="h-4 w-4 text-cyan-400" />
                    Material Purchases History
                  </h3>
                  {!selectedSupplier.materials || selectedSupplier.materials.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">No purchase records registered.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedSupplier.materials.map((m: any) => (
                        <div
                          key={m.id}
                          className="text-xs p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm"
                        >
                          <div>
                            <p className="font-semibold text-slate-200">
                              {m.name} ({m.quantity} {m.unit})
                            </p>
                            <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                              Invoice: {m.invoiceNumber || 'N/A'} •{' '}
                              {new Date(m.purchaseDate).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="font-bold text-cyan-400">{formatCurrencyLocal(m.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payments Logs */}
                <div>
                  <h3 className="text-xs font-bold text-slate-350 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    Disbursed Payments History
                  </h3>
                  {!selectedSupplier.cashOuts || selectedSupplier.cashOuts.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">No outgoing cash payments registered.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedSupplier.cashOuts.map((co: any) => (
                        <div
                          key={co.id}
                          className="text-xs p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between shadow-sm"
                        >
                          <div>
                            <p className="font-semibold text-slate-200">Paid via {co.paymentMethod}</p>
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
              </div>
            </div>
          </div>
        )}

        {/* CRUD Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
                <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <Truck className="h-4.5 w-4.5 text-cyan-400" />
                  {modalMode === 'create' ? 'Create Supplier Profile' : 'Edit Supplier Profile'}
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
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Supplier Name</label>
                    <Input
                      {...register('name')}
                      placeholder="e.g. Apex Materials"
                      error={errors.name?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Company Name</label>
                    <Input
                      {...register('companyName')}
                      placeholder="e.g. Apex Materials Group"
                      error={errors.companyName?.message}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Phone Number</label>
                    <Input
                      {...register('phoneNumber')}
                      placeholder="e.g. +1 555-4567"
                      error={errors.phoneNumber?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Email Address (Optional)</label>
                    <Input
                      type="email"
                      {...register('email')}
                      placeholder="e.g. sales@apex.com"
                      error={errors.email?.message}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Address</label>
                  <Input
                    {...register('address')}
                    placeholder="e.g. Industrial Zone Block C"
                    error={errors.address?.message}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Notes</label>
                  <textarea
                    rows={2}
                    {...register('notes')}
                    placeholder="e.g. Structural steel supply partner..."
                    className={`w-full px-3 py-2 bg-slate-950/40 border border-slate-800 focus:border-cyan-500/80 focus:ring-cyan-500/30 rounded-xl text-slate-200 focus:outline-none focus:ring-1 text-xs transition-all placeholder:text-slate-650 shadow-inner ${
                      errors.notes
                        ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
                        : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/30'
                    }`}
                  />
                  {errors.notes && <p className="text-rose-400 text-[10px] mt-1">{errors.notes.message}</p>}
                </div>

                {/* Project Assignments Section */}
                <div className="border border-slate-800 rounded-xl p-4 bg-[#0a0f1c] space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-bold text-white uppercase tracking-[0.1em]">
                      Project Assignments
                    </h4>
                    <button
                      type="button"
                      onClick={() => append({ projectId: '', contractAmount: '' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-slate-500 hover:border-slate-300 rounded-md text-[11px] font-semibold text-slate-200 transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Add Project Assignment</span>
                    </button>
                  </div>

                  {fields.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No project assignments added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-3 bg-[#0f172a] p-3.5 border border-slate-800/80 rounded-xl">
                          <div className="flex-1">
                            <label className="block text-slate-400 text-[11px] font-semibold mb-1.5">Project</label>
                            <Select
                              {...register(`assignments.${index}.projectId`)}
                              error={errors.assignments?.[index]?.projectId?.message}
                            >
                              <option value="" disabled className="bg-slate-900 text-slate-250">Select Project...</option>
                              {projects.map((p: any) => (
                                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                                  {p.code} - {p.name}
                                </option>
                              ))}
                            </Select>
                          </div>

                          <div className="w-28">
                            <label className="block text-slate-400 text-[11px] font-semibold mb-1.5">Contract ($)</label>
                            <Input
                              placeholder="0.00"
                              {...register(`assignments.${index}.contractAmount`)}
                            />
                          </div>

                          <div className="pb-2.5 px-1">
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-slate-500 hover:text-rose-400 transition-colors"
                              title="Remove Assignment"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                    {modalMode === 'create' ? 'Create Supplier' : 'Save Changes'}
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
          title="Delete Supplier?"
          description="Are you sure you want to delete this supplier? This will permanently remove all material purchases related to this supplier."
          confirmText="Delete Supplier"
          isConfirming={isDeleting}
        />
      </div>
    </AuthenticatedLayout>
  );
}
