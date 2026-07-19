import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { DateRangeFilter } from '@/Components/ui/DateRangeFilter';
import {
  TrendingUp,
  Wallet,
  FolderKanban,
  HelpCircle,
  Loader2,
  Download,
  ChevronDown,
} from 'lucide-react';

const formatVal = (val: number) =>
  `${val < 0 ? '-' : ''}৳ ${Math.abs(val).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EXPENSE_CATEGORIES = [
  { key: 'MATERIALS', label: 'Materials Cost' },
  { key: 'LABOR', label: 'Labor Cost' },
  { key: 'EMPLOYEE_SALARY', label: 'Employee Salaries' },
  { key: 'VENDOR_PAYMENT', label: 'Vendor Milestones' },
  { key: 'OFFICE_RENT', label: 'Office Rent & Admin' },
  { key: 'UTILITIES', label: 'Utilities & Internet' },
  { key: 'TRANSPORTATION', label: 'Transportation Costs' },
  { key: 'FUEL', label: 'Fuel Expenses' },
  { key: 'EQUIPMENT_RENTAL', label: 'Equipment Rental' },
];
const KNOWN_CATS = EXPENSE_CATEGORIES.map((c) => c.key);

// Fetch a full (unpaginated) dataset from a paginated list endpoint by
// requesting a high limit — these aggregation reports need every record.
const FULL_LIST_LIMIT = 1000;

export default function ReportsPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

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
        const res = await axios.get('/api/transactions/cash-in', {
          params: { limit: FULL_LIST_LIMIT, startDate, endDate },
        });
        if (!cancelled && res.data.status === 'success') {
          setAllCashIns(res.data.data.cashIns || []);
        }
      } finally {
        if (!cancelled) setLoadingCashIns(false);
      }
    };

    const fetchCashOuts = async () => {
      try {
        const res = await axios.get('/api/transactions/cash-out', {
          params: { limit: FULL_LIST_LIMIT, startDate, endDate },
        });
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
  }, [user, startDate, endDate]);

  // Apply project filter
  const cashIns = useMemo(() =>
    selectedProjectId === 'all'
      ? allCashIns
      : allCashIns.filter((ci: any) => ci.projectId === selectedProjectId),
    [allCashIns, selectedProjectId]
  );

  const cashOuts = useMemo(() =>
    selectedProjectId === 'all'
      ? allCashOuts
      : allCashOuts.filter((co: any) => co.projectId === selectedProjectId),
    [allCashOuts, selectedProjectId]
  );

  // Core numbers
  const totalCashIn = cashIns.reduce((s: number, ci: any) => s + ci.amount, 0);
  const totalCashOut = cashOuts.reduce((s: number, co: any) => s + co.amount, 0);
  const netProfit = totalCashIn - totalCashOut;

  // P&L categories
  const plCategories = EXPENSE_CATEGORIES.map((cat) => ({
    label: cat.label,
    amount: cashOuts
      .filter((co: any) => co.expenseCategory === cat.key)
      .reduce((s: number, co: any) => s + co.amount, 0),
  }));
  const otherAmount = cashOuts
    .filter((co: any) => !KNOWN_CATS.includes(co.expenseCategory))
    .reduce((s: number, co: any) => s + co.amount, 0);
  const allPLCategories = [...plCategories, { label: 'Other / Miscellaneous', amount: otherAmount }];

  // Project profitability
  const projectReports = useMemo(() => {
    const filtered = selectedProjectId === 'all'
      ? projects
      : projects.filter((p: any) => p.id === selectedProjectId);

    return filtered.map((p: any) => {
      const pCashIns = allCashIns.filter((ci: any) => ci.projectId === p.id);
      const pCashOuts = allCashOuts.filter((co: any) => co.projectId === p.id);
      const revenue = pCashIns.reduce((s: number, ci: any) => s + ci.amount, 0) || p.estimatedBudget;
      const totalCost = pCashOuts.reduce((s: number, co: any) => s + co.amount, 0);
      const grossProfit = revenue - totalCost;
      const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const breakdown = EXPENSE_CATEGORIES.map((cat) => ({
        label: cat.label,
        amount: pCashOuts
          .filter((co: any) => co.expenseCategory === cat.key)
          .reduce((s: number, co: any) => s + co.amount, 0),
      })).filter((b) => b.amount > 0);
      return { id: p.id, name: p.name, code: p.code, budget: p.estimatedBudget, revenue, totalCost, grossProfit, margin, breakdown };
    });
  }, [projects, allCashIns, allCashOuts, selectedProjectId]);

  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);

  // ── Download PDF ────────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const projectLabel = selectedProjectId === 'all' ? 'All Projects' : selectedProject?.name || 'Report';
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
      text('Metaphoric Architect — Financial Report', margin, 10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      text(`Scope: ${projectLabel}   |   Generated: ${new Date().toLocaleString()}`, margin, 16);
      y = 28;

      // ── Cash Flow Summary (Clean light containers) ─────────────────────────
      checkPage(40);
      drawRect(margin, y, contentW, 7, 241, 245, 249); // slate-100 header
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105); // slate-600
      text('CASH FLOW SUMMARY', margin + 2.5, y + 4.8);
      y += 10;

      const cfData = [
        ['Total Cash In', `+${formatVal(totalCashIn)}`, [16, 185, 129]], // green-600
        ['Total Cash Out', `-${formatVal(totalCashOut)}`, [239, 68, 68]], // red-500
        ['Net Profit / Loss', formatVal(netProfit), netProfit >= 0 ? [5, 150, 105] : [220, 38, 38]],
      ];
      cfData.forEach(([label, val, color]) => {
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

      // ── P&L Breakdown ────────────────────────────────────────────────────────
      checkPage(12);
      drawRect(margin, y, contentW, 7, 241, 245, 249); // slate-100
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      text('PROFIT & LOSS — EXPENSE BREAKDOWN', margin + 2.5, y + 4.8);
      y += 10;

      // Revenue row
      checkPage(9);
      drawRect(margin, y, contentW, 8, 240, 253, 250); // emerald-50 bg
      drawBorder(margin, y, contentW, 8, 209, 250, 229);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(5, 150, 105);
      text('TOTAL REVENUE (CASH IN)', margin + 3, y + 5.5);
      text(`+${formatVal(totalCashIn)}`, W - margin - 3, y + 5.5, { align: 'right' });
      y += 9;

      allPLCategories.forEach((cat, i) => {
        checkPage(8);
        const bg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        drawRect(margin, y, contentW, 7.5, bg[0], bg[1], bg[2]);
        drawBorder(margin, y, contentW, 7.5, 241, 245, 249);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        text(cat.label, margin + 3, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(cat.amount > 0 ? 220 : 148, cat.amount > 0 ? 38 : 163, cat.amount > 0 ? 38 : 184);
        text(`-${formatVal(cat.amount)}`, W - margin - 3, y + 5, { align: 'right' });
        y += 8;
      });

      // Net profit row
      checkPage(10);
      drawRect(margin, y, contentW, 9, 241, 245, 249);
      drawBorder(margin, y, contentW, 9, 203, 213, 225);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      text('NET PROFIT / LOSS', margin + 3, y + 6);
      doc.setTextColor(netProfit >= 0 ? 5 : 220, netProfit >= 0 ? 150 : 38, netProfit >= 0 ? 105 : 38);
      text(formatVal(netProfit), W - margin - 3, y + 6, { align: 'right' });
      y += 14;

      // ── Project Profitability ────────────────────────────────────────────────
      checkPage(12);
      drawRect(margin, y, contentW, 7, 241, 245, 249);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      text('PROJECT PROFITABILITY AUDIT', margin + 2.5, y + 4.8);
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
      text('REVENUE', margin + 100, y + 5);
      text('COST', margin + 122, y + 5);
      text('PROFIT', margin + 143, y + 5);
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
        text(formatVal(r.revenue), margin + 100, y + 5.5);
        doc.setTextColor(220, 38, 38);
        text(formatVal(r.totalCost), margin + 122, y + 5.5);
        doc.setTextColor(r.grossProfit >= 0 ? 5 : 220, r.grossProfit >= 0 ? 150 : 38, r.grossProfit >= 0 ? 105 : 38);
        text(formatVal(r.grossProfit), margin + 143, y + 5.5);
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
        text(`Metaphoric Architect Financial Statement — Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' });
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
        <Head title="Reports" />
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
        <Head title="Reports" />
        <div className="h-96 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
          <span className="text-slate-500 text-xs font-semibold">Compiling financial data...</span>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Head title="Reports" />
      <div ref={reportRef} className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
              Financial Statements & Reports
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Profit & loss statement, cash flow reconciliation, and project profitability audit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Date Range Filter */}
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onApply={(s, e) => { setStartDate(s); setEndDate(e); }}
            />

            {/* Project Filter */}
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
              >
                <option value="all">All Projects</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            </div>

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

        {/* Scope Badge */}
        {selectedProjectId !== 'all' && selectedProject && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/5 border border-cyan-500/20 rounded-xl text-xs">
            <FolderKanban className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="text-slate-400">Showing report for:</span>
            <span className="font-bold text-cyan-300">{selectedProject.code} — {selectedProject.name}</span>
          </div>
        )}

        {/* Cash Flow Reconciliation */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
          <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wallet className="h-4.5 w-4.5 text-cyan-400" />
            Cash Flow Statement
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Cash In</span>
              <span className="text-base font-bold text-emerald-400">+{formatVal(totalCashIn)}</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Cash Out</span>
              <span className="text-base font-bold text-rose-400">-{formatVal(totalCashOut)}</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-cyan-500/20 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Net Profit / Loss</span>
              <span className={`text-base font-bold ${netProfit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                {formatVal(netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* P&L + Project Profitability */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* P&L Table */}
          <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
            <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-cyan-400" />
              Profit & Loss Statement
            </h2>
            <div className="space-y-3">
              {/* Revenue */}
              <div className="flex justify-between items-center p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="font-bold text-xs text-slate-300">TOTAL REVENUE (CASH IN)</span>
                <span className="font-bold text-sm text-emerald-400">+{formatVal(totalCashIn)}</span>
              </div>
              {/* Expense breakdown */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
                <div className="p-3 bg-slate-950/40 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Operating Cost Centers
                </div>
                <div className="divide-y divide-slate-800 text-xs">
                  {allPLCategories.map((cat, i) => (
                    <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-900/10">
                      <span className="text-slate-400">{cat.label}</span>
                      <span className={`font-semibold ${cat.amount > 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                        -{formatVal(cat.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Net profit */}
              <div className="flex justify-between items-center p-3 bg-slate-950/60 border border-slate-800 border-t-2 border-t-cyan-500/20 rounded-xl">
                <div>
                  <span className="font-bold text-xs text-slate-200">NET PROFIT / LOSS</span>
                  <p className="text-[9px] text-slate-500 mt-0.5">Total revenue minus total spending</p>
                </div>
                <span className={`font-bold text-sm ${netProfit >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {formatVal(netProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Project Profitability Audit */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
            <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <FolderKanban className="h-4.5 w-4.5 text-blue-400" />
              Project Profitability
            </h2>
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {projectReports.length === 0 ? (
                <p className="text-slate-500 text-xs italic">No project data available.</p>
              ) : (
                projectReports.map((report) => (
                  <div key={report.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{report.code}</span>
                        <h4 className="font-bold text-slate-200 mt-0.5 truncate w-36">{report.name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        report.margin >= 20 ? 'bg-emerald-500/10 text-emerald-400' :
                        report.margin >= 5 ? 'bg-cyan-500/10 text-cyan-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}>
                        {report.margin.toFixed(1)}%
                      </span>
                    </div>
                    <div className="space-y-1 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/40">
                      <div className="flex justify-between">
                        <span>Collections:</span>
                        <span className="font-bold text-slate-300">{formatVal(report.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spent:</span>
                        <span className="font-bold text-rose-400">{formatVal(report.totalCost)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-900">
                        <span>Net Return:</span>
                        <span className={`font-bold ${report.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatVal(report.grossProfit)}
                        </span>
                      </div>
                    </div>
                    {/* Cost breakdown pills */}
                    {report.breakdown.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {report.breakdown.map((b, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-500">
                            {b.label.split(' ')[0]}: {formatVal(b.amount)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
