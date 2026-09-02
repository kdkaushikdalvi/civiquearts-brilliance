import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import AppShell from "@/components/pm/AppShell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Building2, FolderKanban, Receipt, Users, UserRound } from "lucide-react";
import ClientMaster from "./ClientMaster";
import ProjectMaster from "./ProjectMaster";
import SiteList from "./SiteList";
import EmployeeMaster from "./EmployeeMaster";
import BillToMaster from "./BillToMaster";

const TABS = [
  { id: "clients", label: "Client Name", icon: UserRound, iconClass: "text-orange-600" },
  { id: "projects", label: "Project List", icon: FolderKanban, iconClass: "text-blue-600" },
  { id: "sites", label: "Site List", icon: Building2, iconClass: "text-emerald-600" },
  { id: "employees", label: "Employee List", icon: Users, iconClass: "text-violet-600" },
  { id: "billto", label: "Bill To", icon: Receipt, iconClass: "text-teal-600" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const AllLists = () => {
  const location = useLocation();
  const requestedTab = (location.state as { tab?: TabId } | null)?.tab;
  const [tab, setTab] = useState<TabId>(requestedTab ?? "projects");

  useEffect(() => {
    if (requestedTab) setTab(requestedTab);
  }, [requestedTab]);

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="relative bg-slate-50 pb-4 before:absolute before:bottom-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-b before:border-slate-200 before:content-['']">
          <h3 className="text-xl font-semibold text-cyan-800">Master Data</h3>
        </div>

        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
          <div
            role="tablist"
            aria-label="Master data sections"
            className="flex overflow-x-auto border-b border-slate-200 px-2 sm:px-4"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  title={t.label}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative flex min-w-[132px] flex-1 items-center justify-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-semibold transition-colors sm:min-w-0",
                    active
                      ? "text-cyan-800 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-cyan-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-cyan-700" : t.iconClass)} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {tab === "projects" && <ProjectMaster embedded />}
        {tab === "sites" && <SiteList embedded />}
        {tab === "employees" && <EmployeeMaster embedded />}
        {tab === "clients" && <ClientMaster embedded />}
        {tab === "billto" && <BillToMaster embedded />}
      </div>
    </AppShell>
  );
};

export default AllLists;
