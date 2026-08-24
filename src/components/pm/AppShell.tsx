import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardList,
  ChevronDown,
  Layers,
  Download,
  LogOut,
  Menu,
  FileSpreadsheet,
  FileDown,
  ReceiptText,
  Receipt,
  RefreshCw,
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
    iconClass: "text-blue-700",
    tip: "Allocate sites to team members",
  },
];

const processExcelNav = [
  { to: "/app/cap-projects-list", label: "Generate Excel", icon: FileDown, iconClass: "text-emerald-700", tip: "Generate the CAP projects Excel file" },
  { to: "/app/upload-csv", label: "Upload CSV", icon: FileSpreadsheet, iconClass: "text-violet-700", tip: "Upload a CSV/Excel and map accounting codes" },
];

const invoiceNav = [
  { to: "/app/download-invoices", label: "Payment Slip", icon: Download, iconClass: "text-amber-700", tip: "Generate and download payment slips" },
  { to: "/app/client-invoice", label: "Client Invoice", icon: ReceiptText, iconClass: "text-rose-700", tip: "Create a client tax invoice" },
];

const allListRoutes = ["/app/master/all", "/app/master/project", "/app/master/employee", "/app/master/site"];

const AppShell = ({ children }: { children: ReactNode }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
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
      localStorage.clear();
      sessionStorage.clear();
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
      "flex w-full items-center gap-3 px-5 py-2.5 text-sm font-semibold transition-colors border-l-2",
      isActive
        ? "border-saffron text-saffron bg-saffron/5"
        : "border-transparent text-foreground/80 hover:bg-secondary",
    );

  const iconBox = (className: string) =>
    cn("h-5 w-5 shrink-0 stroke-[2.5]", className);

  const SidebarInner = (
    <>
      <div className="p-5 border-b border-border flex items-center gap-3">
        <img src={logo} alt="CiviqueArts" className="h-10 w-auto" />
        <div className="leading-tight">
          <div className="font-bold text-sm">CiviqueArts</div>
          <div className="text-xs text-muted-foreground">Billing System</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            title={n.tip}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => topLevel(isActive)}
          >
            <n.icon className={iconBox(n.iconClass)} />
            {n.label}
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
            <Receipt className={iconBox("text-teal-700")} />
            <span className="flex-1 text-left">Invoice</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", invoiceOpen && "rotate-180")} />
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
                  {n.label}
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
            <FileSpreadsheet className={iconBox("text-emerald-700")} />
            <span className="flex-1 text-left">Process Excel</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", processExcelOpen && "rotate-180")} />
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
                  {n.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavLink
          to="/app/master/all"
          title="Manage projects, sites, employees and clients"
          onClick={() => setMobileOpen(false)}
          className={() => topLevel(allListActive)}
        >
          <Layers className={iconBox("text-indigo-700")} />
          Master Data
        </NavLink>
      </nav>
      <div className="border-t border-border p-3 text-xs text-muted-foreground truncate">
        Signed in as <span className="font-medium text-foreground">{user}</span>
      </div>
      <button
        type="button"
        onClick={handleRefreshApp}
        disabled={refreshing}
        title="Clear cached data and reload the app"
        className="border-t border-border w-full px-5 py-3 text-sm font-medium text-foreground/80 hover:bg-secondary disabled:opacity-60 flex items-center gap-2"
      >
        <RefreshCw className={cn("h-5 w-5 text-sky-700 stroke-[2.5]", refreshing && "animate-spin")} />
        {refreshing ? "Refreshing…" : "Refresh App"}
      </button>
      <button
        onClick={handleLogout}
        title="Sign out of your account"
        className="border-t border-border w-full px-5 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2"
      >
        <LogOut className="h-5 w-5 text-red-700 stroke-[2.5]" /> Logout
      </button>
    </>
  );

  const footerTabs = [
    { to: "/app/projects", label: "Allocate", icon: ClipboardList, iconClass: "text-blue-700", tip: "Site Allocation" },
    { to: "/app/master/all", label: "Master Data", icon: Layers, iconClass: "text-indigo-700", tip: "Project, Site, Employee & Client lists", active: allListActive },
    { to: "/app/download-invoices", label: "Slip", icon: Download, iconClass: "text-amber-700", tip: "Payment Slip" },
    { to: "/app/client-invoice", label: "Invoice", icon: ReceiptText, iconClass: "text-rose-700", tip: "Client Invoice" },
    { to: "/app/upload-csv", label: "Mapping", icon: FileSpreadsheet, iconClass: "text-violet-700", tip: "Upload CSV & map codes" },
  ];

  return (
    <div className="min-h-screen flex bg-secondary/20">
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col shrink-0">
        {SidebarInner}
      </aside>

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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" title="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <img src={logo} alt="CiviqueArts" className="h-8 w-auto" />
          <button onClick={handleLogout} aria-label="Logout" title="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </header>
        <main className="flex-1 overflow-x-auto pb-20 lg:pb-0">{children}</main>
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
                  ? "text-saffron bg-saffron/5"
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
