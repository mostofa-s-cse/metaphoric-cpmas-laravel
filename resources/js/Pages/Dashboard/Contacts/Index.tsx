import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Pagination } from '@/Components/ui/Pagination';

import { MessageSquare, Search, Loader2, Info, Calendar } from 'lucide-react';

interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  scope: string;
  details: string | null;
  created_at: string;
}

export default function ContactsPage() {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchContacts = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await axios.get('/api/contacts');
      if (res.data.status === 'success') {
        setInquiries(res.data.data.inquiries || []);
      } else {
        setFetchError(res.data.message || 'Failed to load inquiries');
      }
    } catch (err) {
      setFetchError('An error occurred while fetching data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const filteredInquiries = inquiries.filter((inq) =>
    inq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inq.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inq.scope.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedInquiries = filteredInquiries.slice((page - 1) * limit, page * limit);

  return (
    <AuthenticatedLayout>
      <Head title="Contacts" />

      <div className="flex-1 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-350 flex items-center gap-2">
              <MessageSquare className="h-5.5 w-5.5 text-cyan-400" />
              Contact Inquiries
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Manage inquiries submitted via the website contact form
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, or scope..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/40 border border-slate-800 focus:border-cyan-500/80 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 text-xs placeholder:text-slate-600 transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
            <p className="text-slate-500 text-xs font-semibold">Loading inquiries...</p>
          </div>
        ) : fetchError ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-6">
            <Info className="h-10 w-10 text-rose-500 mb-3" />
            <p className="text-slate-350 text-sm font-semibold">Failed to fetch inquiries</p>
            <p className="text-slate-500 text-xs mt-1">{fetchError}</p>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="h-96 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center bg-slate-900/10 text-center px-4">
            <MessageSquare className="h-12 w-12 text-slate-800 mb-3" />
            <p className="text-slate-400 text-sm font-bold">No inquiries found</p>
            <p className="text-slate-600 text-xs mt-1 max-w-xs mx-auto">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'No one has submitted a contact form yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/25 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <th className="py-4.5 px-6">Name</th>
                    <th className="py-4.5 px-4">Email</th>
                    <th className="py-4.5 px-4">Scope</th>
                    <th className="py-4.5 px-4">Details</th>
                    <th className="py-4.5 px-6 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {paginatedInquiries.map((inq) => (
                    <tr key={inq.id} className="hover:bg-slate-900/40 transition-colors group">
                      <td className="py-4 px-6 font-bold text-slate-200">{inq.name}</td>
                      <td className="py-4 px-4 text-cyan-400">{inq.email}</td>
                      <td className="py-4 px-4 text-slate-300">{inq.scope}</td>
                      <td className="py-4 px-4 text-slate-400">
                        <div className="max-w-[200px] truncate" title={inq.details || ''}>
                          {inq.details || '—'}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right text-slate-400">
                        <div className="flex items-center justify-end gap-1.5 text-[10px]">
                          <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>
                            {new Date(inq.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(filteredInquiries.length / limit)}
              totalItems={filteredInquiries.length}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(l) => { setLimit(l); setPage(1); }}
            />
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
