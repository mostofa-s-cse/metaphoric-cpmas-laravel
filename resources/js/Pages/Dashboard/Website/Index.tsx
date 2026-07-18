import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { Settings, Image, FileText, Grid, FolderKanban, Users, Shield, MessageSquare, HelpCircle, Save, Loader2, Upload } from 'lucide-react';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ToastContainer } from '@/Components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';

import { PageContentTab } from './components/PageContentTab';
import { ServicesTab } from './components/ServicesTab';
import { PortfolioTab } from './components/PortfolioTab';
import { TeamTab } from './components/TeamTab';
import { TrustTab } from './components/TrustTab';
import { TestimonialsTab } from './components/TestimonialsTab';
import { FaqsTab } from './components/FaqsTab';

export default function WebsiteManagementPage() {
  const [activeTab, setActiveTab] = useState('settings');
  const toast = useToast();

  const tabs = [
    { id: 'settings', label: 'General Settings', icon: Settings },
    { id: 'sections', label: 'Hero Section', icon: Image },
    { id: 'pageContent', label: 'Page Content', icon: FileText },
    { id: 'services', label: 'Services', icon: Grid },
    { id: 'portfolio', label: 'Portfolio (Case Studies)', icon: FolderKanban },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'trust', label: 'Trust Badges', icon: Shield },
    { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
    { id: 'faqs', label: 'FAQs', icon: HelpCircle },
  ];

  return (
    <AuthenticatedLayout>
      <Head title="Website Management" />
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-100">Website Management</h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-sm">
          <div className="flex overflow-x-auto custom-scrollbar gap-2 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[500px]">
          {activeTab === 'settings' && <GeneralSettingsTab toast={toast} />}
          {activeTab === 'sections' && <PageSectionsTab toast={toast} />}
          {activeTab === 'pageContent' && <PageContentTab toast={toast} />}
          {activeTab === 'services' && <ServicesTab toast={toast} />}
          {activeTab === 'portfolio' && <PortfolioTab toast={toast} />}
          {activeTab === 'team' && <TeamTab toast={toast} />}
          {activeTab === 'trust' && <TrustTab toast={toast} />}
          {activeTab === 'testimonials' && <TestimonialsTab toast={toast} />}
          {activeTab === 'faqs' && <FaqsTab toast={toast} />}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

// ----------------------------------------------------------------------------
// GENERAL SETTINGS TAB COMPONENT
// ----------------------------------------------------------------------------
function GeneralSettingsTab({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Files picked but not yet uploaded — only sent to the server (and only
  // then written to disk) when Save Settings is clicked, not the instant a
  // file is chosen. formData holds a local blob preview URL in the meantime.
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  const [formData, setFormData] = useState({
    name: 'Metaphoric',
    nameAlt: 'Metaphoric Architect',
    tagline: 'Architect',
    city: 'Dhaka, Bangladesh',
    facebook: 'https://www.facebook.com/metaphoricarchitect',
    instagram: 'https://www.instagram.com/',
    email: 'info@metaphoricarchitect.com',
    phone: '+880 1XXX-XXXXXX',
    address: 'Dhaka, Bangladesh',
    followers: '15.8K',
    years: '10+',
    projects: '200+',
    satisfaction: '98%',
    logoUrl: '',
    faviconUrl: '',
    studioDesc: 'Metaphoric Architect is a Dhaka-based firm specializing in architecture, interior design, urban planning, construction management, and consulting.',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/website/settings');
        if (res.data.status === 'success' && res.data.data?.BRAND_INFO) {
          setFormData((prev) => ({ ...prev, ...res.data.data.BRAND_INFO }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFiles((prev) => ({ ...prev, [fieldName]: file }));
    setFormData((prev) => ({ ...prev, [fieldName]: URL.createObjectURL(file) }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const payload = { ...formData };

      for (const [fieldName, file] of Object.entries(pendingFiles)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await axios.post('/api/upload', fd);
        if (res.data.status !== 'success' || !res.data.data?.url) {
          throw new Error(`Upload failed for ${fieldName}`);
        }
        payload[fieldName as keyof typeof payload] = res.data.data.url;
      }

      await toast.handlePromise(
        axios.post('/api/website/settings', { key: 'BRAND_INFO', value: payload }),
        {
          successMessage: 'Settings saved successfully!',
          errorMessage: 'Failed to save settings.',
        }
      );
      setFormData(payload);
      setPendingFiles({});
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-cyan-500 w-8 h-8" /></div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">General Brand Settings</h2>
          <p className="text-sm text-slate-400 mt-1">These details are shown across the navigation, footer, and stats sections of the public website.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isUpdating}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4 p-5 bg-slate-950/50 border border-slate-800/80 rounded-xl">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3 border-b border-slate-800 pb-2">Basic Info</h3>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Brand Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Full Name / Alt</label>
            <input type="text" name="nameAlt" value={formData.nameAlt} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tagline</label>
            <input type="text" name="tagline" value={formData.tagline} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Studio / Firm Description</label>
            <textarea name="studioDesc" value={formData.studioDesc || ''} onChange={handleChange} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none" placeholder="Description of the studio..."></textarea>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4 p-5 bg-slate-950/50 border border-slate-800/80 rounded-xl">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3 border-b border-slate-800 pb-2">Contact & Social</h3>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Facebook URL</label>
              <input type="text" name="facebook" value={formData.facebook} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Instagram URL</label>
              <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
        </div>

        {/* Location Info */}
        <div className="space-y-4 p-5 bg-slate-950/50 border border-slate-800/80 rounded-xl md:col-span-2">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3 border-b border-slate-800 pb-2">Global Statistics & Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">City / Region</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Full Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
             <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Followers Count</label>
              <input type="text" name="followers" value={formData.followers} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
            </div>
             <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Years Active</label>
              <input type="text" name="years" value={formData.years} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
            </div>
             <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Projects Done</label>
              <input type="text" name="projects" value={formData.projects} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
            </div>
             <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Satisfaction Rate</label>
              <input type="text" name="satisfaction" value={formData.satisfaction} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
            </div>
          </div>
        </div>

        {/* Branding Assets */}
        <div className="space-y-4 p-5 bg-slate-950/50 border border-slate-800/80 rounded-xl md:col-span-2">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3 border-b border-slate-800 pb-2">Branding Assets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Website Logo */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Website Logo</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer transition-colors border border-slate-700 hover:border-cyan-500">
                  <Upload className="w-4 h-4" />
                  Upload Logo
                  <input type="file" accept="image/*" onChange={(e) => handleAssetUpload(e, 'logoUrl')} className="hidden" />
                </label>
                {formData.logoUrl && (
                  <span className="text-xs text-slate-500 truncate max-w-[200px]">{formData.logoUrl.split('/').pop()}</span>
                )}
              </div>
              {formData.logoUrl && (
                <div className="h-16 w-16 rounded-xl overflow-hidden border border-slate-700 relative mt-3 p-1 bg-slate-900/60">
                  <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                </div>
              )}
            </div>

            {/* Website Favicon */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Website Favicon</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer transition-colors border border-slate-700 hover:border-cyan-500">
                  <Upload className="w-4 h-4" />
                  Upload Favicon
                  <input type="file" accept="image/*" onChange={(e) => handleAssetUpload(e, 'faviconUrl')} className="hidden" />
                </label>
                {formData.faviconUrl && (
                  <span className="text-xs text-slate-500 truncate max-w-[200px]">{formData.faviconUrl.split('/').pop()}</span>
                )}
              </div>
              {formData.faviconUrl && (
                <div className="h-16 w-16 rounded-xl overflow-hidden border border-slate-700 relative mt-3 p-2 bg-slate-900/60">
                  <img src={formData.faviconUrl} alt="Favicon Preview" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// PAGE SECTIONS TAB COMPONENT
// ----------------------------------------------------------------------------
function PageSectionsTab({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Image picked but not yet uploaded — only sent to the server when Save
  // is clicked. heroData.imageUrl holds a local blob preview in the meantime.
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  const [heroData, setHeroData] = useState<any>({
    id: null,
    sectionKey: 'HERO',
    subtitle: 'Architecture · Design · Planning · Dhaka',
    title: 'Build',
    highlight: 'Dreams.',
    description: 'Metaphoric Architect is a Dhaka-based firm delivering architecture, design, planning, construction & consulting services across Bangladesh.',
    imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2800&q=80',
    videoUrl: '',
    isActive: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/website/sections');
        if (res.data.status === 'success' && res.data.data?.HERO) {
          setHeroData((prev: any) => ({ ...prev, ...res.data.data.HERO }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setHeroData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      if (img.width < 1920 || img.height < 1080) {
        toast.warning(`Warning: The recommended image size is 1920x1080 pixels for the best quality on large screens. Your image is ${img.width}x${img.height} pixels. It will still be uploaded, but may look blurry.`);
      }
      setPendingImageFile(file);
      setHeroData((prev: any) => ({ ...prev, imageUrl: objectUrl }));
    };
    img.src = objectUrl;
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const payload = { ...heroData };

      if (pendingImageFile) {
        const fd = new FormData();
        fd.append('file', pendingImageFile);
        const res = await axios.post('/api/upload', fd);
        if (res.data.status !== 'success' || !res.data.data?.url) {
          throw new Error('Image upload failed');
        }
        payload.imageUrl = res.data.data.url;
      }

      // If the HERO section doesn't exist in the DB yet (first-ever save),
      // create it via the sectionKey-upsert endpoint instead of PATCHing an
      // unknown id. Once it exists, keep using PATCH by id like before.
      const request = payload.id
        ? axios.patch(`/api/website/sections/${payload.id}`, payload)
        : axios.post('/api/website/sections', payload);

      const res = await toast.handlePromise(request, {
        successMessage: 'Hero section saved successfully!',
        errorMessage: 'Failed to save hero section.',
      });

      const saved = res?.data?.data?.section;
      setHeroData((prev: any) => ({ ...prev, ...payload, ...(saved?.id ? saved : {}) }));
      setPendingImageFile(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save hero section.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-cyan-500 w-8 h-8" /></div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">Hero Section</h2>
          <p className="text-sm text-slate-400 mt-1">This is the first thing visitors see at the top of your landing page.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isUpdating}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Hero Section
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 p-5 bg-slate-950/50 border border-slate-800/80 rounded-xl">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3 border-b border-slate-800 pb-2">Hero Typography</h3>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Eyebrow Subtitle</label>
            <input type="text" name="subtitle" value={heroData.subtitle} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" placeholder="e.g. Architecture · Design · Planning" />
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Title Line 1</label>
              <input type="text" name="title" value={heroData.title} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" placeholder="e.g. Build" />
            </div>
             <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Title Line 2 (Highlighted)</label>
              <input type="text" name="highlight" value={heroData.highlight} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" placeholder="e.g. Dreams." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Hero Description</label>
            <textarea name="description" value={heroData.description} onChange={handleChange} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none" placeholder="Short introduction..."></textarea>
          </div>
        </div>

        <div className="space-y-4 p-5 bg-slate-950/50 border border-slate-800/80 rounded-xl">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3 border-b border-slate-800 pb-2">Hero Media</h3>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Background Image <span className="text-amber-500/80 ml-1">(Recommended: 1920x1080px)</span></label>
            <div className="flex items-center gap-4">
              <label className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg cursor-pointer transition-colors border border-slate-700 hover:border-cyan-500">
                <Upload className="w-4 h-4" />
                Upload New Image
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {heroData.imageUrl && (
                <span className="text-xs text-slate-500 truncate max-w-[200px]">{heroData.imageUrl.split('/').pop()}</span>
              )}
            </div>
          </div>
          {heroData.imageUrl && (
            <div className="w-full h-32 rounded-lg overflow-hidden border border-slate-700 relative">
              <img src={heroData.imageUrl} alt="Hero preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center pointer-events-none">
                 <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Image Preview</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Play Film Link (YouTube/Vimeo URL)</label>
            <input type="text" name="videoUrl" value={heroData.videoUrl} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" placeholder="https://..." />
          </div>
        </div>
      </div>
    </div>
  );
}
