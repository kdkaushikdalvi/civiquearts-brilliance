import { useState } from "react";
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
  const [tab, setTab] = useState<TabId>("projects");

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All List</h1>
          <p className="text-sm text-muted-foreground">
            Manage projects, sites and team members in one place.
          </p>
        </div>

        <Card className="p-1.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                    "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all whitespace-nowrap truncate",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "" : t.iconClass)} />
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
