import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { DateRangeFilter } from '@/Components/ui/DateRangeFilter';
import {
  Briefcase,
  Wallet,
  HelpCircle,
  Loader2,
  Download,
} from 'lucide-react';

const formatVal = (val: number) =>
  `${val < 0 ? '-' : ''}৳ ${Math.abs(val).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Fetch a full (unpaginated) dataset from a paginated list endpoint by
// requesting a high limit — this aggregation report needs every record.
const FULL_LIST_LIMIT = 1000;

export default function VendorReportPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [vendors, setVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  const isLoading = loadingVendors;

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') return;

    let cancelled = false;

    const fetchVendors = async () => {
      try {
        const res = await axios.get('/api/vendors', {
          params: { limit: FULL_LIST_LIMIT, startDate, endDate },
        });
        if (!cancelled && res.data.status === 'success') {
          setVendors(res.data.data.vendors || []);
        }
      } finally {
        if (!cancelled) setLoadingVendors(false);
      }
    };

    fetchVendors();

    return () => {
      cancelled = true;
    };
  }, [user, startDate, endDate]);

  // Core numbers
  const totalContract = vendors.reduce((s: number, v: any) => s + (v.contractAmount || 0), 0);
  const totalPaid = vendors.reduce((s: number, v: any) => s + (v.paidAmount || 0), 0);
  const totalDue = vendors.reduce((s: number, v: any) => s + (v.dueAmount || 0), 0);

  // Sort by dueAmount descending so the report is actionable
  const sortedVendors = useMemo(
    () => [...vendors].sort((a: any, b: any) => (b.dueAmount || 0) - (a.dueAmount || 0)),
    [vendors]
  );

  // ── Download PDF ────────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentW = W - margin * 2;
      let y = 0;

      const checkPage = (needed: number) => {
        if (y + needed > 275) {
          doc.addPage();
          y = 16;
        }
      };

      const drawRect = (x: number, yy: number, w: number, h: number, r: number, g: number, b: number) => {
        doc.setFillColor(r, g, b);
        doc.rect(x, yy, w, h, 'F');
      };

      const drawBorder = (x: number, yy: number, w: number, h: number, r: number, g: number, b: number) => {
        doc.setDrawColor(r, g, b);
        doc.rect(x, yy, w, h, 'S');
      };

      const text = (str: string, x: number, yy: number, opts?: any) => doc.text(str, x, yy, opts);

      // ── Header (Light themed, thin slate underline) ────────────────────────
      drawRect(0, 0, W, 22, 248, 250, 252); // slate-50 background
      doc.setDrawColor(226, 232, 240); // slate-200 border
      doc.line(0, 22, W, 22);

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // slate-900
      text('Metaphoric Architect — Vendor Report', margin, 10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      text(`Generated: ${new Date().toLocaleString()}`, margin, 16);
      y = 28;

      // ── Vendor Billing Summary ──────────────────────────────────────────────
      checkPage(40);
      drawRect(margin, y, contentW, 7, 241, 245, 249); // slate-100 header
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105); // slate-600
      text('VENDOR BILLING SUMMARY', margin + 2.5, y + 4.8);
      y += 10;

      const summaryData = [
        ['Total Contract Value', formatVal(totalContract), [71, 85, 105]], // slate-600
        ['Total Paid', formatVal(totalPaid), [5, 150, 105]], // emerald-600
        ['Total Due', formatVal(totalDue), totalDue > 0 ? [217, 119, 6] : [71, 85, 105]], // amber-600
      ];
      summaryData.forEach(([label, val, color]) => {
        checkPage(9);
        drawRect(margin, y, contentW, 8, 255, 255, 255); // white card
        drawBorder(margin, y, contentW, 8, 241, 245, 249);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        text(label as string, margin + 3, y + 5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor((color as number[])[0], (color as number[])[1], (color as number[])[2]);
        text(val as string, W - margin - 3, y + 5.5, { align: 'right' });
        y += 9;
      });
      y += 6;

      // ── Vendor Table ─────────────────────────────────────────────────────────
      checkPage(12);
      drawRect(margin, y, contentW, 7, 241, 245, 249); // slate-100
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      text('VENDOR BILLING DETAILS', margin + 2.5, y + 4.8);
      y += 10;

      // Table header
      checkPage(8);
      drawRect(margin, y, contentW, 7, 248, 250, 252);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      text('VENDOR', margin + 3, y + 5);
      text('WORK TYPE', margin + 75, y + 5);
      text('CONTRACT', margin + 112, y + 5);
      text('PAID', margin + 144, y + 5);
      text('DUE', W - margin - 3, y + 5, { align: 'right' });
      y += 8;

      sortedVendors.forEach((v: any, i: number) => {
        checkPage(9);
        const bg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        drawRect(margin, y, contentW, 8.5, bg[0], bg[1], bg[2]);
        drawBorder(margin, y, contentW, 8.5, 241, 245, 249);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        text(v.name, margin + 3, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const companyLabel = v.companyName ? v.companyName : '—';
        text(companyLabel, margin + 3, y + 7.5);
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const truncWorkType = (v.workType || '').length > 18 ? v.workType.slice(0, 16) + '…' : (v.workType || '');
        text(truncWorkType, margin + 75, y + 5.5);
        text(formatVal(v.contractAmount || 0), margin + 112, y + 5.5);
        doc.setTextColor(5, 150, 105);
        text(formatVal(v.paidAmount || 0), margin + 144, y + 5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(v.dueAmount > 0 ? 217 : 71, v.dueAmount > 0 ? 119 : 85, v.dueAmount > 0 ? 6 : 105);
        text(formatVal(v.dueAmount || 0), W - margin - 3, y + 5.5, { align: 'right' });
        y += 9;
      });

      // ── Footer ───────────────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        text(`Metaphoric Architect Vendor Report — Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' });
      }

      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!user) return null;

  if (user.role !== 'SUPER_ADMIN') {
    return (
      <AuthenticatedLayout>
        <Head title="Vendor Report" />
        <div className="border border-slate-800 rounded-2xl p-16 text-center text-slate-500">
          <HelpCircle className="h-10 w-10 mx-auto text-slate-700 mb-3" />
          <p className="font-semibold text-sm">Forbidden Access</p>
          <p className="text-xs mt-1 text-slate-600">You do not have permissions to view vendor billing reports.</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <Head title="Vendor Report" />
        <div className="h-96 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
          <span className="text-slate-500 text-xs font-semibold">Compiling vendor data...</span>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Head title="Vendor Report" />
      <div ref={reportRef} className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
              Vendor Billing Report
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Contract value, disbursed milestones, and outstanding dues across all subcontracting vendors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Date Range Filter */}
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onApply={(s, e) => { setStartDate(s); setEndDate(e); }}
            />

            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
          <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wallet className="h-4.5 w-4.5 text-cyan-400" />
            Vendor Billing Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Contract Value</span>
              <span className="text-base font-bold text-slate-200">{formatVal(totalContract)}</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Paid</span>
              <span className="text-base font-bold text-emerald-400">{formatVal(totalPaid)}</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Due</span>
              <span className={`text-base font-bold ${totalDue > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {formatVal(totalDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Vendor Table */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
          <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Briefcase className="h-4.5 w-4.5 text-cyan-400" />
            Vendor Billing Details
          </h2>
          {sortedVendors.length === 0 ? (
            <p className="text-slate-500 text-xs italic">No vendor data available.</p>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 p-3 bg-slate-950/40 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Vendor</span>
                <span>Work Type</span>
                <span className="text-right">Contract</span>
                <span className="text-right">Paid</span>
                <span className="text-right">Due</span>
              </div>
              <div className="divide-y divide-slate-800 text-xs">
                {sortedVendors.map((v: any) => (
                  <div
                    key={v.id}
                    className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-1 sm:gap-2 p-3 hover:bg-slate-900/10"
                  >
                    <div>
                      <span className="font-bold text-slate-200">{v.name}</span>
                      {v.companyName && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{v.companyName}</p>
                      )}
                    </div>
                    <span className="text-slate-400 flex items-center">{v.workType}</span>
                    <span className="font-semibold text-slate-300 sm:text-right flex items-center sm:justify-end">
                      {formatVal(v.contractAmount || 0)}
                    </span>
                    <span className="font-semibold text-emerald-400 sm:text-right flex items-center sm:justify-end">
                      {formatVal(v.paidAmount || 0)}
                    </span>
                    <span
                      className={`font-semibold sm:text-right flex items-center sm:justify-end ${
                        v.dueAmount > 0 ? 'text-amber-400' : 'text-slate-600'
                      }`}
                    >
                      {formatVal(v.dueAmount || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
