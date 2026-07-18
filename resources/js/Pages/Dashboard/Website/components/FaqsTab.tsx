import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, Loader2 } from 'lucide-react';
import { Modal } from '@/Components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { useFetchList } from '@/hooks/useFetchList';
import { useCrudMutations } from '@/hooks/useCrudMutations';

interface Props {
  toast: ReturnType<typeof useToast>;
}

const ENDPOINT = '/api/website/faqs';

export function FaqsTab({ toast }: Props) {
  const { items, isLoading, refetch } = useFetchList<any>(ENDPOINT);
  const { create, update, remove } = useCrudMutations(ENDPOINT, toast.handlePromise, refetch);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const defaultState = { isActive: true, order: 0, question: '', answer: '' };
  const [formData, setFormData] = useState<any>(defaultState);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData(defaultState);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    const isEditing = !!editingId;
    isEditing ? setIsUpdating(true) : setIsAdding(true);
    try {
      if (isEditing) {
        await update(editingId as string, formData, 'FAQ updated successfully', 'Failed to save FAQ');
      } else {
        await create(formData, 'FAQ added successfully', 'Failed to save FAQ');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      isEditing ? setIsUpdating(false) : setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this?')) {
      try {
        await remove(id, 'FAQ deleted successfully', 'Failed to delete FAQ');
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-cyan-500 w-8 h-8" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-slate-200">Manage Faqs</h2>
        <button onClick={handleOpenNew} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-4">

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
            <label className="block text-xs font-medium text-slate-400 mb-1">Question</label>
            <input type="text" name="question" value={formData.question} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Answer</label>
            <textarea name="answer" value={formData.answer} onChange={handleChange} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"></textarea>
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
