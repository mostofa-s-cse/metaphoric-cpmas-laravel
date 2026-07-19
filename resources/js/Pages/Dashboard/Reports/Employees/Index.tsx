import React, { useState, useEffect, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { DateRangeFilter } from '@/Components/ui/DateRangeFilter';
import {
  Users2,
  Wallet,
  HelpCircle,
  Loader2,
  Download,
} from 'lucide-react';

const formatVal = (val: number) =>
  `${val < 0 ? '-' : ''}৳ ${Math.abs(val).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Fetch a full (unpaginated) dataset from a paginated list endpoint by
// requesting a high limit — this report needs every employee record.
const FULL_LIST_LIMIT = 1000;

export default function EmployeeReportPage() {
  const { auth } = usePage().props as any;
  const user = auth?.user;

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const isLoading = loadingEmployees;

  useEffect(() => {
    if (!user || user.role !== 'SUPER_ADMIN') return;

    let cancelled = false;

    const fetchEmployees = async () => {
      try {
        const res = await axios.get('/api/employees', {
          params: { limit: FULL_LIST_LIMIT, startDate, endDate },
        });
        if (!cancelled && res.data.status === 'success') {
          setEmployees(res.data.data.employees || []);
        }
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    };

    fetchEmployees();

    return () => {
      cancelled = true;
    };
  }, [user, startDate, endDate]);

  // Per-employee derived totals
  const employeeReports = useMemo(() => {
    return employees.map((e: any) => {
      const salaries = e.salaries || [];
      const totalDue = salaries.reduce((s: number, sal: any) => s + (sal.dueAmount || 0), 0);
      const totalPaid = salaries.reduce((s: number, sal: any) => s + (sal.paidAmount || 0), 0);
      return { ...e, totalDue, totalPaid };
    }).sort((a: any, b: any) => b.totalDue - a.totalDue);
  }, [employees]);

  const headcount = employeeReports.length;
  const activeCount = employeeReports.filter((e: any) => e.employmentStatus === 'ACTIVE').length;
  const totalSalaryDue = employeeReports.reduce((s: number, e: any) => s + e.totalDue, 0);
  const totalPayrollPaid = employeeReports.reduce((s: number, e: any) => s + e.totalPaid, 0);

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
      text('Metaphoric Architect — Employee Report', margin, 10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      text(`Scope: All Employees   |   Generated: ${new Date().toLocaleString()}`, margin, 16);
      y = 28;

      // ── Payroll Summary ─────────────────────────────────────────────────────
      checkPage(40);
      drawRect(margin, y, contentW, 7, 241, 245, 249); // slate-100 header
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105); // slate-600
      text('PAYROLL SUMMARY', margin + 2.5, y + 4.8);
      y += 10;

      const summaryData: [string, string, number[]][] = [
        ['Headcount', `${headcount} (${activeCount} Active)`, [71, 85, 105]],
        ['Total Salary Due', formatVal(totalSalaryDue), totalSalaryDue > 0 ? [220, 38, 38] : [71, 85, 105]],
        ['Total Payroll Paid', formatVal(totalPayrollPaid), [5, 150, 105]],
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

      // ── Employee Table ───────────────────────────────────────────────────────
      checkPage(12);
      drawRect(margin, y, contentW, 7, 241, 245, 249);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      text('EMPLOYEE PAYROLL DETAIL', margin + 2.5, y + 4.8);
      y += 10;

      // Table header
      checkPage(8);
      drawRect(margin, y, contentW, 7, 248, 250, 252);
      drawBorder(margin, y, contentW, 7, 226, 232, 240);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      text('EMPLOYEE', margin + 3, y + 5);
      text('STATUS', margin + 95, y + 5);
      text('MONTHLY SALARY', margin + 120, y + 5);
      text('PAID', margin + 158, y + 5);
      text('DUE', W - margin - 3, y + 5, { align: 'right' });
      y += 8;

      employeeReports.forEach((r: any, i: number) => {
        checkPage(9);
        const bg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
        drawRect(margin, y, contentW, 8.5, bg[0], bg[1], bg[2]);
        drawBorder(margin, y, contentW, 8.5, 241, 245, 249);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        const truncName = r.fullName && r.fullName.length > 26 ? r.fullName.slice(0, 24) + '…' : r.fullName;
        text(truncName || '—', margin + 3, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        text(`${r.designation || ''}${r.department ? ' • ' + r.department : ''}`, margin + 3, y + 7.5);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        const statusColor = r.employmentStatus === 'ACTIVE' ? [5, 150, 105] : [100, 116, 139];
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        text(r.employmentStatus || '—', margin + 95, y + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        text(formatVal(r.monthlySalary || 0), margin + 120, y + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 150, 105);
        text(formatVal(r.totalPaid), margin + 158, y + 5.5);

        doc.setTextColor(r.totalDue > 0 ? 220 : 100, r.totalDue > 0 ? 38 : 116, r.totalDue > 0 ? 38 : 139);
        text(formatVal(r.totalDue), W - margin - 3, y + 5.5, { align: 'right' });
        y += 9;
      });

      // ── Footer ───────────────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        text(`Metaphoric Architect Employee Report — Page ${i} of ${pageCount}`, W / 2, 290, { align: 'center' });
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
        <Head title="Employee Report" />
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
        <Head title="Employee Report" />
        <div className="h-96 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-3" />
          <span className="text-slate-500 text-xs font-semibold">Compiling financial data...</span>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Head title="Employee Report" />
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
              Employee Payroll Report
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Salary payout status and outstanding dues across the workforce.
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
            <span className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase mb-2">
              <Users2 className="h-3.5 w-3.5 text-cyan-400" />
              Headcount
            </span>
            <span className="text-xl font-bold text-slate-200">{headcount}</span>
            <p className="text-[10px] text-slate-500 mt-1">{activeCount} Active</p>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
            <span className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase mb-2">
              <Wallet className="h-3.5 w-3.5 text-amber-400" />
              Total Salary Due
            </span>
            <span className={`text-xl font-bold ${totalSalaryDue > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
              {formatVal(totalSalaryDue)}
            </span>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
            <span className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase mb-2">
              <Wallet className="h-3.5 w-3.5 text-emerald-400" />
              Total Payroll Paid
            </span>
            <span className="text-xl font-bold text-emerald-400">{formatVal(totalPayrollPaid)}</span>
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
          <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users2 className="h-4.5 w-4.5 text-cyan-400" />
            Employee Payroll Detail
          </h2>

          {employeeReports.length === 0 ? (
            <p className="text-slate-500 text-xs italic">No employee data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest">
                    <th className="text-left font-bold py-2.5 px-3">Employee</th>
                    <th className="text-left font-bold py-2.5 px-3">Status</th>
                    <th className="text-right font-bold py-2.5 px-3">Monthly Salary</th>
                    <th className="text-right font-bold py-2.5 px-3">Total Paid</th>
                    <th className="text-right font-bold py-2.5 px-3">Total Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {employeeReports.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-200">{r.fullName}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {r.designation}{r.department ? ` • ${r.department}` : ''}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.employmentStatus === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-slate-700/30 text-slate-400'
                        }`}>
                          {r.employmentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-300">
                        {formatVal(r.monthlySalary || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">
                        {formatVal(r.totalPaid)}
                      </td>
                      <td className={`py-3 px-3 text-right font-bold ${r.totalDue > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                        {formatVal(r.totalDue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
