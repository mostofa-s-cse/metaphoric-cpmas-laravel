import React, { useState, useEffect, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
  PackageSearch,
  HelpCircle,
  Loader2,
  Download,
} from 'lucide-react';

const formatVal = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

// Fetch a full (unpaginated) dataset from a paginated list endpoint by
// requesting a high limit — this aggregation report needs every record.
const FULL_LIST_LIMIT = 1000;

export default function MaterialReportPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  const isLoading = loadingMaterials;

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') return;

    let cancelled = false;

    const fetchMaterials = async () => {
      try {
        const res = await axios.get('/api/materials', { params: { limit: FULL_LIST_LIMIT } });
        if (!cancelled && res.data.status === 'success') {
          setMaterials(res.data.data.materials || []);
        }
      } finally {
        if (!cancelled) setLoadingMaterials(false);
      }
    };

    fetchMaterials();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Core numbers
  const totalMaterialCost = materials.reduce((s: number, m: any) => s + Number(m.totalPrice || 0), 0);
  const totalPurchaseRecords = materials.length;

  // Cost by category, sorted highest cost first
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    materials.forEach((m: any) => {
      const cat = m.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + Number(m.totalPrice || 0));
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        pct: totalMaterialCost > 0 ? (amount / totalMaterialCost) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [materials, totalMaterialCost]);

  // Materials table, sorted by biggest purchases first
  const sortedMaterials = useMemo(() =>
    [...materials].sort((a: any, b: any) => Number(b.totalPrice || 0) - Number(a.totalPrice || 0)),
    [materials]
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
      text('Metaphoric Architect — Material Report', margin, 10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      text(`Generated: ${new Date().toLocaleString()}`, margin, 16);
      y = 28;

      // ── Material Cost Summary ───────────────────────────────────────────────
      checkPage(20);
      drawRect(margin, y, contentW, 7, 241, 245, 249); // slate-100 header
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105); // slate-600
      text('MATERIAL COST SUMMARY', margin + 2.5, y + 4.8);
      y += 10;

      const summaryData = [
        ['Total Material Cost', formatVal(totalMaterialCost), [71, 85, 105]],
        ['Total Purchase Invoices', String(totalPurchaseRecords), [71, 85, 105]],
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

      // ── Cost by Category ─────────────────────────────────────────────────────
      checkPage(12);
      drawRect(margin, y, contentW, 7, 241, 245, 249);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      text('COST BY CATEGORY', margin + 2.5, y + 4.8);
      y += 10;

      categoryBreakdown.forEach((cat, i) => {
        checkPage(8);
        const bg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        drawRect(margin, y, contentW, 7.5, bg[0], bg[1], bg[2]);
        drawBorder(margin, y, contentW, 7.5, 241, 245, 249);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        text(cat.category, margin + 3, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        text(formatVal(cat.amount), W - margin - 30, y + 5, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        text(`${cat.pct.toFixed(1)}%`, W - margin - 3, y + 5, { align: 'right' });
        y += 8;
      });
      y += 6;

      // ── Materials Table ───────────────────────────────────────────────────────
      checkPage(12);
      drawRect(margin, y, contentW, 7, 241, 245, 249);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      text('MATERIAL PURCHASE RECORDS', margin + 2.5, y + 4.8);
      y += 10;

      // Table header
      checkPage(8);
      drawRect(margin, y, contentW, 7, 248, 250, 252);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      text('MATERIAL', margin + 3, y + 5);
      text('PROJECT', margin + 75, y + 5);
      text('SUPPLIER', margin + 110, y + 5);
      text('QTY', margin + 145, y + 5);
      text('COST', W - margin - 3, y + 5, { align: 'right' });
      y += 8;

      sortedMaterials.forEach((m: any, i: number) => {
        checkPage(9);
        const bg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        drawRect(margin, y, contentW, 8.5, bg[0], bg[1], bg[2]);
        drawBorder(margin, y, contentW, 8.5, 241, 245, 249);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        const name = String(m.name || '');
        const truncName = name.length > 26 ? name.slice(0, 24) + '…' : name;
        text(truncName, margin + 3, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        text(String(m.category || ''), margin + 3, y + 7);

        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const projectLabel = m.project?.code || m.project?.name || '—';
        text(String(projectLabel), margin + 75, y + 5.5);

        text(String(m.supplier?.name || '—'), margin + 110, y + 5.5);

        text(`${m.quantity} ${m.unit}`, margin + 145, y + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        text(formatVal(Number(m.totalPrice || 0)), W - margin - 3, y + 5.5, { align: 'right' });

        y += 9;
      });

      // ── Footer ───────────────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        text(`Metaphoric Architect Material Report — Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' });
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
        <Head title="Material Report" />
        <div className="border border-slate-800 rounded-2xl p-16 text-center text-slate-500">
          <HelpCircle className="h-10 w-10 mx-auto text-slate-700 mb-3" />
          <p className="font-semibold text-sm">Forbidden Access</p>
          <p className="text-xs mt-1 text-slate-600">You do not have permissions to view material cost reports.</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <Head title="Material Report" />
        <div className="h-96 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
          <span className="text-slate-500 text-xs font-semibold">Compiling material cost data...</span>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Head title="Material Report" />
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
              Material Cost Report
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Purchase costs and category breakdown across all logged material invoices.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
            <PackageSearch className="h-4.5 w-4.5 text-cyan-400" />
            Material Cost Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Material Cost</span>
              <span className="text-base font-bold text-cyan-400">{formatVal(totalMaterialCost)}</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Purchase Invoices</span>
              <span className="text-base font-bold text-slate-200">{totalPurchaseRecords}</span>
            </div>
          </div>
        </div>

        {materials.length === 0 ? (
          <div className="border border-slate-800 rounded-2xl p-16 text-center text-slate-500">
            <PackageSearch className="h-10 w-10 mx-auto text-slate-700 mb-3" />
            <p className="font-semibold text-sm">No material purchase data available.</p>
          </div>
        ) : (
          <>
            {/* Cost by Category */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
              <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <PackageSearch className="h-4.5 w-4.5 text-blue-400" />
                Cost by Category
              </h2>
              <div className="space-y-2">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.category} className="flex justify-between items-center p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs">
                    <span className="font-semibold text-slate-300">{cat.category}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-200">{formatVal(cat.amount)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-500">
                        {cat.pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials Table */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
              <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <PackageSearch className="h-4.5 w-4.5 text-cyan-400" />
                Material Purchase Records
              </h2>
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <th className="text-left p-3">Material</th>
                      <th className="text-left p-3">Project</th>
                      <th className="text-left p-3">Supplier</th>
                      <th className="text-left p-3">Qty &amp; Unit</th>
                      <th className="text-right p-3">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sortedMaterials.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-900/10">
                        <td className="p-3">
                          <span className="font-semibold text-slate-200 block">{m.name}</span>
                          <span className="text-[10px] text-slate-500">{m.category}</span>
                        </td>
                        <td className="p-3 text-slate-400">{m.project?.code || m.project?.name || '—'}</td>
                        <td className="p-3 text-slate-400">{m.supplier?.name || '—'}</td>
                        <td className="p-3 text-slate-400">{m.quantity} {m.unit}</td>
                        <td className="p-3 text-right font-bold text-slate-200">{formatVal(Number(m.totalPrice || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
