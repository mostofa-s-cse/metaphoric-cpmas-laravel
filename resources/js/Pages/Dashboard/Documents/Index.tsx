import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { AlertDialog } from '@/Components/ui/AlertDialog';
import { Pagination } from '@/Components/ui/Pagination';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import { Select } from '@/Components/ui/Select';
import { ToastContainer } from '@/Components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';

import {
  FileText, Plus, Search, FolderKanban, Truck, Briefcase, X, Trash2, Loader2,
  FileSpreadsheet, FileCode, FileImage, ExternalLink, Upload, Download
} from 'lucide-react';

const documentSchema = z.object({
  name: z.string().min(2, 'Document name is required'),
  url: z.string().min(1, 'File URL or path is required'),
  description: z.string().max(500).optional().or(z.literal('')),
  fileType: z.string().min(1, 'File type is required'),
  category: z.string().min(1, 'Category is required'),
  projectId: z.string().optional().or(z.literal('')),
  supplierId: z.string().optional().or(z.literal('')),
  vendorId: z.string().optional().or(z.literal('')),
  employeeId: z.string().optional().or(z.literal('')),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

interface ApiDocument {
  id: string;
  name: string;
  url: string;
  description?: string;
  fileType: string;
  category: string;
  uploadDate: string;
  projectId?: string;
  supplierId?: string;
  vendorId?: string;
  project?: {
    id: string;
    name: string;
    code: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
  vendor?: {
    id: string;
    name: string;
  };
}

export default function DocumentsPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;
  const { toasts, removeToast, success, error, handlePromise } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');

  // Database states
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Fetching states
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewDoc, setViewDoc] = useState<ApiDocument | null>(null);

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      name: '',
      url: '/uploads/mock_file.pdf', // default mock URL to satisfy Zod schema
      fileType: 'PDF',
      category: 'CONTRACT',
      projectId: '',
      supplierId: '',
      vendorId: '',
      description: '',
    },
    mode: 'all',
  });

  const fetchDocuments = async () => {
    setIsFetching(true);
    setFetchError(false);
    try {
      const res = await axios.get('/api/documents', {
        params: {
          page,
          limit,
          search: searchTerm,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          projectId: projectFilter !== 'ALL' ? (projectFilter === 'GENERAL' ? 'null' : projectFilter) : undefined,
        }
      });
      if (res.data.status === 'success') {
        setDocuments(res.data.data.documents || []);
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

  const fetchDependencies = async () => {
    try {
      const [resPrj, resSup, resVnd] = await Promise.all([
        axios.get('/api/projects'),
        axios.get('/api/suppliers'),
        axios.get('/api/vendors')
      ]);
      if (resPrj.data.status === 'success') setProjects(resPrj.data.data.projects || []);
      if (resSup.data.status === 'success') setSuppliers(resSup.data.data.suppliers || []);
      if (resVnd.data.status === 'success') setVendors(resVnd.data.data.vendors || []);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, limit, categoryFilter, projectFilter]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchDocuments();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleOpenCreate = () => {
    reset({
      name: '',
      url: '/uploads/mock_file.pdf',
      fileType: 'PDF',
      category: 'CONTRACT',
      projectId: '',
      supplierId: '',
      vendorId: '',
      description: '',
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const onSubmit = async (values: DocumentFormValues) => {
    if (!selectedFile) {
      error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (uploadRes.data.status !== 'success') {
        throw new Error('Failed to upload file to S3/Server storage');
      }

      const fileUrl = uploadRes.data.data.url;
      setIsCreating(true);

      const payload = {
        ...values,
        url: fileUrl,
        fileType: selectedFile.name.split('.').pop()?.toUpperCase() || values.fileType,
        projectId: values.projectId || null,
        supplierId: values.supplierId || null,
        vendorId: values.vendorId || null,
      };

      await handlePromise(axios.post('/api/documents', payload), {
        successMessage: 'Document uploaded successfully',
      });
      fetchDocuments();
      setIsModalOpen(false);
    } catch (err: any) {
      // ignore
    } finally {
      setIsUploading(false);
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await handlePromise(axios.delete(`/api/documents/${deleteId}`), {
        successMessage: 'Document deleted successfully',
      });
      fetchDocuments();
      setDeleteId(null);
    } catch (err) {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PDF':
        return <FileText className="h-6 w-6 text-rose-500" />;
      case 'EXCEL':
      case 'XLSX':
        return <FileSpreadsheet className="h-6 w-6 text-emerald-400" />;
      case 'IMAGE':
      case 'PNG':
      case 'JPG':
      case 'JPEG':
        return <FileImage className="h-6 w-6 text-blue-400" />;
      default:
        return <FileCode className="h-6 w-6 text-slate-400" />;
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Document Repository" />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-350 flex items-center gap-2">
              <FileText className="h-5.5 w-5.5 text-cyan-400" />
              Document Repository
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Store and organize contracts, invoices, challans, quotations and legal paperwork.
            </p>
          </div>

          <Button
            onClick={handleOpenCreate}
            icon={<Upload className="h-4.5 w-4.5" />}
          >
            Upload Document
          </Button>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search documents by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="flex-1"
            />

            <Select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="sm:w-[260px]"
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

          {/* Category Tabs */}
          <div className="flex border-b border-slate-800/60 overflow-x-auto scrollbar-none">
            {['ALL', 'CONTRACT', 'INVOICE', 'CHALLAN', 'QUOTATION', 'OTHER'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-5 py-3 border-b-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-350 hover:bg-slate-900/20'
                }`}
              >
                {cat.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Grid */}
        {isFetching && documents.length === 0 ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
            <span className="text-slate-500 text-xs font-semibold">Loading document files...</span>
          </div>
        ) : fetchError ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-6">
            <FileText className="h-10 w-10 text-rose-500 mb-3" />
            <p className="text-slate-350 text-sm font-semibold">Failed to load documents index</p>
            <p className="text-slate-500 text-xs mt-1">Please try refreshing the page.</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4">
            <FileText className="h-12 w-12 text-slate-800 mb-3" />
            <p className="text-slate-400 text-sm font-bold">No documents found</p>
            <p className="text-slate-600 text-xs mt-1 max-w-xs mx-auto">
              {searchTerm || categoryFilter !== 'ALL'
                ? 'Try adjusting your filters.'
                : 'Register a work contract or material invoice to store legal records.'}
            </p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-900/25 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all flex items-start gap-4 hover:shadow-xl group backdrop-blur-md"
              >
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl shrink-0">
                  {getFileIcon(doc.fileType)}
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">
                      {doc.category}
                    </span>
                    <h3 className="font-bold text-slate-200 text-sm truncate mt-1 group-hover:text-cyan-300 transition-colors">
                      {doc.name}
                    </h3>
                    <p className="text-slate-500 text-[10px] mt-0.5">
                      Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                    </p>
                    {doc.description && (
                      <p className="text-slate-400 text-[11px] mt-2 line-clamp-2 leading-relaxed">
                        {doc.description}
                      </p>
                    )}

                    {/* Related Links */}
                    <div className="mt-3.5 space-y-1.5 border-t border-slate-800/40 pt-3">
                      {doc.project && (
                        <div className="flex items-center text-[10px] text-slate-500 gap-1.5 font-medium">
                          <FolderKanban className="h-3 w-3 shrink-0 text-slate-600" />
                          <span className="truncate">Project: {doc.project.name}</span>
                        </div>
                      )}
                      {doc.supplier && (
                        <div className="flex items-center text-[10px] text-slate-500 gap-1.5 font-medium">
                          <Truck className="h-3 w-3 shrink-0 text-slate-600" />
                          <span className="truncate">Supplier: {doc.supplier.name}</span>
                        </div>
                      )}
                      {doc.vendor && (
                        <div className="flex items-center text-[10px] text-slate-500 gap-1.5 font-medium">
                          <Briefcase className="h-3 w-3 shrink-0 text-slate-600" />
                          <span className="truncate">Vendor: {doc.vendor.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setViewDoc(doc)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>View File</span>
                      </button>
                      <a
                        href={doc.url}
                        download={doc.name}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    </div>

                    {user?.role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleDeleteClick(doc.id)}
                        className="p-1 text-slate-500 hover:text-rose-455 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 rounded transition-all cursor-pointer"
                        title="Delete document"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(totalItems / limit)}
            totalItems={totalItems}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
          />
          </>
        )}

        {/* Upload Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-4 sm:mb-6 pb-2 border-b border-slate-800">
                <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <Upload className="h-4.5 w-4.5 text-cyan-400" />
                  Upload New Document
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
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Document Name</label>
                    <Input
                      {...register('name')}
                      placeholder="e.g. Skyline Piling Contract"
                      error={errors.name?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">File Type</label>
                    <Select
                      {...register('fileType')}
                    >
                      <option value="PDF" className="bg-slate-900 text-slate-200">PDF</option>
                      <option value="IMAGE" className="bg-slate-900 text-slate-200">IMAGE</option>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Document Category</label>
                    <Select
                      {...register('category')}
                    >
                      <option value="CONTRACT" className="bg-slate-900 text-slate-200">Contract / Deed</option>
                      <option value="INVOICE" className="bg-slate-900 text-slate-200">Expense Invoice / Bill</option>
                      <option value="CHALLAN" className="bg-slate-900 text-slate-200">Material Challan / Delivery</option>
                      <option value="QUOTATION" className="bg-slate-900 text-slate-200">Supplier Quotation</option>
                      <option value="OTHER" className="bg-slate-900 text-slate-200">Other Misc</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Link to Project</label>
                    <Select
                      {...register('projectId')}
                    >
                      <option value="" className="bg-slate-900 text-slate-250">General Corporate (No Project)</option>
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
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Link to Supplier</label>
                    <Select
                      {...register('supplierId')}
                    >
                      <option value="" className="bg-slate-900 text-slate-250">No Supplier Link</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs font-semibold mb-2">Link to Vendor</label>
                    <Select
                      {...register('vendorId')}
                    >
                      <option value="" className="bg-slate-900 text-slate-250">No Vendor Link</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                          {v.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Upload File (PDF/Image)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-xs transition-all cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20 mb-4"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-2">Brief Description</label>
                  <textarea
                    rows={2}
                    {...register('description')}
                    placeholder="e.g. Skyline Heights foundation piling execution contract..."
                    className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 focus:border-cyan-500/80 focus:ring-cyan-500/30 rounded-xl text-slate-200 focus:outline-none focus:ring-1 text-xs transition-all placeholder:text-slate-650 shadow-inner"
                  />
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
                    loading={isUploading || isCreating}
                  >
                    Upload File
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Document Modal */}
        {viewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] h-[80vh]">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
                <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-cyan-400" />
                  {viewDoc.name}
                </h2>
                <div className="flex items-center gap-3">
                  <a
                    href={viewDoc.url}
                    download={viewDoc.name}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-lg text-slate-350 hover:text-slate-100 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => setViewDoc(null)}
                    className="text-slate-400 hover:text-slate-100 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden bg-slate-950/50 p-4 flex flex-col">
                {viewDoc.fileType?.toUpperCase() === 'PDF' ? (
                  <iframe
                    src={viewDoc.url}
                    className="w-full flex-1 rounded-xl border border-slate-800 bg-slate-950"
                    title={viewDoc.name}
                  />
                ) : ['IMAGE', 'PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes(viewDoc.fileType?.toUpperCase()) ? (
                  <div className="flex-1 flex items-center justify-center overflow-hidden">
                    <img
                      src={viewDoc.url}
                      alt={viewDoc.name}
                      className="max-w-full max-h-full object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <FileText className="h-12 w-12 text-slate-650 mb-3" />
                    <p className="text-slate-400 text-sm font-semibold">Preview not available for this file type.</p>
                    <a
                      href={viewDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Alert */}
        <AlertDialog
          open={deleteId !== null}
          onClose={() => setDeleteId(null)}
          onConfirm={handleConfirmDelete}
          title="Are you absolutely sure?"
          description="This action cannot be undone. This will permanently delete the document record from the ledger."
          confirmText="Delete"
          isConfirming={isDeleting}
        />
      </div>
    </AuthenticatedLayout>
  );
}
