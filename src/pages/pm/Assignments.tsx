import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppShell from "@/components/pm/AppShell";
import MonthNavigator, { MONTH_NAMES } from "@/components/pm/MonthNavigator";
import SearchableSelect from "@/components/pm/SearchableSelect";
import CompletionModal from "@/components/pm/CompletionModal";
import { useData } from "@/contexts/DataContext";
import { Assignment } from "@/types/pm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatNumber } from "@/lib/pmFormat";

interface SiteRow {
  id: string;
  siteName: string;
  assigneeId: string;
}

const DRAFT_KEY = "pm_assignment_draft";

const Assignments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    clients,
    projects,
    employees,
    assignments,
    addAssignments,
    updateAssignment,
    deleteAssignment,
    addProject,
    addClient,
    addSite,
    addEmployee,
  } = useData();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [sites, setSites] = useState<SiteRow[]>([{ id: crypto.randomUUID(), siteName: "", assigneeId: "" }]);
  const [errors, setErrors] = useState<{ client?: string; project?: string; sites?: Record<string, string> }>({});

  // Restore draft when returning from master pages
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.clientId) setClientId(d.clientId);
        if (d.projectId) setProjectId(d.projectId);
        if (d.sites?.length) setSites(d.sites);
        if (typeof d.month === "number") setMonth(d.month);
        if (typeof d.year === "number") setYear(d.year);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select newly created project/employee via location.state
  useEffect(() => {
    const st = location.state as any;
    if (st?.newProjectId) {
      setProjectId(st.newProjectId);
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (st?.newEmployeeId && st.forSiteId) {
      setSites((prev) =>
        prev.map((s) => (s.id === st.forSiteId ? { ...s, assigneeId: st.newEmployeeId } : s))
      );
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const persistDraft = (
    patch: Partial<{ clientId: string; projectId: string; sites: SiteRow[]; month: number; year: number }>
  ) => {
    const current = { clientId, projectId, sites, month, year, ...patch };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(current));
  };
  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

  const filtered = useMemo(
    () => assignments.filter((a) => a.month === month && a.year === year),
    [assignments, month, year]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);

  const openComplete = (a: Assignment) => {
    setEditing(a);
    setModalOpen(true);
  };

  const handleStatusChange = (a: Assignment, next: Assignment["status"]) => {
    if (next === "Completed") openComplete(a);
    else updateAssignment(a.id, { status: "In Progress" });
  };

  const handleSaveModal = (data: { unitType: Assignment["unitType"]; quantity: number; rate: number; amount: number }) => {
    if (editing) {
      updateAssignment(editing.id, {
        status: "Completed",
        unitType: data.unitType,
        quantity: data.quantity,
        rate: data.rate,
        amount: data.amount,
      });
      toast.success("Project completed");
      setModalOpen(false);
      setEditing(null);
    }
  };

  const addSite = () => {
    setSites((prev) => {
      const next = [
        ...prev,
        { id: crypto.randomUUID(), siteName: prev[0]?.siteName ?? "", assigneeId: "" },
      ];
      persistDraft({ sites: next });
      return next;
    });
  };
  const removeSite = (id: string) => {
    setSites((prev) => {
      const next = prev.length === 1 ? prev : prev.filter((s) => s.id !== id);
      persistDraft({ sites: next });
      return next;
    });
  };
  const updateSite = (id: string, patch: Partial<SiteRow>) => {
    setSites((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
      persistDraft({ sites: next });
      return next;
    });
  };

  const validate = () => {
    const errs: typeof errors = { sites: {} };
    if (!clientId) errs.client = "Client is required";
    if (!projectId) errs.project = "Project is required";
    sites.forEach((s) => {
      if (!s.siteName.trim()) errs.sites![`${s.id}-name`] = "Required";
      if (!s.assigneeId) errs.sites![`${s.id}-assignee`] = "Required";
    });
    setErrors(errs);
    return !errs.client && !errs.project && Object.keys(errs.sites!).length === 0;
  };

  const saveAssignments = async () => {
    if (!validate()) return;
    const project = projects.find((p) => p.id === projectId)!;
    const client = clients.find((c) => c.id === clientId)!;
    const records = await Promise.all(sites.map(async (s) => {
      const emp = employees.find((e) => e.id === s.assigneeId)!;
      const site = await addSite(project.id, s.siteName.trim());
      return {
        clientId: client.id,
        clientName: client.name,
        siteId: site?.id,
        projectId: project.id,
        projectName: project.name,
        siteName: s.siteName.trim(),
        assigneeId: emp.id,
        assigneeName: emp.name,
        month,
        year,
        status: "In Progress" as const,
      };
    }));
    await addAssignments(records);
    toast.success(`${records.length} project${records.length > 1 ? "s" : ""} saved`);
    setClientId("");
    setProjectId("");
    setSites([{ id: crypto.randomUUID(), siteName: "", assigneeId: "" }]);
    clearDraft();
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Site Allocation</h1>
            <p className="text-muted-foreground">Assign sites to team members and track progress</p>
          </div>
          <MonthNavigator
            month={month}
            year={year}
            onChange={(m, y) => {
              setMonth(m);
              setYear(y);
              persistDraft({ month: m, year: y });
            }}
          />
        </div>

        {/* Create Section */}
        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Client Name *</label>
              <SearchableSelect
                value={clientId}
                onChange={(id) => {
                  setClientId(id);
                  setProjectId("");
                  persistDraft({ clientId: id, projectId: "" });
                }}
                options={clients.map((c) => ({ id: c.id, label: c.name }))}
                placeholder="Select Client"
                emptyActionLabel="Add Client"
                onEmptyAction={async (query) => {
                  if (!query) {
                    toast.error("Client name required");
                    return;
                  }
                  const c = await addClient(query);
                  if (!c) return;
                  setClientId(c.id);
                  persistDraft({ clientId: c.id });
                  toast.success("Client added");
                }}
              />
              {errors.client && <p className="text-xs text-destructive mt-1">{errors.client}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Project *</label>
              <SearchableSelect
                value={projectId}
                onChange={(id) => {
                  setProjectId(id);
                  persistDraft({ projectId: id });
                }}
                options={projects
                  .filter((p) => !clientId || p.clientId === clientId)
                  .map((p) => ({ id: p.id, label: p.name }))}
                placeholder="Select Project"
                emptyActionLabel="Add Project"
                onEmptyAction={async (query) => {
                  if (!query) {
                    toast.error("Project name required");
                    return;
                  }
                  if (!clientId) {
                    toast.error("Select a client first");
                    return;
                  }
                  const client = clients.find((c) => c.id === clientId);
                  const p = await addProject(query, clientId, client?.name);
                  if (!p) return;
                  setProjectId(p.id);
                  persistDraft({ projectId: p.id });
                  toast.success("Project added");
                }}
              />
              {errors.project && <p className="text-xs text-destructive mt-1">{errors.project}</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Sites</label>
              <Button variant="outline" size="sm" onClick={addSite}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Site
              </Button>
            </div>

            <div className="space-y-2">
              {sites.map((s) => (
                <div key={s.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-start">
                  <div>
                    <Input
                      placeholder="Site Name *"
                      value={s.siteName}
                      onChange={(e) => updateSite(s.id, { siteName: e.target.value })}
                    />
                    {errors.sites?.[`${s.id}-name`] && (
                      <p className="text-xs text-destructive mt-1">{errors.sites?.[`${s.id}-name`]}</p>
                    )}
                  </div>
                  <div>
                    <SearchableSelect
                      value={s.assigneeId}
                      onChange={(id) => updateSite(s.id, { assigneeId: id })}
                      options={employees.map((e) => ({ id: e.id, label: e.name }))}
                      placeholder="Select Assignee *"
                      emptyActionLabel="Add Assignee"
                      onEmptyAction={async (query) => {
                        if (!query) {
                          toast.error("Assignee name required");
                          return;
                        }
                        const e = await addEmployee({ name: query });
                        if (!e) return;
                        updateSite(s.id, { assigneeId: e.id });
                        toast.success("Assignee added");
                      }}
                    />
                    {errors.sites?.[`${s.id}-assignee`] && (
                      <p className="text-xs text-destructive mt-1">{errors.sites?.[`${s.id}-assignee`]}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSite(s.id)} aria-label="Remove site">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveAssignments} className="gradient-saffron text-saffron-foreground">
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-semibold">{MONTH_NAMES[month]} {year} — Site Allocation ({filtered.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Project</th>
                  <th className="px-4 py-3 font-semibold">Site</th>
                  <th className="px-4 py-3 font-semibold">Assigned To</th>
                  <th className="px-4 py-3 font-semibold">Unit / Qty</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No projects for this month.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-4 py-3">{a.clientName || "-"}</td>
                      <td className="px-4 py-3">{a.projectName}</td>
                      <td className="px-4 py-3">{a.siteName}</td>
                      <td className="px-4 py-3">{a.assigneeName}</td>
                      <td className="px-4 py-3">
                        {a.quantity != null ? `${a.unitType} · ${formatNumber(a.quantity)}` : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {a.amount != null ? formatINR(a.amount) : "₹0.00"}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={a.status}
                          onChange={(e) => handleStatusChange(a, e.target.value as Assignment["status"])}
                          className={`text-xs font-medium rounded-full px-3 py-1 border ${
                            a.status === "Completed"
                              ? "bg-green-accent/10 text-green-accent border-green-accent/30"
                              : "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                          }`}
                        >
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {a.status === "Completed" && (
                          <Button variant="ghost" size="icon" onClick={() => openComplete(a)} aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            deleteAssignment(a.id);
                            toast.success("Deleted");
                          }}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <CompletionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        assignment={editing}
        onSave={handleSaveModal}
      />
    </AppShell>
  );
};

export default Assignments;
