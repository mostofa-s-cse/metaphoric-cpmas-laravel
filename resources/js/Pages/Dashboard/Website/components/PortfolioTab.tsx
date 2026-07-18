import React, { useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Save, Loader2, Upload, X } from 'lucide-react';
import { Modal } from '@/Components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { useFetchList } from '@/hooks/useFetchList';
import { useCrudMutations } from '@/hooks/useCrudMutations';

interface Props {
  toast: ReturnType<typeof useToast>;
}

export function PortfolioTab({ toast }: Props) {
  const { items, isLoading, refetch } = useFetchList<any>('/api/website/portfolio');
  const { create, update, remove } = useCrudMutations('/api/website/portfolio', toast.handlePromise, refetch);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const defaultState = { title: '', category: '', location: '', theChallenge: '', theSolution: '', theOutcome: '', coverImage: '', beforeImage: '', afterImage: '', images: [] as string[], isActive: true, order: 0 };
  const [formData, setFormData] = useState<any>(defaultState);

  // Files picked but not yet uploaded — only sent to the server when Save is
  // clicked. formData holds local blob preview URLs in the meantime.
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  // Gallery: blob preview URL -> the raw File it stands in for, so Save can
  // upload each one and swap the blob URL for the real one in formData.images.
  const [pendingGalleryFiles, setPendingGalleryFiles] = useState<Record<string, File>>({});

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData(defaultState);
    setPendingFiles({});
    setPendingGalleryFiles({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    const cleanedItem = { ...item };
    Object.keys(cleanedItem).forEach((key) => {
      if (cleanedItem[key] === null) {
        cleanedItem[key] = '';
      }
    });
    cleanedItem.images = Array.isArray(item.images) ? item.images : [];
    setFormData(cleanedItem);
    setPendingFiles({});
    setPendingGalleryFiles({});
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFiles((prev) => ({ ...prev, [fieldName]: file }));
    setFormData((prev: any) => ({ ...prev, [fieldName]: URL.createObjectURL(file) }));
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPending: Record<string, File> = {};
    const newUrls: string[] = [];
    files.forEach((file) => {
      const blobUrl = URL.createObjectURL(file);
      newPending[blobUrl] = file;
      newUrls.push(blobUrl);
    });
    setPendingGalleryFiles((prev) => ({ ...prev, ...newPending }));
    setFormData((prev: any) => ({ ...prev, images: [...(prev.images || []), ...newUrls] }));
    e.target.value = '';
  };

  const handleRemoveGalleryImage = (index: number) => {
    setFormData((prev: any) => {
      const removedUrl = (prev.images || [])[index];
      if (removedUrl && removedUrl in pendingGalleryFiles) {
        setPendingGalleryFiles((pf) => {
          const rest = { ...pf };
          delete rest[removedUrl];
          return rest;
        });
      }
      return {
        ...prev,
        images: (prev.images || []).filter((_: string, i: number) => i !== index),
      };
    });
  };

  const handleSave = async () => {
    const isEditing = !!editingId;
    isEditing ? setIsUpdating(true) : setIsAdding(true);
    try {
      const payload = { ...formData };

      for (const [fieldName, file] of Object.entries(pendingFiles)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post('/api/upload', fd);
        if (res.data.status !== 'success' || !res.data.data?.url) {
          throw new Error(`Upload failed for ${fieldName}`);
        }
        payload[fieldName] = res.data.data.url;
      }

      if (Object.keys(pendingGalleryFiles).length > 0) {
        const uploadedUrlByBlob: Record<string, string> = {};
        for (const [blobUrl, file] of Object.entries(pendingGalleryFiles)) {
          const fd = new FormData();
          fd.append('file', file);
          const res = await axios.post('/api/upload', fd);
          if (res.data.status !== 'success' || !res.data.data?.url) {
            throw new Error('Gallery image upload failed');
          }
          uploadedUrlByBlob[blobUrl] = res.data.data.url;
        }
        payload.images = (payload.images || []).map((img: string) => uploadedUrlByBlob[img] || img);
      }

      if (isEditing) {
        await update(editingId as string, payload, 'Portfolio item updated successfully', 'Failed to save portfolio item');
      } else {
        await create(payload, 'Portfolio item added successfully', 'Failed to save portfolio item');
      }
      setIsModalOpen(false);
      setPendingFiles({});
      setPendingGalleryFiles({});
    } catch (err) {
      console.error(err);
      toast.error('Failed to save portfolio item');
    } finally {
      isEditing ? setIsUpdating(false) : setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this?')) {
      try {
        await remove(id, 'Portfolio item deleted successfully', 'Failed to delete portfolio item');
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-cyan-500 w-8 h-8" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-slate-200">Manage Portfolio</h2>
        <button onClick={handleOpenNew} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-4">
              {item.coverImage && <img src={item.coverImage} className="w-10 h-10 rounded object-cover border border-slate-800" />}
              <div>
                <p className="font-semibold text-slate-200">{item.title}</p>
                <p className="text-xs text-slate-500">{item.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleOpenEdit(item)} className="p-2 text-slate-400 hover:text-cyan-400 bg-slate-900 rounded-lg border border-slate-800 hover:border-cyan-500/30">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 rounded-lg border border-slate-800 hover:border-rose-500/30">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-slate-500 text-sm text-center py-10">No items found.</p>}
      </div>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Item' : 'Add Item'} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Project Title</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
            <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Location</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Gulshan, Dhaka" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">The Challenge</label>
            <textarea name="theChallenge" value={formData.theChallenge} onChange={handleChange} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"></textarea>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">The Solution</label>
            <textarea name="theSolution" value={formData.theSolution} onChange={handleChange} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"></textarea>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Cover Image</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg cursor-pointer transition-colors border border-slate-700 hover:border-cyan-500">
                <Upload className="w-4 h-4" />
                Upload File
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverImage')} className="hidden" />
              </label>
              {formData.coverImage && <span className="text-xs text-slate-500 truncate max-w-[200px]">{formData.coverImage.split('/').pop()}</span>}
            </div>
            {formData.coverImage && (
              <div className="w-full h-32 rounded-lg overflow-hidden border border-slate-700 relative mt-2">
                <img src={formData.coverImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Gallery Images (multiple)</label>
            <label className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg cursor-pointer transition-colors border border-slate-700 hover:border-cyan-500 w-fit">
              <Upload className="w-4 h-4" />
              Upload Images
              <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
            </label>
            {(formData.images || []).length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {(formData.images as string[]).map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700">
                    <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-slate-950/80 text-rose-400 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium cursor-pointer">Cancel</button>
            <button onClick={handleSave} disabled={isAdding || isUpdating} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium cursor-pointer disabled:opacity-50">
              {isAdding || isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isAdding || isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
