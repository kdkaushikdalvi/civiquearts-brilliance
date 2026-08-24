import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppShell from "@/components/pm/AppShell";
import MonthNavigator, { MONTH_NAMES } from "@/components/pm/MonthNavigator";
import SearchableSelect from "@/components/pm/SearchableSelect";
import MultiSearchableSelect from "@/components/pm/MultiSearchableSelect";
import CompletionModal from "@/components/pm/CompletionModal";
import { useData } from "@/contexts/DataContext";
import { Assignment } from "@/types/pm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Save, ChevronDown, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatNumber } from "@/lib/pmFormat";

interface SiteRow {
  id: string;
  siteName: string;
  assigneeIds: string[];
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
    addSite: upsertSite,
    addEmployee,
  } = useData();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [allocationFormOpen, setAllocationFormOpen] = useState(false);
  const [statusSortAsc, setStatusSortAsc] = useState(true);

  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [sites, setSites] = useState<SiteRow[]>([{ id: crypto.randomUUID(), siteName: "", assigneeIds: [] }]);
  const [errors, setErrors] = useState<{ client?: string; project?: string; sites?: Record<string, string> }>({});

  // Restore draft when returning from master pages
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.clientId) setClientId(d.clientId);
        if (d.projectId) setProjectId(d.projectId);
        if (d.sites?.length) setSites(d.sites.map((site: SiteRow & { assigneeId?: string }) => ({
          ...site,
          assigneeIds: site.assigneeIds ?? (site.assigneeId ? [site.assigneeId] : []),
        })));
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
        prev.map((s) => (s.id === st.forSiteId ? { ...s, assigneeIds: [...(s.assigneeIds ?? []), st.newEmployeeId] } : s))
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
    () => assignments
      .filter((a) => a.month === month && a.year === year)
      .sort((a, b) => statusSortAsc ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status)),
    [assignments, month, year, statusSortAsc]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);

  const openComplete = (a: Assignment) => {
    setEditing(a);
    setModalOpen(true);
  };

  const handleStatusChange = (a: Assignment, next: Assignment["status"]) => {
    if (next === "Completed") openComplete(a);
    else updateAssignment(a.id, { status: next });
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
        { id: crypto.randomUUID(), siteName: "", assigneeIds: [] },
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
      if (!(s.assigneeIds ?? []).length) errs.sites![`${s.id}-assignee`] = "Required";
    });
    setErrors(errs);
    return !errs.client && !errs.project && Object.keys(errs.sites!).length === 0;
  };

  const saveAssignments = async () => {
    if (!validate()) return;
    const project = projects.find((p) => p.id === projectId)!;
    const client = clients.find((c) => c.id === clientId)!;
    const records = (await Promise.all(sites.flatMap((s) => (s.assigneeIds ?? []).map(async (assigneeId) => {
      const emp = employees.find((e) => e.id === assigneeId)!;
      const site = await upsertSite(project.id, s.siteName.trim());
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
    })))).flat();
    await addAssignments(records);
    toast.success(`${records.length} project${records.length > 1 ? "s" : ""} saved`);
    const emptySites = [{ id: crypto.randomUUID(), siteName: "", assigneeIds: [] }];
    setSites(emptySites);
    persistDraft({ sites: emptySites });
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-xl font-semibold text-blue-800">Site Allocation</h3>
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
        <Card className="overflow-visible">
          <button
            type="button"
            onClick={() => setAllocationFormOpen((open) => !open)}
            className="flex w-full items-center justify-between bg-gradient-to-r from-[#24105c] via-[#5c24ff] to-[#e91e9b] px-5 py-4 text-left text-white shadow-sm transition-colors hover:brightness-110"
            aria-expanded={allocationFormOpen}
          >
            <span className="flex items-center gap-2 font-semibold">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#5c24ff] text-white shadow-sm">
                <span className={`absolute inset-0 rounded-full bg-[#8a68ff] opacity-60 ${!allocationFormOpen ? "animate-ping" : ""}`} />
                <Plus className="relative h-4 w-4" />
              </span>
              Create Site Allocation
            </span>
            <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${allocationFormOpen ? "rotate-180" : "animate-bounce"}`} />
          </button>
          {allocationFormOpen && <div className="space-y-5 border-t border-border bg-blue-50/50 p-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-700">Assignment details</p>
            <div className="space-y-4">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-4">
              <label className="w-32 shrink-0 pt-2 text-sm font-semibold text-blue-800">Client Name *</label>
              <div className="min-w-0 flex-1">
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
            </div>

            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-4">
              <label className="w-32 shrink-0 pt-2 text-sm font-semibold text-violet-800">Project *</label>
              <div className="min-w-0 flex-1">
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
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div><label className="text-sm font-semibold text-emerald-700">Sites</label></div>
              <Button
                type="button"
                size="icon"
                onClick={addSite}
                title="Add another site row to this allocation"
                aria-label="Add another site row"
                className="h-8 w-8 rounded-full bg-green-600 text-white hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-2 hidden grid-cols-[1fr_1fr_auto] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
              <span className="text-cyan-800">Site Name</span>
              <span className="text-pink-800">Select Assignee</span>
              <span className="w-10" />
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
                    <MultiSearchableSelect
                      value={s.assigneeIds ?? []}
                      onChange={(ids) => updateSite(s.id, { assigneeIds: ids })}
                      options={employees.map((e) => ({ id: e.id, label: e.name }))}
                    />
                    {errors.sites?.[`${s.id}-assignee`] && (
                      <p className="text-xs text-destructive mt-1">{errors.sites?.[`${s.id}-assignee`]}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSite(s.id)} aria-label="Remove site" title="Remove this site row">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-1">
            <Button onClick={saveAssignments} title="Save the site allocation" className="gradient-saffron text-saffron-foreground px-6 shadow-sm">
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>
          </div>}
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-[#24105c] via-[#5c24ff] to-[#e91e9b] text-white">
            <h2 className="font-semibold">{MONTH_NAMES[month]} {year} — Site Allocation ({filtered.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-[#24105c] via-[#5c24ff] to-[#e91e9b] text-left text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap truncate max-w-[160px]" title="Client">Client</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap truncate max-w-[160px]" title="Project">Project</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap truncate max-w-[160px]" title="Site">Site</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap truncate max-w-[160px]" title="Assigned To">Assigned To</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap truncate max-w-[160px]" title="Unit / Qty">Unit / Qty</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap truncate max-w-[160px]" title="Amount">Amount</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap truncate max-w-[160px]" title="Sort by status">
                    <button type="button" onClick={() => setStatusSortAsc((current) => !current)} className="inline-flex items-center gap-1 hover:text-sky-200">
                      Status <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Action</th>
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
                  filtered.map((a, index) => (
                    <tr key={a.id} className={`border-t border-slate-200 transition-colors hover:bg-blue-50 ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                      <td className="px-4 py-3 max-w-[180px] truncate whitespace-nowrap" title={a.clientName || "-"}>{a.clientName || "-"}</td>
                      <td className="px-4 py-3 max-w-[180px] truncate whitespace-nowrap" title={a.projectName}>{a.projectName}</td>
                      <td className="px-4 py-3 max-w-[180px] truncate whitespace-nowrap" title={a.siteName}>{a.siteName}</td>
                      <td className="px-4 py-3 max-w-[160px] truncate whitespace-nowrap" title={a.assigneeName}>{a.assigneeName}</td>
                      <td
                        className="px-4 py-3 max-w-[160px] truncate whitespace-nowrap"
                        title={a.quantity != null ? `${a.unitType} · ${formatNumber(a.quantity)}` : "-"}
                      >
                        {a.quantity != null ? `${a.unitType} · ${formatNumber(a.quantity)}` : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {a.amount != null ? formatINR(a.amount) : "₹0.00"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <select
                            value={a.status}
                            onChange={(e) => handleStatusChange(a, e.target.value as Assignment["status"])}
                            className={`cursor-pointer text-xs font-medium rounded-full px-3 py-1 border ${
                            a.status === "Completed"
                              ? "bg-green-accent/10 text-green-accent border-green-accent/30"
                              : a.status === "Hold"
                                ? "bg-orange-500/10 text-orange-700 border-orange-500/30"
                              : "bg-yellow-500/10 text-yellow-700 border-yellow-500/30"
                            }`}
                          >
                            <option value="In Progress">In Progress</option>
                            <option value="Hold">Hold</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {a.status === "Completed" && (
                          <Button variant="ghost" size="icon" onClick={() => openComplete(a)} aria-label="Edit" title="Edit completion details">
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
                          title="Delete this allocation"
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
