import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Loader2, ChevronDown, Plus, Trash2 } from 'lucide-react';

interface PageContentSectionConfig {
  key: string;
  label: string;
  fields: string[];
  hasItems?: boolean;
}

const PAGE_CONTENT_SECTIONS: PageContentSectionConfig[] = [
  { key: 'CONTACT_HERO', label: 'Contact Page — Hero', fields: ['title', 'highlight', 'description'] },
  { key: 'FOOTER_CTA', label: 'Footer CTA (shown on every page)', fields: ['title', 'highlight', 'description'] },
  { key: 'SERVICES_HERO', label: 'Services Page — Hero', fields: ['title', 'highlight', 'description'] },
  { key: 'SERVICES_APPROACH', label: 'Service Detail — "Our Approach" Cards', fields: ['title'], hasItems: true },
  { key: 'SERVICES_SHOW_CTA', label: 'Service Detail — CTA', fields: ['title', 'description'] },
  { key: 'PORTFOLIO_HERO', label: 'Portfolio Page — Hero', fields: ['title', 'highlight', 'description'] },
  { key: 'PORTFOLIO_SHOW_CTA', label: 'Portfolio Detail — CTA', fields: ['title', 'description'] },
  { key: 'TEAM_HERO', label: 'Team Page — Hero', fields: ['title', 'highlight', 'description'] },
  { key: 'TEAM_SHOW_QUOTE', label: 'Team Detail — Philosophy Quote', fields: ['description'] },
];

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  highlight: 'Highlighted Word',
  subtitle: 'Subtitle',
  description: 'Description / Body Text',
};

const emptySection = (key: string) => ({
  sectionKey: key,
  title: '',
  subtitle: '',
  highlight: '',
  description: '',
  extraData: { items: [] },
  isActive: true,
});

export function PageContentTab({ toast }: { toast: any }) {
  const [isLoading, setIsLoading] = useState(true);
  const [sections, setSections] = useState<Record<string, any>>({});
  const [openKey, setOpenKey] = useState<string | null>(PAGE_CONTENT_SECTIONS[0].key);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/website/sections');
        if (res.data.status === 'success') {
          setSections(res.data.data || {});
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const getSection = (key: string) => sections[key] || emptySection(key);

  const updateField = (key: string, field: string, value: string) => {
    setSections((prev) => ({ ...prev, [key]: { ...getSection(key), [field]: value } }));
  };

  const updateItem = (key: string, index: number, field: string, value: string) => {
    const section = getSection(key);
    const items = [...(section.extraData?.items || [])];
    items[index] = { ...items[index], [field]: value };
    setSections((prev) => ({ ...prev, [key]: { ...section, extraData: { ...section.extraData, items } } }));
  };

  const addItem = (key: string) => {
    const section = getSection(key);
    const items = [...(section.extraData?.items || []), { title: '', description: '' }];
    setSections((prev) => ({ ...prev, [key]: { ...section, extraData: { ...section.extraData, items } } }));
  };

  const removeItem = (key: string, index: number) => {
    const section = getSection(key);
    const items = (section.extraData?.items || []).filter((_: any, i: number) => i !== index);
    setSections((prev) => ({ ...prev, [key]: { ...section, extraData: { ...section.extraData, items } } }));
  };

  const handleSave = async (key: string, label: string) => {
    setSavingKey(key);
    try {
      const payload = { ...getSection(key), sectionKey: key };
      const request = payload.id
        ? axios.patch(`/api/website/sections/${payload.id}`, payload)
        : axios.post('/api/website/sections', payload);

      const res = await toast.handlePromise(request, {
        successMessage: `${label} saved successfully!`,
        errorMessage: `Failed to save ${label}.`,
      });

      const saved = res?.data?.data?.section;
      if (saved) {
        setSections((prev) => ({ ...prev, [key]: saved }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-cyan-500 w-8 h-8" /></div>;
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-200">Page Content</h2>
        <p className="text-sm text-slate-400 mt-1">
          Headings, subtext, and CTA copy shown across the public site's Contact, Services, Portfolio, and Team pages.
        </p>
      </div>

      {PAGE_CONTENT_SECTIONS.map((cfg) => {
        const section = getSection(cfg.key);
        const isOpen = openKey === cfg.key;
        const isSaving = savingKey === cfg.key;

        return (
          <div key={cfg.key} className="border border-slate-800/80 rounded-xl bg-slate-950/50 overflow-hidden">
            <button
              onClick={() => setOpenKey(isOpen ? null : cfg.key)}
              className="w-full flex items-center justify-between px-5 py-4 cursor-pointer"
            >
              <span className="text-sm font-semibold text-cyan-400">{cfg.label}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="px-5 pb-5 space-y-4 border-t border-slate-800/80 pt-4">
                {cfg.fields.map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{FIELD_LABELS[field]}</label>
                    {field === 'description' ? (
                      <textarea
                        value={section[field] || ''}
                        onChange={(e) => updateField(cfg.key, field, e.target.value)}
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={section[field] || ''}
                        onChange={(e) => updateField(cfg.key, field, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    )}
                  </div>
                ))}

                {cfg.hasItems && (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-slate-400">Cards</label>
                    {(section.extraData?.items || []).map((item: any, i: number) => (
                      <div key={i} className="flex gap-3 items-start p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={item.title || ''}
                            onChange={(e) => updateItem(cfg.key, i, 'title', e.target.value)}
                            placeholder="Card title"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                          <textarea
                            value={item.description || ''}
                            onChange={(e) => updateItem(cfg.key, i, 'description', e.target.value)}
                            placeholder="Card description"
                            rows={2}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                          />
                        </div>
                        <button
                          onClick={() => removeItem(cfg.key, i)}
                          className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addItem(cfg.key)}
                      className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Card
                    </button>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleSave(cfg.key, cfg.label)}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
