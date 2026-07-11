import React, { useState, useEffect, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
  TrendingUp,
  FolderKanban,
  HelpCircle,
  Loader2,
  Download,
} from 'lucide-react';

const formatVal = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

// Fetch a full (unpaginated) dataset from a paginated list endpoint by
// requesting a high limit — this aggregation report needs every record.
const FULL_LIST_LIMIT = 1000;

export default function ProjectReportPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [projects, setProjects] = useState<any[]>([]);
  const [allCashIns, setAllCashIns] = useState<any[]>([]);
  const [allCashOuts, setAllCashOuts] = useState<any[]>([]);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingCashIns, setLoadingCashIns] = useState(true);
  const [loadingCashOuts, setLoadingCashOuts] = useState(true);

  const isLoading = loadingProjects || loadingCashIns || loadingCashOuts;

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') return;

    let cancelled = false;

    const fetchProjects = async () => {
      try {
        const res = await axios.get('/api/projects', { params: { limit: FULL_LIST_LIMIT } });
        if (!cancelled && res.data.status === 'success') {
          setProjects(res.data.data.projects || []);
        }
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    };

    const fetchCashIns = async () => {
      try {
        const res = await axios.get('/api/transactions/cash-in', { params: { limit: FULL_LIST_LIMIT } });
        if (!cancelled && res.data.status === 'success') {
          setAllCashIns(res.data.data.cashIns || []);
        }
      } finally {
        if (!cancelled) setLoadingCashIns(false);
      }
    };

    const fetchCashOuts = async () => {
      try {
        const res = await axios.get('/api/transactions/cash-out', { params: { limit: FULL_LIST_LIMIT } });
        if (!cancelled && res.data.status === 'success') {
          setAllCashOuts(res.data.data.cashOuts || []);
        }
      } finally {
        if (!cancelled) setLoadingCashOuts(false);
      }
    };

    fetchProjects();
    fetchCashIns();
    fetchCashOuts();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Per-project budget / collections / spend reconciliation
  const projectReports = useMemo(() => {
    return projects.map((p: any) => {
      const collected = allCashIns
        .filter((ci: any) => ci.projectId === p.id)
        .reduce((s: number, ci: any) => s + ci.amount, 0);
      const spent = allCashOuts
        .filter((co: any) => co.projectId === p.id)
        .reduce((s: number, co: any) => s + co.amount, 0);
      const profit = collected - spent;
      const margin = collected > 0 ? (profit / collected) * 100 : 0;
      return { id: p.id, code: p.code, name: p.name, budget: p.estimatedBudget, collected, spent, profit, margin };
    });
  }, [projects, allCashIns, allCashOuts]);

  // Summary totals
  const totalBudget = projectReports.reduce((s, r) => s + r.budget, 0);
  const totalSpent = projectReports.reduce((s, r) => s + r.spent, 0);
  const totalCollected = projectReports.reduce((s, r) => s + r.collected, 0);
  const overallMargin = totalCollected > 0 ? ((totalCollected - totalSpent) / totalCollected) * 100 : 0;

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
      text('Metaphoric Architect — Project Report', margin, 10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      text(`Generated: ${new Date().toLocaleString()}`, margin, 16);
      y = 28;

      // ── Project Financial Summary ───────────────────────────────────────────
      checkPage(40);
      drawRect(margin, y, contentW, 7, 241, 245, 249); // slate-100 header
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105); // slate-600
      text('PROJECT FINANCIAL SUMMARY', margin + 2.5, y + 4.8);
      y += 10;

      const summaryData: [string, string, number[]][] = [
        ['Total Budget', formatVal(totalBudget), [71, 85, 105]],
        ['Total Collected', `+${formatVal(totalCollected)}`, [16, 185, 129]],
        ['Total Spent', `-${formatVal(totalSpent)}`, [239, 68, 68]],
        ['Overall Margin', `${overallMargin.toFixed(1)}%`, overallMargin >= 0 ? [5, 150, 105] : [220, 38, 38]],
      ];
      summaryData.forEach(([label, val, color]) => {
        checkPage(9);
        drawRect(margin, y, contentW, 8, 255, 255, 255); // white card
        drawBorder(margin, y, contentW, 8, 241, 245, 249);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        text(label, margin + 3, y + 5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(color[0], color[1], color[2]);
        text(val, W - margin - 3, y + 5.5, { align: 'right' });
        y += 9;
      });
      y += 6;

      // ── Per-Project Table ────────────────────────────────────────────────────
      checkPage(12);
      drawRect(margin, y, contentW, 7, 241, 245, 249);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      text('PROJECT-BY-PROJECT BREAKDOWN', margin + 2.5, y + 4.8);
      y += 10;

      // Table header
      checkPage(8);
      drawRect(margin, y, contentW, 7, 248, 250, 252);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      text('PROJECT', margin + 3, y + 5);
      text('BUDGET', margin + 75, y + 5);
      text('COLLECTED', margin + 100, y + 5);
      text('SPENT', margin + 128, y + 5);
      text('PROFIT', margin + 150, y + 5);
      text('MARGIN', W - margin - 3, y + 5, { align: 'right' });
      y += 8;

      projectReports.forEach((r, i) => {
        checkPage(9);
        const bg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        drawRect(margin, y, contentW, 8.5, bg[0], bg[1], bg[2]);
        drawBorder(margin, y, contentW, 8.5, 241, 245, 249);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        text(r.code, margin + 3, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        const truncName = r.name.length > 22 ? r.name.slice(0, 20) + '…' : r.name;
        text(truncName, margin + 3, y + 7.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        text(formatVal(r.budget), margin + 75, y + 5.5);
        doc.setTextColor(5, 150, 105);
        text(formatVal(r.collected), margin + 100, y + 5.5);
        doc.setTextColor(220, 38, 38);
        text(formatVal(r.spent), margin + 128, y + 5.5);
        doc.setTextColor(r.profit >= 0 ? 5 : 220, r.profit >= 0 ? 150 : 38, r.profit >= 0 ? 105 : 38);
        text(formatVal(r.profit), margin + 150, y + 5.5);
        const marginColor = r.margin >= 20 ? [5, 150, 105] : r.margin >= 5 ? [2, 132, 199] : [220, 38, 38];
        doc.setTextColor(marginColor[0], marginColor[1], marginColor[2]);
        doc.setFont('helvetica', 'bold');
        text(`${r.margin.toFixed(1)}%`, W - margin - 3, y + 5.5, { align: 'right' });
        y += 9;
      });

      // ── Footer ───────────────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        text(`Metaphoric Architect Project Report — Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' });
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
        <Head title="Project Report" />
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
        <Head title="Project Report" />
        <div className="h-96 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
          <span className="text-slate-500 text-xs font-semibold">Compiling project data...</span>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Head title="Project Report" />
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
              Project Financial Report
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Budget, collections, and spend reconciliation across every active project.
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
            <TrendingUp className="h-4.5 w-4.5 text-cyan-400" />
            Project Financial Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Budget</span>
              <span className="text-base font-bold text-slate-200">{formatVal(totalBudget)}</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Spent</span>
              <span className="text-base font-bold text-rose-400">-{formatVal(totalSpent)}</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Collected</span>
              <span className="text-base font-bold text-emerald-400">+{formatVal(totalCollected)}</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-cyan-500/20 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Overall Margin</span>
              <span className={`text-base font-bold ${overallMargin >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                {overallMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Project Profitability Table */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
          <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <FolderKanban className="h-4.5 w-4.5 text-blue-400" />
            Project-by-Project Breakdown
          </h2>
          <div className="space-y-3">
            {projectReports.length === 0 ? (
              <p className="text-slate-500 text-xs italic">No project data available.</p>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
                <div className="p-3 bg-slate-950/40 border-b border-slate-800 grid grid-cols-6 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span className="col-span-2">Project</span>
                  <span className="text-right">Budget</span>
                  <span className="text-right">Collected (Spent)</span>
                  <span className="text-right">Profit</span>
                  <span className="text-right">Margin</span>
                </div>
                <div className="divide-y divide-slate-800 text-xs">
                  {projectReports.map((report) => (
                    <div key={report.id} className="p-3 bg-slate-950/60 grid grid-cols-6 gap-2 items-center hover:bg-slate-900/20">
                      <div className="col-span-2">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">{report.code}</span>
                        <span className="font-bold text-slate-200 truncate block">{report.name}</span>
                      </div>
                      <span className="text-right font-semibold text-slate-300">{formatVal(report.budget)}</span>
                      <span className="text-right">
                        <span className="font-semibold text-emerald-400 block">{formatVal(report.collected)}</span>
                        <span className="font-semibold text-rose-400 block text-[10px]">({formatVal(report.spent)})</span>
                      </span>
                      <span className={`text-right font-semibold ${report.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatVal(report.profit)}
                      </span>
                      <span className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          report.margin >= 20 ? 'bg-emerald-500/10 text-emerald-400' :
                          report.margin >= 5 ? 'bg-cyan-500/10 text-cyan-400' :
                          'bg-rose-500/10 text-rose-400'
                        }`}>
                          {report.margin.toFixed(1)}%
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
