import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  Download,
  Upload,
  LogOut,
  Menu,
  FileSpreadsheet,
  Table,
  Receipt,
  CreditCard,
  RefreshCw,
  FolderKanban,
  Building2,
  Users,
  UserRound,
  Landmark,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

const nav = [
  {
    to: "/app/projects",
    label: "Site Allocation",
    icon: ClipboardList,
    iconClass: "text-blue-600",
    tip: "Allocate sites to team members",
  },
];

const processExcelNav = [
  { to: "/app/cap-projects-list", label: "Generate Excel", icon: FileSpreadsheet, iconClass: "text-teal-600", tip: "Generate the CAP projects Excel file" },
  { to: "/app/upload-csv", label: "Upload CSV", icon: Upload, iconClass: "text-red-600", tip: "Upload a CSV/Excel and map accounting codes" },
];

const invoiceNav = [
  { to: "/app/download-invoices", label: "Payment Slip", icon: CreditCard, iconClass: "text-amber-600", tip: "Generate and download payment slips" },
  { to: "/app/client-invoice", label: "Client Invoice", icon: Download, iconClass: "text-emerald-600", tip: "Create a client tax invoice" },
];

const allListRoutes = ["/app/master/all", "/app/master/project", "/app/master/employee", "/app/master/site"];
const masterDataNav = [
  { tab: "clients", label: "Client Name", icon: UserRound, iconClass: "text-orange-600" },
  { tab: "projects", label: "Projects", icon: FolderKanban, iconClass: "text-cyan-600" },
  { tab: "sites", label: "Sites", icon: Building2, iconClass: "text-lime-600" },
  { tab: "employees", label: "Employees", icon: Users, iconClass: "text-fuchsia-600" },
  { tab: "billto", label: "Bill To", icon: Landmark, iconClass: "text-teal-600" },
] as const;

const AppShell = ({ children }: { children: ReactNode }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(() =>
    invoiceNav.some((n) => location.pathname === n.to),
  );
  const [processExcelOpen, setProcessExcelOpen] = useState(() =>
    processExcelNav.some((n) => location.pathname === n.to),
  );
  const invoiceActive = invoiceNav.some((n) => location.pathname === n.to);
  const processExcelActive = processExcelNav.some((n) => location.pathname === n.to);
  const allListActive = allListRoutes.includes(location.pathname);
  const [masterDataOpen, setMasterDataOpen] = useState(false);

  useEffect(() => {
    if (invoiceActive) setInvoiceOpen(true);
  }, [invoiceActive]);

  useEffect(() => {
    if (processExcelActive) setProcessExcelOpen(true);
  }, [processExcelActive]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    navigate("/login");
  };

  const handleRefreshApp = async () => {
    setRefreshing(true);
    setMobileOpen(false);
    try {
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } finally {
      window.location.reload();
    }
  };

  const topLevel = (isActive: boolean) =>
    cn(
      "flex w-full items-center gap-3 py-2.5 text-sm font-semibold transition-all border-l-2",
      sidebarCollapsed ? "justify-center px-2" : "px-5",
      isActive
        ? "border-saffron text-saffron bg-saffron/5"
        : "border-transparent text-foreground/80 hover:bg-secondary",
    );

  const iconBox = (className: string) =>
    cn("h-5 w-5 shrink-0 stroke-[2.5]", className);

  const SidebarInner = (
    <>
      <div
        className={cn("border-b border-border flex items-center gap-3", sidebarCollapsed ? "p-3 justify-center" : "p-5")}
      >
        <img
          src={logo}
          alt="CiviqueArts"
          className={cn("object-contain", sidebarCollapsed ? "h-10 w-10" : "h-10 w-auto")}
        />
        {!sidebarCollapsed && (
          <div className="leading-tight overflow-hidden whitespace-nowrap">
            <div className="font-extrabold text-[15px] tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              CiviqueArts
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              Billing System
            </div>
          </div>
        )}
      </div>
      <nav className="flex-1 py-3">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            title={n.tip}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => topLevel(isActive)}
          >
            <n.icon className={iconBox(n.iconClass)} />
            <span className={cn("transition-all duration-200", sidebarCollapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100")}>{n.label}</span>
          </NavLink>
        ))}

        <div>
          <button
            type="button"
            title="Invoice documents"
            onClick={() => setInvoiceOpen((open) => !open)}
            className={topLevel(invoiceActive)}
            aria-expanded={invoiceOpen}
          >
            <Receipt className={iconBox("text-purple-700")} />
            <span className={cn("flex-1 text-left transition-all", sidebarCollapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100")}>Invoice</span>
            {!sidebarCollapsed && <ChevronDown className={cn("h-4 w-4 transition-transform", invoiceOpen && "rotate-180")} />}
          </button>
          {invoiceOpen && (
            <div className="ml-8 border-l border-border py-1">
              {invoiceNav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  title={n.tip}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "text-saffron bg-saffron/5"
                        : "text-foreground/70 hover:bg-secondary hover:text-foreground",
                    )
                  }
                >
                  <n.icon className={iconBox(n.iconClass)} />
                  {!sidebarCollapsed && n.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            title="Excel tools"
            onClick={() => setProcessExcelOpen((open) => !open)}
            className={topLevel(processExcelActive)}
            aria-expanded={processExcelOpen}
          >
            <Table className={iconBox("text-teal-700")} />
            <span className={cn("flex-1 text-left transition-all", sidebarCollapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100")}>Process Excel</span>
            {!sidebarCollapsed && <ChevronDown className={cn("h-4 w-4 transition-transform", processExcelOpen && "rotate-180")} />}
          </button>
          {processExcelOpen && (
            <div className="ml-8 border-l border-border py-1">
              {processExcelNav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  title={n.tip}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "text-saffron bg-saffron/5"
                        : "text-foreground/70 hover:bg-secondary hover:text-foreground",
                    )
                  }
                >
                  <n.icon className={iconBox(n.iconClass)} />
                  {!sidebarCollapsed && n.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            title="Manage projects, sites, employees and clients"
            onClick={() => setMasterDataOpen((open) => !open)}
            className={topLevel(allListActive)}
            aria-expanded={masterDataOpen}
          >
            <Layers className={iconBox("text-indigo-700")} />
            <span className={cn("flex-1 text-left transition-all", sidebarCollapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100")}>Master Data</span>
            {!sidebarCollapsed && <ChevronDown className={cn("h-4 w-4 transition-transform", masterDataOpen && "rotate-180")} />}
          </button>
          {masterDataOpen && (
            <div className="ml-8 border-l border-border py-1">
              {masterDataNav.map((item) => (
                <NavLink
                  key={item.tab}
                  to="/app/master/all"
                  state={{ tab: item.tab }}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors",
                    isActive && (location.state as any)?.tab === item.tab
                      ? "text-saffron bg-saffron/5"
                      : "text-foreground/70 hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <item.icon className={iconBox(item.iconClass)} />
                  {!sidebarCollapsed && item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
      <div className={cn("border-t border-border p-3 text-xs text-muted-foreground truncate", sidebarCollapsed && "text-center")} title={sidebarCollapsed ? `Signed in as ${user}` : undefined}>
        {!sidebarCollapsed && <>Signed in as <span className="font-medium text-foreground">{user}</span></>}
      </div>
      <NavLink
        to="/app/dashboard"
        title="Dashboard"
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) =>
          cn(
            "border-t border-border w-full py-3 text-sm font-semibold transition-colors flex items-center gap-2",
            sidebarCollapsed ? "justify-center px-2" : "px-5",
            isActive
              ? "bg-blue-50 text-blue-700 border-l-2 border-l-blue-600"
              : "text-blue-600 hover:text-blue-700 hover:bg-blue-50/70",
          )
        }
      >
        <LayoutDashboard className="h-5 w-5 shrink-0 stroke-[2.5] text-blue-600" />
        {!sidebarCollapsed && <span>Dashboard</span>}
      </NavLink>
      <button
        type="button"
        onClick={handleRefreshApp}
        disabled={refreshing}
        title="Clear cached data and reload the app"
        className={cn("border-t border-border w-full py-3 text-sm font-medium text-foreground/80 hover:bg-secondary disabled:opacity-60 flex items-center gap-2", sidebarCollapsed ? "justify-center px-2" : "px-5")}
      >
        <RefreshCw className={cn("h-5 w-5 text-sky-700 stroke-[2.5]", refreshing && "animate-spin")} />
        {!sidebarCollapsed && (refreshing ? "Refreshing…" : "Refresh App")}
      </button>
      <button
        onClick={handleLogout}
        title="Sign out of your account"
        className={cn("border-t border-border w-full py-3 text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2", sidebarCollapsed ? "justify-center px-2" : "px-5")}
      >
        <LogOut className="h-5 w-5 text-red-700 stroke-[2.5]" /> {!sidebarCollapsed && "Logout"}
      </button>
    </>
  );

  const footerTabs = [
    { to: "/app/projects", label: "Allocate", icon: ClipboardList, iconClass: "text-blue-600", tip: "Site Allocation" },
    { to: "/app/master/all", label: "Master Data", icon: Layers, iconClass: "text-indigo-700", tip: "Project, Site, Employee & Client lists", active: allListActive },
    { to: "/app/download-invoices", label: "Slip", icon: CreditCard, iconClass: "text-amber-600", tip: "Payment Slip" },
    { to: "/app/client-invoice", label: "Invoice", icon: Download, iconClass: "text-emerald-600", tip: "Client Invoice" },
    { to: "/app/upload-csv", label: "Upload", icon: Upload, iconClass: "text-red-600", tip: "Upload CSV & map codes" },
  ];

  return (
    <div className="h-screen overflow-hidden flex bg-secondary/20">
      <motion.aside animate={{ width: sidebarCollapsed ? 72 : 256 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="relative hidden lg:flex h-screen bg-card border-r border-border flex-col shrink-0 overflow-visible">
        {SidebarInner}
        <button
          type="button"
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          className="absolute right-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-800 shadow-md transition-all hover:border-slate-500 hover:bg-slate-100"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
        </button>
      </motion.aside>

      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-64 bg-card border-r border-border flex flex-col">
            {SidebarInner}
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" title="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <img src={logo} alt="CiviqueArts" className="h-8 w-auto" />
          <button onClick={handleLogout} aria-label="Logout" title="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </header>
        <main className="flex-1 min-h-0 overflow-auto pb-20 lg:pb-0">{children}</main>
      </div>

      {/* Mobile footer navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border flex">
        {footerTabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            title={t.tip}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors",
                (t.active ?? isActive)
                  ? t.label === "Mapping"
                    ? "text-blue-700 bg-blue-50"
                    : "text-saffron bg-saffron/5"
                  : "text-foreground/70",
              )
            }
          >
            <t.icon className={cn("h-5 w-5 stroke-[2.5]", t.iconClass)} />
            <span className="truncate max-w-full px-1">{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppShell;
