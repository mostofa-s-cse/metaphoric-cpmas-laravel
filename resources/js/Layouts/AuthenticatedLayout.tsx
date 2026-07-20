import React, { useState, useEffect, useRef } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { usePermissions } from '@/hooks/usePermissions';
import {
  LayoutDashboard,
  FolderKanban,
  Truck,
  Briefcase,
  Users2,
  PackageSearch,
  ArrowUpDown,
  FileText,
  TrendingUp,
  LogOut,
  Menu,
  X,
  HardHat,
  Bell,
  ShieldCheck,
  MessageSquare,
  History,
  Globe,
  Settings,
  ExternalLink,
  ChevronDown,
  Landmark,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  routeName: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey: string;
  tabKey?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard',         href: '/dashboard',             routeName: 'dashboard',           icon: LayoutDashboard, moduleKey: 'dashboard' },
  { name: 'Projects',          href: '/dashboard/projects',    routeName: 'dashboard.projects',  icon: FolderKanban,    moduleKey: 'projects' },
  { name: 'Suppliers',         href: '/dashboard/suppliers',   routeName: 'dashboard.suppliers', icon: Truck,           moduleKey: 'suppliers' },
  { name: 'Vendor',            href: '/dashboard/vendor',      routeName: 'dashboard.vendors',   icon: Briefcase,       moduleKey: 'vendor' },
  { name: 'Office Management', href: '/dashboard/employees',   routeName: 'dashboard.employees', icon: Users2,          moduleKey: 'employees' },
  { name: 'Labour Management', href: '/dashboard/labour',      routeName: 'dashboard.labour',    icon: HardHat,         moduleKey: 'labour' },
  { name: 'Materials',         href: '/dashboard/materials',   routeName: 'dashboard.materials', icon: PackageSearch,   moduleKey: 'materials' },
  { name: 'Transactions',      href: '/dashboard/transactions',routeName: 'dashboard.transactions', icon: ArrowUpDown,  moduleKey: 'transactions' },
  { name: 'Bank Accounts',     href: '/dashboard/bank-accounts',routeName: 'dashboard.bank-accounts', icon: Landmark,   moduleKey: 'bank-accounts' },
  { name: 'Documents',         href: '/dashboard/documents',   routeName: 'dashboard.documents', icon: FileText,       moduleKey: 'documents' },
  {
    name: 'Reports', href: '/dashboard/reports', routeName: 'dashboard.reports', icon: TrendingUp, moduleKey: 'reports',
    children: [
      { name: 'Financial Statement', href: '/dashboard/reports',           routeName: 'dashboard.reports',           icon: TrendingUp, moduleKey: 'reports', tabKey: 'financial' },
      { name: 'Project Report',      href: '/dashboard/reports/projects',  routeName: 'dashboard.reports.projects',  icon: TrendingUp, moduleKey: 'reports', tabKey: 'projects' },
      { name: 'Vendor Report',       href: '/dashboard/reports/vendors',   routeName: 'dashboard.reports.vendors',   icon: TrendingUp, moduleKey: 'reports', tabKey: 'vendors' },
      { name: 'Supplier Report',     href: '/dashboard/reports/suppliers', routeName: 'dashboard.reports.suppliers', icon: TrendingUp, moduleKey: 'reports', tabKey: 'suppliers' },
      { name: 'Material Report',     href: '/dashboard/reports/materials', routeName: 'dashboard.reports.materials', icon: TrendingUp, moduleKey: 'reports', tabKey: 'materials' },
      { name: 'Employee Report',     href: '/dashboard/reports/employees', routeName: 'dashboard.reports.employees', icon: TrendingUp, moduleKey: 'reports', tabKey: 'employees' },
    ],
  },
  { name: 'Website Management',href: '/dashboard/website',     routeName: 'dashboard.website',   icon: Globe,           moduleKey: 'website' },
  { name: 'User Management',   href: '/dashboard/users',       routeName: 'dashboard.users',     icon: ShieldCheck,     moduleKey: 'users' },
  { name: 'Audit Logs',        href: '/dashboard/audit-logs',  routeName: 'dashboard.audit-logs',icon: History,         moduleKey: 'audit-logs' },
  { name: 'Contacts',          href: '/dashboard/contacts',    routeName: 'dashboard.contacts',  icon: MessageSquare,   moduleKey: 'contacts' },
  { name: 'Settings',          href: '/dashboard/settings',    routeName: 'dashboard.settings',  icon: Settings,        moduleKey: 'settings' },
];

interface Props {
  children: React.ReactNode;
  header?: React.ReactNode;
}

export default function AuthenticatedLayout({ children, header }: Props) {
  const { auth, websiteSettings } = usePage().props as any;
  const user = auth?.user;
  const brand = websiteSettings || {};

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications] = useState([
    { id: '1', text: 'Supplier payment due in 3 days', date: 'Just now' },
    { id: '2', text: 'Low Inventory: Portland Cement below 50 bags', date: '10 mins ago' },
    { id: '3', text: 'Salary payment due for an employee', date: '1 hour ago' },
    { id: '4', text: 'A project is approaching expected deadline', date: 'Yesterday' },
  ]);
  const [alertCount, setAlertCount] = useState(notifications.length);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const currentPath = window.location.pathname;

  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    navItems.forEach((item) => {
      if (item.children?.some((child) => currentPath === child.href)) {
        initial.add(item.name);
      }
    });
    return initial;
  });

  function toggleMenu(name: string) {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const userRole: string = user?.role || 'DATA_ENTRY_OPERATOR';
  const { canModule, canTab } = usePermissions();
  const allowedNavItems = navItems.filter((item) => canModule(item.moduleKey));

  // Roles & Permissions admin — deliberately gated by the legacy
  // role:SUPER_ADMIN check only, not the dynamic module system (see
  // routes/web.php's dashboard.roles route note).
  if (userRole === 'SUPER_ADMIN') {
    allowedNavItems.push({
      name: 'Roles & Permissions', href: '/dashboard/roles', routeName: 'dashboard.roles', icon: ShieldCheck, moduleKey: '__roles',
    });
  }

  function isActive(item: NavItem) {
    if (item.href === '/dashboard') return currentPath === '/dashboard';
    if (item.children) return currentPath === item.href || item.children.some((c) => currentPath === c.href);
    return currentPath === item.href || currentPath.startsWith(item.href + '/');
  }

  function handleLogout() {
    router.post('/logout');
  }

  const pageTitle = currentPath === '/dashboard'
    ? 'Overview'
    : currentPath.split('/').pop()?.replace(/-/g, ' ') ?? 'Dashboard';

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {allowedNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          if (item.children && item.children.length > 0) {
            const expanded = expandedMenus.has(item.name);
            const allowedChildren = item.children.filter((c) => canTab(c.moduleKey, c.tabKey!));
            return (
              <div key={item.name}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.name)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 group cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500/15 to-blue-600/10 text-cyan-400 border-l-[3px] border-cyan-400 shadow-[inset_0px_0px_20px_rgba(34,211,238,0.05)] pl-3.5'
                      : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 pl-4 hover:translate-x-1'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] transition-colors shrink-0 ${active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && (
                  <div className="mt-1 ml-4 pl-4 border-l border-slate-800/60 space-y-1">
                    {allowedChildren.map((child) => {
                      const childActive = currentPath === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onLinkClick}
                          className={`block px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                            childActive
                              ? 'text-cyan-400 bg-cyan-500/5'
                              : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/30'
                          }`}
                        >
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 group ${
                active
                  ? 'bg-gradient-to-r from-cyan-500/15 to-blue-600/10 text-cyan-400 border-l-[3px] border-cyan-400 shadow-[inset_0px_0px_20px_rgba(34,211,238,0.05)] pl-3.5'
                  : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 pl-4 hover:translate-x-1'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] transition-colors shrink-0 ${active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="p-4 bg-gradient-to-t from-slate-950/80 to-transparent pt-6 border-t border-slate-800/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase overflow-hidden shrink-0">
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user.fullName} className="h-full w-full object-cover" />
            ) : (
              (user?.fullName || 'U').slice(0, 2)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.fullName}</p>
            <p className="text-[9px] font-semibold text-cyan-400 uppercase tracking-wider">
              {userRole.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-rose-950/20 hover:text-rose-400 hover:border-rose-800/30 text-slate-400 border border-slate-700/80 text-xs font-bold rounded-lg transition-all cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="h-screen w-full flex bg-slate-950 text-slate-100 font-sans overflow-hidden">

      {/* ─── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-800/60 bg-slate-950/80 backdrop-blur-2xl shrink-0 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
        <div className="absolute top-0 -left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

        {/* Logo / brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/60 shrink-0">
          <div className="h-9 w-9 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)] overflow-hidden p-1 shrink-0">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <HardHat className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wide block truncate">
              {brand.nameAlt || brand.name || 'Metaphoric Architect'}
            </span>
            <p className="text-[10px] text-slate-500 font-medium -mt-0.5">Management Portal</p>
          </div>
        </div>

        <SidebarContent />
      </aside>

      {/* ─── Mobile Sidebar Drawer ────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/80 backdrop-blur-sm">
          <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-center text-cyan-400 overflow-hidden p-1 shrink-0">
                  {brand.logoUrl ? (
                    <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <HardHat className="h-4 w-4" />
                  )}
                </div>
                <span className="font-bold text-sm text-cyan-400 truncate">
                  {brand.name || 'Metaphoric'}
                </span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-100 cursor-pointer shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent onLinkClick={() => setSidebarOpen(false)} />
          </div>
          <div className="flex-1" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* ─── Main Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Top Header */}
        <header className="h-16 shrink-0 flex items-center justify-between px-4 lg:px-8 border-b border-slate-800/50 bg-slate-950/60 backdrop-blur-2xl z-30 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-cyan-400 border border-slate-800 rounded-xl hover:bg-cyan-500/10 transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm lg:text-base font-bold text-slate-200 uppercase tracking-wider capitalize">
              {pageTitle}
            </h2>
            {currentPath.startsWith('/dashboard/website') && (
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-all"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visit Website
              </a>
            )}
          </div>

          {/* Notifications */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => { setNotificationsOpen(!notificationsOpen); setAlertCount(0); }}
                className="relative p-2.5 text-slate-400 hover:text-cyan-400 border border-slate-800/60 rounded-xl hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                {alertCount > 0 && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-amber-500 border-2 border-slate-900 rounded-full animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 z-50">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-300">Live Due &amp; Stock Alerts</span>
                    <button onClick={() => setNotificationsOpen(false)} className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer">
                      Dismiss
                    </button>
                  </div>
                  <div className="space-y-2.5 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="text-xs p-2 bg-slate-950/60 border border-slate-800/60 rounded-lg">
                        <p className="text-slate-300 font-medium leading-relaxed">{n.text}</p>
                        <span className="text-[9px] text-slate-500 mt-1 block">{n.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 bg-slate-950 overflow-y-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
