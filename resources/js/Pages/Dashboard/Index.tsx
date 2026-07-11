import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
  FolderKanban, Play, CheckCircle2, Users2, Truck, Briefcase, HardHat,
  ArrowUpRight, ArrowDownRight, Coins, AlertTriangle, TrendingUp, TrendingDown,
  Wallet, CircleDollarSign, UserCheck, PiggyBank,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

const COLORS = ['#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#e11d48'];

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

interface Summary {
  totalProjects: number; runningProjects: number; completedProjects: number;
  totalClients: number; totalSuppliers: number; totalVendors: number;
  totalEmployees: number; totalLabour: number; totalCashIn: number;
  totalCashOut: number; netProfit: number; supplierDue: number;
  vendorDue: number; salaryDue: number; cashBalance: number;
  mainBalance: number; mainBalanceAllocated: number; mainBalancePercentage: number;
}

interface Props {
  summary: Summary;
  expenseBreakdown: { category: string; value: number }[];
  monthlyTrends: { month: string; revenue: number; expenses: number; profit: number }[];
  projectComparison: { name: string; budget: number; spent: number }[];
}

export default function DashboardIndex({ summary, expenseBreakdown, monthlyTrends, projectComparison }: Props) {
  const { auth } = usePage().props as any;
  const userRole: string = auth?.user?.role || 'SUPER_ADMIN';
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const widgetData = [
    { title: 'Total Projects',     value: summary.totalProjects,              desc: 'Overall created',            icon: FolderKanban,    color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',      roles: ['SUPER_ADMIN'] },
    { title: 'Running Projects',   value: summary.runningProjects,            desc: 'Active construction',        icon: Play,            color: 'text-blue-400 border-blue-500/20 bg-blue-500/5',      roles: ['SUPER_ADMIN'] },
    { title: 'Completed Projects', value: summary.completedProjects,          desc: 'Successfully handed over',   icon: CheckCircle2,    color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5', roles: ['SUPER_ADMIN'] },
    { title: 'Total Clients',      value: summary.totalClients,               desc: 'Corporate partners',         icon: UserCheck,       color: 'text-purple-400 border-purple-500/20 bg-purple-500/5', roles: ['SUPER_ADMIN'] },
    { title: 'Total Suppliers',    value: summary.totalSuppliers,             desc: 'Material dealers',           icon: Truck,           color: 'text-orange-400 border-orange-500/20 bg-orange-500/5', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DATA_ENTRY_OPERATOR'] },
    { title: 'Total Vendors',      value: summary.totalVendors,               desc: 'Specialized teams',          icon: Briefcase,       color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5', roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'] },
    { title: 'Total Employees',    value: summary.totalEmployees,             desc: 'Office & field staff',       icon: Users2,          color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'] },
    { title: 'Total Labor',        value: summary.totalLabour,                desc: 'Daily wage workforce',       icon: HardHat,         color: 'text-pink-400 border-pink-500/20 bg-pink-500/5',       roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'] },
    { title: 'Total Cash In',      value: formatCurrency(summary.totalCashIn), desc: 'Accumulated revenue',      icon: ArrowUpRight,    color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DATA_ENTRY_OPERATOR'] },
    { title: 'Total Cash Out',     value: formatCurrency(summary.totalCashOut),desc: 'Accumulated spending',     icon: ArrowDownRight,  color: 'text-rose-400 border-rose-500/20 bg-rose-500/5',       roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DATA_ENTRY_OPERATOR'] },
    { title: 'Net Profit',         value: formatCurrency(summary.netProfit),  desc: 'Revenue minus cost',         icon: TrendingUp,      color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',      roles: ['SUPER_ADMIN'] },
    { title: 'Cash Balance',       value: formatCurrency(summary.cashBalance), desc: 'Current cash in hand',     icon: Wallet,          color: 'text-teal-400 border-teal-500/20 bg-teal-500/5',       roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DATA_ENTRY_OPERATOR'] },
    { title: 'Main Balance',       value: formatCurrency(summary.mainBalance), desc: `${summary.mainBalancePercentage}% of all project budgets (${formatCurrency(summary.mainBalanceAllocated)})`, icon: PiggyBank, color: 'text-amber-400 border-amber-500/20 bg-amber-500/5', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DATA_ENTRY_OPERATOR'] },
    { title: 'Supplier Due',       value: formatCurrency(summary.supplierDue), desc: 'Unpaid bills',             icon: Coins,           color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',    roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DATA_ENTRY_OPERATOR'] },
    { title: 'Vendor Due',         value: formatCurrency(summary.vendorDue),  desc: 'Pending milestones',        icon: AlertTriangle,   color: 'text-red-400 border-red-500/20 bg-red-500/5',          roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'] },
    { title: 'Salary Due',         value: formatCurrency(summary.salaryDue),  desc: 'Employee unpaid salary',    icon: CircleDollarSign,color: 'text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/5',roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'PROJECT_MANAGER', 'DATA_ENTRY_OPERATOR'] },
  ];

  const allowedWidgets = widgetData.filter((w) => w.roles.includes(userRole));
  const showFinancialCharts = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'DATA_ENTRY_OPERATOR'].includes(userRole);
  const showProjectCharts   = userRole === 'SUPER_ADMIN';

  return (
    <AuthenticatedLayout>
      <Head title="Dashboard" />

      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
            Executive Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time construction operations, labor productivity, and financial tracking summary.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {allowedWidgets.map((widget, i) => {
            const Icon = widget.icon;
            return (
              <div
                key={i}
                className={`p-4 border rounded-2xl flex flex-col justify-between transition-all hover:scale-[1.02] ${widget.color}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{widget.title}</span>
                  <div className="p-1.5 border border-current/10 rounded-lg">
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                </div>
                <div>
                  <span className="text-xl font-bold tracking-tight text-slate-100">{widget.value}</span>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{widget.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Financial Charts */}
        {showFinancialCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend */}
            <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
              <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="h-[18px] w-[18px] text-cyan-400" />
                Financial &amp; Cash Flow Trend
              </h2>
              <div className="h-80 w-full text-xs">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" tickFormatter={(v) => `$${v / 1000}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                        formatter={(v: any) => formatCurrency(Number(v))}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#06b6d4" strokeWidth={2.5} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2.5} />
                      {userRole === 'SUPER_ADMIN' && (
                        <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600">Loading chart...</div>
                )}
              </div>
            </div>

            {/* Expense Pie */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col">
              <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingDown className="h-[18px] w-[18px] text-rose-400" />
                Expense Breakdown
              </h2>
              <div className="h-64 text-xs">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value" nameKey="category">
                        {expenseBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                        formatter={(v: any, _name: any, entry: any) => [formatCurrency(Number(v)), String(entry?.payload?.category ?? '').replace(/_/g, ' ')]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600">Loading chart...</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 max-h-24 overflow-y-auto pr-1">
                {expenseBreakdown.map((item, index) => (
                  <div key={item.category} className="flex items-center gap-2 text-[10px]">
                    <div className="w-2.5 h-2.5 rounded shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-400 font-medium uppercase truncate">{item.category.replace(/_/g, ' ')}</span>
                    <span className="text-slate-200 font-bold ml-auto">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Project Budget vs Spent */}
        {showProjectCharts && (
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
            <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <FolderKanban className="h-[18px] w-[18px] text-blue-400" />
              Project Budget vs Actual Spent
            </h2>
            <div className="h-72 w-full text-xs">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      tickFormatter={(name: string) => (name.length > 14 ? `${name.slice(0, 12)}...` : name)}
                    />
                    <YAxis stroke="#64748b" tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                      itemStyle={{ color: '#cbd5e1' }}
                      labelStyle={{ color: '#f8fafc' }}
                      formatter={(v: any) => formatCurrency(Number(v))}
                      cursor={{ fill: 'rgba(51,65,85,0.15)' }}
                    />
                    <Legend formatter={(value: string) => <span style={{ color: '#cbd5e1' }}>{value}</span>} />
                    <Bar dataKey="budget" name="Estimated Budget" fill="#1e293b" stroke="#3b82f6" strokeWidth={1} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent"  name="Actual Spent"     fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600">Loading chart...</div>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
