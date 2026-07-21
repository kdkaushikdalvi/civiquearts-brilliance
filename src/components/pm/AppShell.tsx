import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  FolderKanban,
  UserCog,
  Download,
  LogOut,
  Menu,
  FileSpreadsheet,
  FileDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app/projects", label: "Site Allocation", icon: ClipboardList },
  { to: "/app/master/project", label: "Project List", icon: FolderKanban },
  { to: "/app/master/employee", label: "Employee List", icon: UserCog },
  { to: "/app/download-invoices", label: "Payment Slips", icon: Download },
  { to: "/app/cap-projects-list", label: "Generate Excel", icon: FileDown },
  { to: "/app/upload-csv", label: "Upload CSV", icon: FileSpreadsheet },
  { to: "/app/dashboard", label: "Overview", icon: LayoutDashboard },
];

const AppShell = ({ children }: { children: ReactNode }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    navigate("/login");
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
        {nav.map((n) => (
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
            <n.icon className="h-4 w-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3 text-xs text-muted-foreground truncate">
        Signed in as <span className="font-medium text-foreground">{user}</span>
      </div>
      <button
        onClick={handleLogout}
        className="border-t border-border w-full px-5 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2"
      >
        <LogOut className="h-4 w-4" /> Logout
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
