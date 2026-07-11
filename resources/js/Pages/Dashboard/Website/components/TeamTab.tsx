import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Save, Loader2, Upload } from 'lucide-react';
import { Modal } from '@/Components/ui/Modal';
import { useToast } from '@/hooks/useToast';

interface Props {
  toast: ReturnType<typeof useToast>;
}

export function TeamTab({ toast }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const defaultState = { isActive: true, order: 0, name: '', role: '', bio: '', imageUrl: '' };
  const [formData, setFormData] = useState<any>(defaultState);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/website/team');
      if (res.data.status === 'success') {
        setItems(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData(defaultState);
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
    setFormData(cleanedItem);
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post('/api/upload', fd);
      if (res.data.status === 'success' && res.data.data?.url) {
        setFormData((prev: any) => ({ ...prev, [fieldName]: res.data.data.url }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    const isEditing = !!editingId;
    isEditing ? setIsUpdating(true) : setIsAdding(true);
    try {
      const promise = isEditing
        ? axios.patch(`/api/website/team/${editingId}`, formData)
        : axios.post('/api/website/team', formData);
      await toast.handlePromise(promise, {
        successMessage: isEditing ? 'Team member updated successfully' : 'Team member added successfully',
        errorMessage: 'Failed to save team member',
      });
      setIsModalOpen(false);
      fetchItems();
    } catch (err) {
      console.error(err);
    } finally {
      isEditing ? setIsUpdating(false) : setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this?')) {
      try {
        await toast.handlePromise(axios.delete(`/api/website/team/${id}`), {
          successMessage: 'Team member deleted successfully',
          errorMessage: 'Failed to delete team member',
        });
        fetchItems();
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-cyan-500 w-8 h-8" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-slate-200">Manage Team</h2>
        <button onClick={handleOpenNew} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-4">
              {item.imageUrl && <img src={item.imageUrl} className="w-10 h-10 rounded object-cover border border-slate-800" />}
              <div>
                <p className="font-semibold text-slate-200">{item.title || item.name || item.question || item.clientName}</p>
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
            <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
            <input type="text" name="role" value={formData.role} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Bio</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"></textarea>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Profile Photo</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg cursor-pointer transition-colors border border-slate-700 hover:border-cyan-500">
                <Upload className="w-4 h-4" />
                Upload File
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'imageUrl')} className="hidden" />
              </label>
              {formData.imageUrl && <span className="text-xs text-slate-500 truncate max-w-[200px]">{formData.imageUrl.split('/').pop()}</span>}
            </div>
            {formData.imageUrl && (
              <div className="w-full h-32 rounded-lg overflow-hidden border border-slate-700 relative mt-2">
                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
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
