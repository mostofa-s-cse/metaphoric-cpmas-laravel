import React, { useState, useEffect, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { DateRangeFilter } from '@/Components/ui/DateRangeFilter';
import {
  Landmark,
  Wallet,
  PiggyBank,
  HelpCircle,
  Loader2,
  Download,
} from 'lucide-react';

const formatVal = (val: number) =>
  `${val < 0 ? '-' : ''}৳ ${Math.abs(val).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Office/overhead categories are the only cash-out categories that draw from
// a Bank Account instead of a project's own pool (see
// ExpenseCategory::isOfficeExpense() on the backend) — everything else here
// (MATERIALS, LABOR, VENDOR_PAYMENT, SUPPLIER_PAYMENT) belongs to the
// project-scoped Financial Statement report instead.
const OFFICE_EXPENSE_CATEGORIES = [
  { key: 'OFFICE_RENT', label: 'Office Rent & Admin' },
  { key: 'UTILITIES', label: 'Utilities & Internet' },
  { key: 'TRANSPORTATION', label: 'Transportation Costs' },
  { key: 'FUEL', label: 'Fuel Expenses' },
  { key: 'EQUIPMENT_RENTAL', label: 'Equipment Rental' },
  { key: 'EMPLOYEE_SALARY', label: 'Employee Salaries' },
  { key: 'MISCELLANEOUS', label: 'Miscellaneous' },
];
const OFFICE_CAT_KEYS = OFFICE_EXPENSE_CATEGORIES.map((c) => c.key);
const MODES = ['CASH', 'BANK', 'CHEQUE', 'MOBILE_BANKING'] as const;

// Fetch a full (unpaginated) dataset from a paginated list endpoint by
// requesting a high limit — this aggregation report needs every record.
const FULL_LIST_LIMIT = 1000;

export default function BankReportPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [accounts, setAccounts] = useState<any[]>([]);
  const [allCashIns, setAllCashIns] = useState<any[]>([]);
  const [allCashOuts, setAllCashOuts] = useState<any[]>([]);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingCashIns, setLoadingCashIns] = useState(true);
  const [loadingCashOuts, setLoadingCashOuts] = useState(true);

  const isLoading = loadingAccounts || loadingCashIns || loadingCashOuts;

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') return;

    let cancelled = false;

    const fetchAccounts = async () => {
      try {
        const res = await axios.get('/api/bank-accounts');
        if (!cancelled && res.data.status === 'success') {
          setAccounts(res.data.data.accounts || []);
        }
      } finally {
        if (!cancelled) setLoadingAccounts(false);
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

    fetchAccounts();
    fetchCashIns();
    fetchCashOuts();

    return () => {
      cancelled = true;
    };
  }, [user, startDate, endDate]);

  // Corporate/bank scope only — the mirror image of the project-scoped
  // Financial Statement report. Cash-in with no project is general corporate
  // income; cash-out counts here if it's an office/overhead category or has
  // no project (both never draw from a project's own pool).
  const cashIns = useMemo(() => allCashIns.filter((ci: any) => !ci.projectId), [allCashIns]);
  const cashOuts = useMemo(
    () => allCashOuts.filter((co: any) => !co.projectId || OFFICE_CAT_KEYS.includes(co.expenseCategory)),
    [allCashOuts]
  );

  const totalCashIn = cashIns.reduce((s: number, ci: any) => s + ci.amount, 0);
  const totalCashOut = cashOuts.reduce((s: number, co: any) => s + co.amount, 0);
  const netCashFlow = totalCashIn - totalCashOut;

  const cashInByMode = useMemo(() => {
    const map: Record<string, number> = {};
    MODES.forEach((m) => { map[m] = 0; });
    cashIns.forEach((ci: any) => { map[ci.paymentMethod] = (map[ci.paymentMethod] || 0) + ci.amount; });
    return map;
  }, [cashIns]);

  const cashOutByMode = useMemo(() => {
    const map: Record<string, number> = {};
    MODES.forEach((m) => { map[m] = 0; });
    cashOuts.forEach((co: any) => { map[co.paymentMethod] = (map[co.paymentMethod] || 0) + co.amount; });
    return map;
  }, [cashOuts]);

  const expenseBreakdown = useMemo(() => OFFICE_EXPENSE_CATEGORIES.map((cat) => ({
    label: cat.label,
    amount: cashOuts
      .filter((co: any) => co.expenseCategory === cat.key)
      .reduce((s: number, co: any) => s + co.amount, 0),
  })), [cashOuts]);

  const totalBalance = accounts.reduce((s, a: any) => s + Number(a.currentBalance), 0);

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

      drawRect(0, 0, W, 22, 248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.line(0, 22, W, 22);

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      text('Metaphoric Architect — Bank / Corporate Report', margin, 10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      text(`Generated: ${new Date().toLocaleString()}`, margin, 16);
      y = 28;

      checkPage(40);
      drawRect(margin, y, contentW, 7, 241, 245, 249);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      text('CORPORATE CASH FLOW', margin + 2.5, y + 4.8);
      y += 10;

      const cfData: [string, string, number[]][] = [
        ['Total Cash In', `+${formatVal(totalCashIn)}`, [16, 185, 129]],
        ['Total Cash Out', `-${formatVal(totalCashOut)}`, [239, 68, 68]],
        ['Net Cash Flow', formatVal(netCashFlow), netCashFlow >= 0 ? [5, 150, 105] : [220, 38, 38]],
        ['Main Balance (all accounts)', formatVal(totalBalance), [217, 119, 6]],
      ];
      cfData.forEach(([label, val, color]) => {
        checkPage(9);
        drawRect(margin, y, contentW, 8, 255, 255, 255);
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

      checkPage(12);
      drawRect(margin, y, contentW, 7, 241, 245, 249);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      text('OFFICE / OVERHEAD EXPENSE BREAKDOWN', margin + 2.5, y + 4.8);
      y += 10;

      expenseBreakdown.forEach((cat, i) => {
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
      y += 6;

      checkPage(12);
      drawRect(margin, y, contentW, 7, 241, 245, 249);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      text('BANK / CASH ACCOUNTS', margin + 2.5, y + 4.8);
      y += 10;

      checkPage(8);
      drawRect(margin, y, contentW, 7, 248, 250, 252);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      text('ACCOUNT', margin + 3, y + 5);
      text('TYPE', margin + 85, y + 5);
      text('OPENING', margin + 115, y + 5);
      text('CURRENT BALANCE', W - margin - 3, y + 5, { align: 'right' });
      y += 8;

      accounts.forEach((a: any, i: number) => {
        checkPage(9);
        const bg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        drawRect(margin, y, contentW, 8.5, bg[0], bg[1], bg[2]);
        drawBorder(margin, y, contentW, 8.5, 241, 245, 249);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        text(a.name, margin + 3, y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        text(a.accountType.replace('_', ' '), margin + 85, y + 5.5);
        text(formatVal(Number(a.openingBalance)), margin + 115, y + 5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(217, 119, 6);
        text(formatVal(Number(a.currentBalance)), W - margin - 3, y + 5.5, { align: 'right' });
        y += 9;
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        text(`Metaphoric Architect Bank Report — Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' });
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
        <Head title="Bank Report" />
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
        <Head title="Bank Report" />
        <div className="h-96 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
          <span className="text-slate-500 text-xs font-semibold">Compiling bank data...</span>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Head title="Bank Report" />
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
              Bank / Corporate Report
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              General corporate cash flow and office/overhead spend — money that never touches a project's own pool.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onApply={(s, e) => { setStartDate(s); setEndDate(e); }}
            />

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

        {/* Corporate Cash Flow */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
          <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wallet className="h-4.5 w-4.5 text-cyan-400" />
            Corporate Cash Flow
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Cash In</span>
              <span className="text-base font-bold text-emerald-400">+{formatVal(totalCashIn)}</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Cash Out</span>
              <span className="text-base font-bold text-rose-400">-{formatVal(totalCashOut)}</span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-cyan-500/20 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Net Cash Flow</span>
              <span className={`text-base font-bold ${netCashFlow >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                {formatVal(netCashFlow)}
              </span>
            </div>
            <div className="p-4 bg-slate-950/40 border border-amber-500/20 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Main Balance</span>
              <span className="text-base font-bold text-amber-400">{formatVal(totalBalance)}</span>
              <span className="block text-[9px] text-slate-600 mt-0.5">across all active bank/cash accounts</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800/60">
            {MODES.map((mode) => (
              <div key={mode} className="p-2.5 bg-slate-950/30 border border-slate-800 rounded-lg text-[10px]">
                <span className="block text-slate-500 font-bold uppercase tracking-wide mb-1">{mode.replace('_', ' ')}</span>
                <span className="block text-emerald-400 font-semibold">+{formatVal(cashInByMode[mode] || 0)}</span>
                <span className="block text-rose-400 font-semibold">-{formatVal(cashOutByMode[mode] || 0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown + Bank Accounts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
            <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <PiggyBank className="h-4.5 w-4.5 text-amber-400" />
              Office / Overhead Expense Breakdown
            </h2>
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
              <div className="divide-y divide-slate-800 text-xs">
                {expenseBreakdown.map((cat, i) => (
                  <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-900/10">
                    <span className="text-slate-400">{cat.label}</span>
                    <span className={`font-semibold ${cat.amount > 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                      -{formatVal(cat.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
            <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Landmark className="h-4.5 w-4.5 text-blue-400" />
              Bank / Cash Accounts
            </h2>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {accounts.length === 0 ? (
                <p className="text-slate-500 text-xs italic">No bank accounts found.</p>
              ) : (
                accounts.map((a: any) => (
                  <div key={a.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-200">{a.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0 bg-slate-900 border border-slate-800 text-slate-400">
                        {a.accountType.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Opening</span>
                      <span className="font-semibold text-slate-400">{formatVal(Number(a.openingBalance))}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>In / Out</span>
                      <span>
                        <span className="font-semibold text-emerald-400">+{formatVal(Number(a.totalIn))}</span>
                        {' / '}
                        <span className="font-semibold text-rose-400">-{formatVal(Number(a.totalOut))}</span>
                      </span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-900">
                      <span className="text-slate-400 font-semibold">Current Balance</span>
                      <span className="font-bold text-amber-400">{formatVal(Number(a.currentBalance))}</span>
                    </div>
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
