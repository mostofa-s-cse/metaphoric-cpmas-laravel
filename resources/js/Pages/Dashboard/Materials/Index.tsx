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
  PackageSearch, Plus, Search, Truck, FolderKanban, DollarSign, Calendar, Layers, X, Trash2, Edit2, Loader2, Info
} from 'lucide-react';

const materialSchema = z.object({
  name: z.string().min(2, 'Material name is required'),
  category: z.string().min(2, 'Category is required'),
  quantity: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
    message: 'Quantity must be positive',
  }),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, {
    message: 'Unit price must be non-negative',
  }),
  supplierId: z.string().min(1, 'Supplier is required'),
  newSupplierName: z.string().optional().or(z.literal('')),
  projectId: z.string().min(1, 'Project is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  invoiceNumber: z.string().optional().or(z.literal('')),
  paidNow: z.boolean(),
}).superRefine((values, ctx) => {
  if (values.supplierId === 'OTHER' && !values.newSupplierName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Supplier name is required',
      path: ['newSupplierName'],
    });
  }
});

type MaterialFormValues = z.infer<typeof materialSchema>;

interface ApiMaterial {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  purchaseDate: string;
  invoiceNumber?: string;
  projectId: string;
  supplierId: string;
  cashOut?: { id: string } | null;
  project: {
    id: string;
    name: string;
    code: string;
  };
  supplier: {
    id: string;
    name: string;
  };
}

export default function MaterialsPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;
  const { toasts, removeToast, success, error, handlePromise } = useToast();

  // Data states
  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const {
    items: materials, setItems: setMaterials, totalItems, isFetching, fetchError, refetch: fetchMaterials,
    page, setPage, limit, setLimit, searchTerm, setSearchTerm,
  } = useResourceList<ApiMaterial>('/api/materials', {
    listKey: 'materials',
  });

  const { create: createMaterial, update: updateMaterial, remove: removeMaterial } =
    useCrudMutations('/api/materials', handlePromise, fetchMaterials);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);

  const [isBusy, setIsBusy] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: '',
      category: '',
      quantity: '',
      unit: '',
      unitPrice: '',
      supplierId: '',
      newSupplierName: '',
      projectId: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      paidNow: true,
    },
    mode: 'all',
  });

  const selectedSupplierId = watch('supplierId');

  const fetchDependencies = async () => {
    try {
      const [resPrj, resSup] = await Promise.all([
        axios.get('/api/projects'),
        axios.get('/api/suppliers')
      ]);
      if (resPrj.data.status === 'success') setProjects(resPrj.data.data.projects || []);
      if (resSup.data.status === 'success') setSuppliers(resSup.data.data.suppliers || []);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  const handleOpenCreate = () => {
    if (projects.length === 0) {
      error('You must create a Project before logging materials');
      return;
    }
    if (suppliers.length === 0) {
      error('You must create a Supplier before logging materials');
      return;
    }

    setModalMode('create');
    setSelectedMaterialId(null);
    reset({
      name: '',
      category: '',
      quantity: '',
      unit: '',
      unitPrice: '',
      supplierId: '',
      newSupplierName: '',
      projectId: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      paidNow: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mat: ApiMaterial) => {
    setModalMode('edit');
    setSelectedMaterialId(mat.id);
    reset({
      name: mat.name,
      category: mat.category,
      quantity: mat.quantity.toString(),
      unit: mat.unit,
      unitPrice: mat.unitPrice.toString(),
      supplierId: mat.supplierId,
      newSupplierName: '',
      projectId: mat.projectId,
      purchaseDate: mat.purchaseDate.split('T')[0],
      invoiceNumber: mat.invoiceNumber || '',
      paidNow: !!mat.cashOut,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setMaterialToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!materialToDelete) return;
    setIsDeleting(true);
    try {
      await removeMaterial(materialToDelete, 'Purchase record deleted successfully');
      setDeleteConfirmOpen(false);
      setMaterialToDelete(null);
    } catch (err) {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (values: MaterialFormValues) => {
    setIsBusy(true);
    try {
      const payload = {
        ...values,
        quantity: parseFloat(values.quantity),
        unitPrice: parseFloat(values.unitPrice),
      };
      if (modalMode === 'create') {
        await createMaterial(payload, 'Material purchase logged successfully');
      } else if (selectedMaterialId) {
        await updateMaterial(selectedMaterialId, payload, 'Material purchase record updated successfully');
      }
      // A supplierId of "OTHER" creates a brand-new Supplier server-side;
      // refresh the dropdown's options so it (and its name) is selectable
      // the next time this material is opened for edit.
      fetchDependencies();
      setIsModalOpen(false);
    } catch (err) {
      // ignore
    } finally {
      setIsBusy(false);
    }
  };

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <AuthenticatedLayout>
      <Head title="Materials purchase" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 flex items-center gap-2">
              <PackageSearch className="h-6 w-6 text-cyan-400" />
              Inventory &amp; Materials Purchase Log
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Track material deliveries, log challan details, assign items to active projects, and link suppliers
            </p>
          </div>

          {user && user.role !== 'ACCOUNTANT' && (
            <Button
              onClick={handleOpenCreate}
              icon={<Plus className="h-5 w-5" />}
            >
              Log Material Purchase
            </Button>
          )}
        </div>

        {/* Search Filter */}
        <Input
          placeholder="Search by material, supplier, project, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search className="h-4 w-4" />}
        />

        {/* Main Table */}
        {isFetching && materials.length === 0 ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
            <span className="text-slate-500 text-xs font-semibold">Loading materials inventory...</span>
          </div>
        ) : fetchError ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-6">
            <PackageSearch className="h-10 w-10 text-rose-500 mb-3" />
            <p className="text-slate-400 text-sm font-semibold">Failed to fetch materials ledger</p>
            <p className="text-slate-500 text-xs mt-1">Please try refreshing the page.</p>
          </div>
        ) : materials.length === 0 ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4">
            <PackageSearch className="h-12 w-12 text-slate-800 mb-3" />
            <p className="text-slate-400 text-sm font-bold">No purchase logs found</p>
            <p className="text-slate-600 text-xs mt-1 max-w-xs mx-auto">
              {searchTerm
                ? 'Try adjusting your search query.'
                : 'Log a new material delivery invoice to track material budgets on projects.'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/25 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md animate-in fade-in duration-300">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <th className="py-4 px-6">Material details</th>
                    <th className="py-4 px-4">Project Assigned</th>
                    <th className="py-4 px-4">Supplier Vendor</th>
                    <th className="py-4 px-4">Invoice / Challan</th>
                    <th className="py-4 px-4">Qty &amp; Unit Price</th>
                    <th className="py-4 px-4">Total Cost</th>
                    <th className="py-4 px-4">Date logged</th>
                    {user && user.role !== 'ACCOUNTANT' && <th className="py-4 px-6 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {materials.map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4 px-6 max-w-[220px]">
                        <span className="block truncate text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
                          {mat.category}
                        </span>
                        <h4 className="font-bold text-slate-200 mt-0.5 truncate">{mat.name}</h4>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 max-w-[140px]">
                          <FolderKanban className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate text-slate-300 font-semibold">{mat.project?.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 max-w-[140px]">
                          <Truck className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate text-slate-400">{mat.supplier?.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-400 font-mono text-[10px]">
                        {mat.invoiceNumber || '—'}
                      </td>
                      <td className="py-4 px-4 text-slate-400">
                        <span className="text-slate-200 font-bold">{mat.quantity}</span> {mat.unit}{' '}
                        <span className="text-[10px] text-slate-700 block mt-0.5 animate-pulse">
                          @ {formatCurrencyLocal(mat.unitPrice)}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-200">
                        {formatCurrencyLocal(mat.totalPrice)}
                        {!mat.cashOut && (
                          <span className="block mt-1 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                            Unpaid (Credit)
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-mono text-[10px]">
                        {new Date(mat.purchaseDate).toLocaleDateString()}
                      </td>
                      {user && user.role !== 'ACCOUNTANT' && (
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(mat)}
                              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/5 rounded-lg border border-transparent hover:border-cyan-500/10 transition-all cursor-pointer"
                              title="Edit purchase record"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(mat.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg border border-transparent hover:border-rose-500/10 transition-all cursor-pointer"
                              title="Delete purchase record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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

        {/* Log Modal */}
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-cyan-400" />
              {modalMode === 'create' ? 'Log Material Purchase Invoice' : 'Edit Material Purchase Record'}
            </div>
          }
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Item Name</label>
                <Input
                  {...register('name')}
                  placeholder="e.g. Portland Cement 50Grade"
                  error={errors.name?.message}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Category</label>
                <Input
                  {...register('category')}
                  placeholder="e.g. Cement"
                  error={errors.category?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Quantity</label>
                <Input
                  {...register('quantity')}
                  placeholder="e.g. 500"
                  error={errors.quantity?.message}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Unit</label>
                <Input
                  {...register('unit')}
                  placeholder="e.g. Bags"
                  error={errors.unit?.message}
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Unit Price ($)</label>
                <Input
                  {...register('unitPrice')}
                  placeholder="e.g. 8.50"
                  error={errors.unitPrice?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Supplier</label>
                <Select
                  {...register('supplierId')}
                  error={errors.supplierId?.message}
                >
                  <option value="" disabled className="bg-slate-900 text-slate-300">Select Supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                      {s.name}{!s.phoneNumber ? ' (Other Entry)' : ''}
                    </option>
                  ))}
                  <option value="OTHER" className="bg-slate-900 text-slate-200">Other...</option>
                </Select>
                {selectedSupplierId === 'OTHER' && (
                  <div className="mt-2.5">
                    <Input
                      {...register('newSupplierName')}
                      placeholder="Enter new supplier name"
                      error={errors.newSupplierName?.message}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Assign to Project</label>
                <Select
                  {...register('projectId')}
                  error={errors.projectId?.message}
                >
                  <option value="" disabled className="bg-slate-900 text-slate-300">Select Project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                      {p.code} - {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Purchase Date</label>
                <Controller
                  name="purchaseDate"
                  control={control}
                  render={({ field }) => (
                    <DatePickerInput
                      id="purchaseDate"
                      value={field.value}
                      onChange={field.onChange}
                      error={!!errors.purchaseDate}
                    />
                  )}
                />
                {errors.purchaseDate && (
                  <p className="text-rose-400 text-[10px] mt-1">{errors.purchaseDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-2">Invoice / Challan #</label>
                <Input
                  {...register('invoiceNumber')}
                  placeholder="e.g. INV-9283"
                  error={errors.invoiceNumber?.message}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 py-1">
              <input
                type="checkbox"
                id="paidNow"
                {...register('paidNow')}
                className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-cyan-500/30 focus:ring-opacity-25"
              />
              <label htmlFor="paidNow" className="text-slate-400 text-xs font-semibold cursor-pointer">
                Paid now (cash)? Uncheck if bought on credit — settle later via Supplier Payment in Transactions.
              </label>
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
                {modalMode === 'create' ? 'Save Record' : 'Update Record'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation */}
        <AlertDialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Record?"
          description="Delete this purchase record? The associated expense transaction (if any) logged under the project accounts will also be deleted."
          confirmText="Delete"
          isConfirming={isDeleting}
        />
      </div>
    </AuthenticatedLayout>
  );
}
