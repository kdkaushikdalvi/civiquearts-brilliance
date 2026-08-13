import { ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  ChevronDown,
  FolderKanban,
  List,
  UserCog,
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
  { to: "/app/projects", label: "Site Allocation", icon: ClipboardList, iconClass: "text-blue-500" },
  // { to: "/app/dashboard", label: "Overview", icon: LayoutDashboard, iconClass: "text-orange-500" },
];

const processExcelNav = [
  { to: "/app/cap-projects-list", label: "Generate Excel", icon: FileDown, iconClass: "text-emerald-500" },
  { to: "/app/upload-csv", label: "Upload CSV", icon: FileSpreadsheet, iconClass: "text-violet-500" },
];

const listNav = [
  { to: "/app/master/project", label: "Project List", icon: FolderKanban, iconClass: "text-cyan-500" },
  { to: "/app/master/employee", label: "Employee List", icon: UserCog, iconClass: "text-fuchsia-500" },
];

const invoiceNav = [
  { to: "/app/download-invoices", label: "Payment Slip", icon: Download, iconClass: "text-amber-500" },
  { to: "/app/client-invoice", label: "Client Invoice", icon: ReceiptText, iconClass: "text-rose-500" },
];

const AppShell = ({ children }: { children: ReactNode }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listOpen, setListOpen] = useState(() =>
    listNav.some((n) => location.pathname === n.to),
  );
  const [invoiceOpen, setInvoiceOpen] = useState(() =>
    invoiceNav.some((n) => location.pathname === n.to),
  );
  const [processExcelOpen, setProcessExcelOpen] = useState(() =>
    processExcelNav.some((n) => location.pathname === n.to),
  );
  const listActive = listNav.some((n) => location.pathname === n.to);
  const invoiceActive = invoiceNav.some((n) => location.pathname === n.to);
  const processExcelActive = processExcelNav.some((n) => location.pathname === n.to);

  useEffect(() => {
    if (listActive) {
      setListOpen(true);
    }
  }, [listActive]);

  useEffect(() => {
    if (invoiceActive) {
      setInvoiceOpen(true);
    }
  }, [invoiceActive]);

  useEffect(() => {
    if (processExcelActive) {
      setProcessExcelOpen(true);
    }
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
        {nav.slice(0, 1).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors border-l-2",
                isActive
                  ? "border-saffron text-saffron bg-saffron/5"
                  : "border-transparent text-foreground/80 hover:bg-secondary",
              )
            }
          >
            <n.icon className={cn("h-4 w-4", n.iconClass)} />
            {n.label}
          </NavLink>
        ))}
        <div>
          <button
            type="button"
            onClick={() => setListOpen((open) => !open)}
            className={cn(
              "flex w-full items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors border-l-2",
              listActive
                ? "border-saffron text-saffron bg-saffron/5"
                : "border-transparent text-foreground/80 hover:bg-secondary",
            )}
            aria-expanded={listOpen}
          >
            <List className="h-4 w-4 text-indigo-500" />
            <span className="flex-1 text-left">List</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                listOpen && "rotate-180",
              )}
            />
          </button>
          {listOpen && (
            <div className="ml-8 border-l border-border py-1">
              {listNav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
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
                  <n.icon className={cn("h-4 w-4", n.iconClass)} />
                  {n.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => setInvoiceOpen((open) => !open)}
            className={cn(
              "flex w-full items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors border-l-2",
              invoiceActive
                ? "border-saffron text-saffron bg-saffron/5"
                : "border-transparent text-foreground/80 hover:bg-secondary",
            )}
            aria-expanded={invoiceOpen}
          >
            <Receipt className="h-4 w-4 text-teal-500" />
            <span className="flex-1 text-left">Invoice</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                invoiceOpen && "rotate-180",
              )}
            />
          </button>
          {invoiceOpen && (
            <div className="ml-8 border-l border-border py-1">
              {invoiceNav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
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
                  <n.icon className={cn("h-4 w-4", n.iconClass)} />
                  {n.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => setProcessExcelOpen((open) => !open)}
            className={cn(
              "flex w-full items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors border-l-2",
              processExcelActive
                ? "border-saffron text-saffron bg-saffron/5"
                : "border-transparent text-foreground/80 hover:bg-secondary",
            )}
            aria-expanded={processExcelOpen}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            <span className="flex-1 text-left">Process Excel</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", processExcelOpen && "rotate-180")} />
          </button>
          {processExcelOpen && (
            <div className="ml-8 border-l border-border py-1">
              {processExcelNav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
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
                  <n.icon className={cn("h-4 w-4", n.iconClass)} />
                  {n.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
        {nav.slice(1).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors border-l-2",
                isActive
                  ? "border-saffron text-saffron bg-saffron/5"
                  : "border-transparent text-foreground/80 hover:bg-secondary",
              )
            }
          >
            <n.icon className={cn("h-4 w-4", n.iconClass)} />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3 text-xs text-muted-foreground truncate">
        Signed in as <span className="font-medium text-foreground">{user}</span>
      </div>
      <button
        type="button"
        onClick={handleRefreshApp}
        disabled={refreshing}
        className="border-t border-border w-full px-5 py-3 text-sm font-medium text-foreground/80 hover:bg-secondary disabled:opacity-60 flex items-center gap-2"
      >
        <RefreshCw className={cn("h-4 w-4 text-sky-500", refreshing && "animate-spin")} />
        {refreshing ? "Refreshing…" : "Refresh App"}
      </button>
      <button
        onClick={handleLogout}
        className="border-t border-border w-full px-5 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2"
      >
        <LogOut className="h-4 w-4 text-red-500" /> Logout
      </button>
    </>
  );

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
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <img src={logo} alt="CiviqueArts" className="h-8 w-auto" />
          <button onClick={handleLogout} aria-label="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </header>
        <main className="flex-1 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
