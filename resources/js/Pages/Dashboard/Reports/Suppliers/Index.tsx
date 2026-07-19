import React, { useState, useEffect, useRef } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { DateRangeFilter } from '@/Components/ui/DateRangeFilter';
import {
  Truck,
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

export default function SupplierReportPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const isLoading = loadingSuppliers;

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') return;

    let cancelled = false;

    const fetchSuppliers = async () => {
      try {
        const res = await axios.get('/api/suppliers', {
          params: { limit: FULL_LIST_LIMIT, startDate, endDate },
        });
        if (!cancelled && res.data.status === 'success') {
          setSuppliers(res.data.data.suppliers || []);
        }
      } finally {
        if (!cancelled) setLoadingSuppliers(false);
      }
    };

    fetchSuppliers();

    return () => {
      cancelled = true;
    };
  }, [user, startDate, endDate]);

  // Core numbers
  const totalCurrentDue = suppliers.reduce((s: number, sup: any) => s + (sup.currentDue || 0), 0);
  const suppliersWithDue = suppliers.filter((sup: any) => (sup.currentDue || 0) > 0).length;

  // Sort by currentDue descending (biggest outstanding due first)
  const supplierReports = [...suppliers].sort((a: any, b: any) => (b.currentDue || 0) - (a.currentDue || 0));

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
      text('Metaphoric Architect — Supplier Report', margin, 10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      text(`Generated: ${new Date().toLocaleString()}`, margin, 16);
      y = 28;

      // ── Supplier Due Summary ────────────────────────────────────────────────
      checkPage(30);
      drawRect(margin, y, contentW, 7, 241, 245, 249); // slate-100 header
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105); // slate-600
      text('SUPPLIER DUE SUMMARY', margin + 2.5, y + 4.8);
      y += 10;

      const summaryData = [
        ['Total Current Due', formatVal(totalCurrentDue), totalCurrentDue > 0 ? [220, 38, 38] : [71, 85, 105]],
        ['Suppliers With Outstanding Due', `${suppliersWithDue} / ${suppliers.length}`, [71, 85, 105]],
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

      // ── Supplier Table ───────────────────────────────────────────────────────
      checkPage(12);
      drawRect(margin, y, contentW, 7, 241, 245, 249);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      text('SUPPLIER PURCHASE & DUE LEDGER', margin + 2.5, y + 4.8);
      y += 10;

      // Table header
      checkPage(8);
      drawRect(margin, y, contentW, 7, 248, 250, 252);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      text('SUPPLIER', margin + 3, y + 5);
      text('PURCHASES', margin + 120, y + 5);
      text('CURRENT DUE', W - margin - 3, y + 5, { align: 'right' });
      y += 8;

      if (supplierReports.length === 0) {
        checkPage(9);
        drawRect(margin, y, contentW, 8.5, 255, 255, 255);
        drawBorder(margin, y, contentW, 8.5, 241, 245, 249);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        text('No supplier data available.', margin + 3, y + 5.5);
        y += 9;
      }

      supplierReports.forEach((s: any, i: number) => {
        checkPage(9);
        const bg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        drawRect(margin, y, contentW, 8.5, bg[0], bg[1], bg[2]);
        drawBorder(margin, y, contentW, 8.5, 241, 245, 249);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        const truncName = (s.name || '').length > 30 ? s.name.slice(0, 28) + '…' : s.name;
        text(truncName, margin + 3, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        text(s.companyName || '—', margin + 3, y + 7.5);
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const invoiceCount = (s.materials || []).length;
        text(`${invoiceCount} Invoice(s)`, margin + 120, y + 5.5);
        const due = s.currentDue || 0;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(due > 0 ? 220 : 100, due > 0 ? 38 : 116, due > 0 ? 38 : 139);
        text(formatVal(due), W - margin - 3, y + 5.5, { align: 'right' });
        y += 9;
      });

      // ── Footer ───────────────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        text(`Metaphoric Architect Supplier Report — Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' });
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
        <Head title="Supplier Report" />
        <div className="border border-slate-800 rounded-2xl p-16 text-center text-slate-500">
          <HelpCircle className="h-10 w-10 mx-auto text-slate-700 mb-3" />
          <p className="font-semibold text-sm">Forbidden Access</p>
          <p className="text-xs mt-1 text-slate-600">You do not have permissions to view executive financial statements.</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <Head title="Supplier Report" />
        <div className="h-96 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
          <span className="text-slate-500 text-xs font-semibold">Compiling supplier data...</span>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Head title="Supplier Report" />
      <div ref={reportRef} className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
              Supplier Dues Report
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Outstanding liabilities and purchase history across all registered material suppliers.
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
            Supplier Due Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Current Due</span>
              <span className={`text-base font-bold ${totalCurrentDue > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                {formatVal(totalCurrentDue)}
              </span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Suppliers With Outstanding Due</span>
              <span className="text-base font-bold text-slate-200">
                {suppliersWithDue} / {suppliers.length}
              </span>
            </div>
          </div>
        </div>

        {/* Supplier Table */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
          <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Truck className="h-4.5 w-4.5 text-cyan-400" />
            Supplier Purchase &amp; Due Ledger
          </h2>
          {supplierReports.length === 0 ? (
            <p className="text-slate-500 text-xs italic">No supplier data available.</p>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
              <div className="grid grid-cols-3 p-3 bg-slate-950/40 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Supplier</span>
                <span>Total Purchases</span>
                <span className="text-right">Current Due</span>
              </div>
              <div className="divide-y divide-slate-800 text-xs">
                {supplierReports.map((s: any) => {
                  const due = s.currentDue || 0;
                  const invoiceCount = (s.materials || []).length;
                  return (
                    <div key={s.id} className="grid grid-cols-3 items-center p-3 hover:bg-slate-900/10">
                      <div>
                        <span className="block font-bold text-slate-200">{s.name}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{s.companyName || '—'}</span>
                      </div>
                      <span className="text-slate-400">{invoiceCount} Invoice(s)</span>
                      <span className={`text-right font-semibold ${due > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                        {formatVal(due)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
