import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import AppShell from "@/components/pm/AppShell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Building2, FolderKanban, Users, UserRound } from "lucide-react";
import ClientMaster from "./ClientMaster";
import ProjectMaster from "./ProjectMaster";
import SiteList from "./SiteList";
import EmployeeMaster from "./EmployeeMaster";

const TABS = [
  { id: "projects", label: "Project List", icon: FolderKanban, iconClass: "text-blue-600" },
  { id: "sites", label: "Site List", icon: Building2, iconClass: "text-emerald-600" },
  { id: "employees", label: "Employee List", icon: Users, iconClass: "text-violet-600" },
  { id: "clients", label: "Client List", icon: UserRound, iconClass: "text-orange-600" },
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
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-xl font-semibold text-cyan-800">Master Data</h3>
        </div>

        <Card className="rounded-full border-0 bg-[#2f2f2f] p-1 shadow-none">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  title={t.label}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold transition-all whitespace-nowrap truncate",
                    active
                      ? "bg-white text-[#2f2f2f] shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "" : t.iconClass)} />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {tab === "projects" && <ProjectMaster embedded />}
        {tab === "sites" && <SiteList embedded />}
        {tab === "employees" && <EmployeeMaster embedded />}
        {tab === "clients" && <ClientMaster embedded />}
      </div>
    </AppShell>
  );
};

export default AllLists;
