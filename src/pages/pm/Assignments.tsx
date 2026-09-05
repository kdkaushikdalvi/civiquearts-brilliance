import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ArrowUpDown,
  Download,
  Upload,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatNumber } from "@/lib/pmFormat";
import ExcelJS from "exceljs";

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
    sites: availableSites,
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
  const importRef = useRef<HTMLInputElement>(null);

  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [sites, setSites] = useState<SiteRow[]>([
    { id: crypto.randomUUID(), siteName: "", assigneeIds: [] },
  ]);
  const [errors, setErrors] = useState<{
    client?: string;
    project?: string;
    sites?: Record<string, string>;
  }>({});

  // Restore draft when returning from master pages
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.clientId) setClientId(d.clientId);
        if (d.projectId) setProjectId(d.projectId);
        if (d.sites?.length)
          setSites(
            d.sites.map((site: SiteRow & { assigneeId?: string }) => ({
              ...site,
              assigneeIds:
                site.assigneeIds ?? (site.assigneeId ? [site.assigneeId] : []),
            }))
          );
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
        prev.map((s) =>
          s.id === st.forSiteId
            ? {
                ...s,
                assigneeIds: [...(s.assigneeIds ?? []), st.newEmployeeId],
              }
            : s
        )
      );
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const persistDraft = (
    patch: Partial<{
      clientId: string;
      projectId: string;
      sites: SiteRow[];
      month: number;
      year: number;
    }>
  ) => {
    const current = { clientId, projectId, sites, month, year, ...patch };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(current));
  };
  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

  const filtered = useMemo(
    () =>
      assignments
        .filter((a) => a.month === month && a.year === year)
        .sort((a, b) => {
          const order = [
            "In Progress",
            "In Progress 25%",
            "In Progress 45%",
            "In Progress 80%",
            "QC Pending",
            "Completed",
            "Hold",
            "Not Started Yet",
          ];
          const idxA = order.indexOf(a.status);
          const idxB = order.indexOf(b.status);
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        }),
    [assignments, month, year]
  );
  const grouped = useMemo(() => {
    const groups = new Map<string, Assignment[]>();
    filtered.forEach((assignment) => {
      const key = `${assignment.projectId}-${assignment.siteName}`;
      groups.set(key, [...(groups.get(key) ?? []), assignment]);
    });
    return Array.from(groups.values()).map((rows) =>
      [...rows].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    );
  }, [filtered]);

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

  const addAssigneeToGroup = async (row: Assignment) => {
    await addAssignments([
      {
        clientId: row.clientId,
        clientName: row.clientName,
        siteId: row.siteId,
        projectId: row.projectId,
        projectName: row.projectName,
        siteName: row.siteName,
        month: row.month,
        year: row.year,
        status: "Not Started Yet",
      },
    ]);
    toast.success("Assignee row added");
  };

  const handleSaveModal = (data: {
    unitType: Assignment["unitType"];
    quantity: number;
    rate: number;
    amount: number;
  }) => {
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
    });
    setErrors(errs);
    return (
      !errs.client && !errs.project && Object.keys(errs.sites!).length === 0
    );
  };

  const saveAssignments = async () => {
    if (!validate()) return;
    const project = projects.find((p) => p.id === projectId);
    const client = clients.find((c) => c.id === clientId);
    if (!project || !client) {
      toast.error("Please reselect the client and project");
      return;
    }
    const records = (
      await Promise.all(
        sites.flatMap((s) => {
          const assigneeIds = s.assigneeIds?.length ? s.assigneeIds : [null];
          return assigneeIds.map(async (assigneeId) => {
            const emp = assigneeId
              ? employees.find((e) => e.id === assigneeId)
              : undefined;
            const site = await upsertSite(project.id, s.siteName.trim());
            return {
              clientId: client.id,
              clientName: client.name,
              siteId: site?.id,
              projectId: project.id,
              projectName: project.name,
              siteName: s.siteName.trim(),
              assigneeId: emp?.id,
              assigneeName: emp?.name,
              month,
              year,
              status: (emp?.id ? "In Progress" : "Not Started Yet") as const,
            };
          });
        })
      )
    ).flat();
    await addAssignments(records);
    toast.success(
      `${records.length} site allocation${records.length > 1 ? "s" : ""} saved`
    );
    const emptySites = [
      { id: crypto.randomUUID(), siteName: "", assigneeIds: [] },
    ];
    setSites(emptySites);
    persistDraft({ sites: emptySites });
  };

  const exportAllocations = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Site Allocation");
    sheet.addRow([
      "Project",
      "Site",
      "Client",
      "Assignee",
      "Unit",
      "Quantity",
      "Rate",
      "Amount",
      "Status",
      "Month",
      "Year",
    ]);
    filtered.forEach((a) =>
      sheet.addRow([
        a.projectName,
        a.siteName,
        a.clientName,
        a.assigneeName,
        a.unitType,
        a.quantity ?? "",
        a.rate ?? "",
        a.amount ?? "",
        a.status,
        MONTH_NAMES[month],
        year,
      ])
    );
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: "center" };
    sheet.eachRow((row) =>
      row.eachCell((cell) => {
        cell.alignment = {
          ...cell.alignment,
          horizontal: "center",
          vertical: "middle",
        };
      })
    );
    sheet.columns.forEach((column) => {
      column.width = 18;
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `Site Allocation ${MONTH_NAMES[month]} ${year}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Site allocation exported");
  };

  const importAllocations = async (file: File) => {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      const rows = sheet.getSheetValues().slice(1) as unknown[][];
      const records = [];
      for (const row of rows) {
        const [
          projectName,
          siteName,
          clientName,
          assigneeName,
          unitType,
          quantity,
          rate,
          amount,
          status,
        ] = row.slice(1);
        const project = projects.find(
          (p) =>
            p.name.trim().toLowerCase() ===
            String(projectName ?? "")
              .trim()
              .toLowerCase()
        );
        const client = clients.find(
          (c) =>
            c.name.trim().toLowerCase() ===
            String(clientName ?? "")
              .trim()
              .toLowerCase()
        );
        const employee = employees.find(
          (e) =>
            e.name.trim().toLowerCase() ===
            String(assigneeName ?? "")
              .trim()
              .toLowerCase()
        );
        if (!project || !client || !String(siteName ?? "").trim()) continue;
        const site = await upsertSite(project.id, String(siteName).trim());
        const resolvedStatus = [
          "Completed",
          "Hold",
          "In Progress",
          "In Progress 25%",
          "In Progress 45%",
          "In Progress 80%",
          "QC Pending",
          "Not Started Yet",
        ].includes(String(status))
          ? (String(status) as Assignment["status"])
          : employee?.id
          ? "In Progress"
          : "Not Started Yet";
        records.push({
          clientId: client.id,
          clientName: client.name,
          siteId: site?.id,
          projectId: project.id,
          projectName: project.name,
          siteName: String(siteName).trim(),
          assigneeId: employee?.id,
          assigneeName: employee?.name,
          month,
          year,
          status: resolvedStatus,
          unitType: String(unitType ?? "-"),
          quantity: Number(quantity) || 0,
          rate: Number(rate) || 0,
          amount: Number(amount) || 0,
        });
      }
      if (!records.length)
        return toast.error("No valid allocation rows found in the file");
      await addAssignments(records);
      toast.success(
        `Imported ${records.length} allocation${
          records.length === 1 ? "" : "s"
        }`
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to import allocation file");
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="relative flex flex-wrap items-center justify-between gap-4 bg-slate-50 pb-4 before:absolute before:bottom-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-b before:border-slate-200 before:content-['']">
          <div>
            <h3 className="text-xl font-semibold text-blue-800">
              Site Allocation
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importAllocations(file);
                e.currentTarget.value = "";
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => importRef.current?.click()}
              title="Import site allocations"
              aria-label="Import site allocations"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void exportAllocations()}
              disabled={!filtered.length}
              title="Export site allocations"
              aria-label="Export site allocations"
            >
              <Download className="h-4 w-4" />
            </Button>
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
        </div>

        {/* Create Section */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="min-w-0 truncate text-xl font-medium text-slate-500">
            {MONTH_NAMES[month]} {year} — Site Allocation ({filtered.length})
          </h2>
          <button
            type="button"
            onClick={() => setAllocationFormOpen((open) => !open)}
            className="flex shrink-0 items-center gap-2 rounded-lg border-2 border-blue-600 bg-white px-4 py-2.5 text-left text-blue-800 shadow-sm transition-colors hover:bg-blue-50"
            aria-expanded={allocationFormOpen}
          >
            <span className="flex items-center gap-2 font-semibold">
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                <span
                  className={`absolute inset-0 rounded-full bg-green-400 opacity-60 ${
                    !allocationFormOpen ? "animate-ping" : ""
                  }`}
                />
                <Plus className="relative h-4 w-4" />
              </span>
              Add Sites
            </span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-blue-600 transition-transform duration-300 ${
                allocationFormOpen ? "rotate-180" : "animate-bounce"
              }`}
            />
          </button>
        </div>
        {allocationFormOpen && (
          <Card className="overflow-visible">
            <div className="space-y-3 bg-blue-50/50 p-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="space-y-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                    <label className="w-32 shrink-0 pt-2 text-sm font-semibold text-blue-800">
                      Client Name *
                    </label>
                    <div className="min-w-0 flex-1">
                      <SearchableSelect
                        value={clientId}
                        onChange={(id) => {
                          setClientId(id);
                          setProjectId("");
                          persistDraft({ clientId: id, projectId: "" });
                        }}
                        options={clients.map((c) => ({
                          id: c.id,
                          label: c.name,
                        }))}
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
                      {errors.client && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.client}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                    <label className="w-32 shrink-0 pt-2 text-sm font-semibold text-violet-800">
                      Project *
                    </label>
                    <div className="min-w-0 flex-1">
                      <SearchableSelect
                        value={projectId}
                        onChange={(id) => {
                          setProjectId(id);
                          persistDraft({ projectId: id });
                        }}
                        options={projects
                          .filter(
                            (p) =>
                              !clientId ||
                              !p.clientId ||
                              p.clientId === clientId
                          )
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
                          const p = await addProject(
                            query,
                            clientId,
                            client?.name
                          );
                          if (!p) return;
                          setProjectId(p.id);
                          persistDraft({ projectId: p.id });
                          toast.success("Project added");
                        }}
                      />
                      {errors.project && (
                        <p className="text-xs text-destructive mt-1">
                          {errors.project}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 hidden grid-cols-[1fr_1fr_auto] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                  <span className="text-cyan-800">Site Name</span>
                  <span className="text-pink-800">Select Assignee</span>
                  <span className="w-10" />
                </div>
                <div className="space-y-2">
                  {sites.map((s) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-start"
                    >
                      <div>
                        <SearchableSelect
                          value={
                            availableSites.find(
                              (site) =>
                                site.name === s.siteName &&
                                site.projectId === projectId
                            )?.id ?? ""
                          }
                          onChange={(siteId) => {
                            const site = availableSites.find(
                              (item) => item.id === siteId
                            );
                            if (site) updateSite(s.id, { siteName: site.name });
                          }}
                          options={availableSites
                            .filter((site) => site.projectId === projectId)
                            .map((site) => ({ id: site.id, label: site.name }))}
                          placeholder="Select Site *"
                          emptyActionLabel="Add Site Name"
                          onEmptyAction={async (query) => {
                            if (!query) {
                              toast.error("Site name required");
                              return;
                            }
                            if (!projectId) {
                              toast.error("Select a project first");
                              return;
                            }
                            const site = await upsertSite(projectId, query);
                            if (!site) return;
                            updateSite(s.id, { siteName: site.name });
                            toast.success("Site added");
                          }}
                        />
                        {errors.sites?.[`${s.id}-name`] && (
                          <p className="text-xs text-destructive mt-1">
                            {errors.sites?.[`${s.id}-name`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <MultiSearchableSelect
                          value={s.assigneeIds ?? []}
                          onChange={(ids) =>
                            updateSite(s.id, { assigneeIds: ids })
                          }
                          options={employees.map((e) => ({
                            id: e.id,
                            label: e.name,
                          }))}
                          onEmptyAction={async (name) => {
                            const employee = await addEmployee({ name });
                            if (employee) {
                              updateSite(s.id, {
                                assigneeIds: [
                                  ...(s.assigneeIds ?? []),
                                  employee.id,
                                ],
                              });
                              toast.success("Assignee added");
                            }
                          }}
                        />
                        {errors.sites?.[`${s.id}-assignee`] && (
                          <p className="text-xs text-destructive mt-1">
                            {errors.sites?.[`${s.id}-assignee`]}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Site actions"
                            title="Site actions"
                            className="h-8 w-8 rounded-full"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-28 rounded-xl p-1.5"
                        >
                          <DropdownMenuItem
                            onClick={addSite}
                            className="cursor-pointer rounded-lg text-xs font-medium"
                          >
                            <Plus className="mr-2 h-3.5 w-3.5" /> More
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => removeSite(s.id)}
                            className="cursor-pointer rounded-lg text-xs font-medium text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-200 pt-1">
                <Button
                  onClick={saveAssignments}
                  title="Save the site allocation"
                  className="gradient-saffron px-6 text-saffron-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-90 active:brightness-90 active:shadow-sm"
                >
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-[#24105c] via-[#5c24ff] to-[#e91e9b] text-center text-white">
                <tr>
                  <th
                    className="px-4 py-3 text-center font-semibold whitespace-nowrap truncate max-w-[160px]"
                    title="Project"
                  >
                    Project
                  </th>
                  <th
                    className="px-4 py-3 text-center font-semibold whitespace-nowrap truncate max-w-[160px]"
                    title="Site"
                  >
                    Site
                  </th>
                  <th
                    className="px-4 py-3 text-center font-semibold whitespace-nowrap truncate max-w-[160px]"
                    title="Assigned To"
                  >
                    Assigned To
                  </th>
                  <th
                    className="px-4 py-3 text-center font-semibold whitespace-nowrap truncate max-w-[160px]"
                    title="Unit / Qty"
                  >
                    Unit / Qty
                  </th>
                  <th
                    className="px-4 py-3 text-center font-semibold whitespace-nowrap truncate max-w-[160px]"
                    title="Amount"
                  >
                    Amount
                  </th>
                  <th
                    className="px-4 py-3 text-center font-semibold whitespace-nowrap truncate max-w-[160px]"
                    title="Status order: In Progress, Completed, Hold"
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      Status <ArrowUpDown className="h-3.5 w-3.5" />
                    </span>
                  </th>
                  <th
                    className="w-[52px] px-0.5 py-3 text-center font-semibold whitespace-nowrap"
                    aria-label="Actions"
                  />
                </tr>
              </thead>
              <tbody>
                {grouped.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No projects for this month.
                    </td>
                  </tr>
                ) : (
                  grouped.map((rows, index) => {
                    const a = rows[0];
                    return (
                      <tr
                        key={a.id}
                        className={`transition-colors hover:bg-blue-50 [&>td]:border-y [&>td]:border-slate-200 [&>td:first-child]:border-l [&>td:last-child]:border-r ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50"
                        }`}
                      >
                        <td
                          className="px-2 py-0 max-w-[180px] truncate whitespace-nowrap"
                          title={a.projectName}
                        >
                          {a.projectName}
                        </td>
                        <td
                          className="px-2 py-0 whitespace-normal break-words"
                          title={a.siteName}
                        >
                          {a.siteName}
                        </td>
                        <td className="space-y-[5px] px-2 py-0 pb-[5px] align-middle text-center">
                          {rows.map((row) => (
                            <div
                              key={row.id}
                              className="relative my-[5px] flex h-8 items-center justify-center whitespace-nowrap"
                            >
                              <Select
                                value={row.assigneeId ?? "__unassigned__"}
                                onValueChange={(value) => {
                                  if (
                                    value === "__unassigned__" ||
                                    value === "__remove__"
                                  ) {
                                    updateAssignment(row.id, {
                                      assigneeId: undefined,
                                      assigneeName: undefined,
                                      status: "Not Started Yet",
                                    });
                                    return;
                                  }
                                  const employee = employees.find(
                                    (item) => item.id === value
                                  );
                                  if (employee) {
                                    const alreadyAssigned = rows.some(
                                      (otherRow) =>
                                        otherRow.id !== row.id &&
                                        otherRow.assigneeId === employee.id
                                    );
                                    if (alreadyAssigned) {
                                      toast.error(
                                        `${employee.name} is already assigned to this allocation.`
                                      );
                                      return;
                                    }
                                    updateAssignment(row.id, {
                                      assigneeId: employee.id,
                                      assigneeName: employee.name,
                                      status:
                                        row.status === "Not Started Yet"
                                          ? "In Progress"
                                          : row.status,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger
                                  aria-label={`Assigned To for ${row.siteName}`}
                                  className={`h-8 w-[150px] rounded-full py-0 px-3 text-xs font-semibold shadow-sm focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-70 ${
                                    row.assigneeId
                                      ? "border-violet-200 bg-violet-50 text-violet-700"
                                      : "border-slate-200 bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent className="min-w-[170px] rounded-xl border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 data-[state=open]:animate-none data-[state=closed]:animate-none">
                                  <SelectItem
                                    value="__unassigned__"
                                    className="cursor-pointer rounded-lg py-2 text-xs font-semibold text-slate-600 focus:bg-transparent focus:text-slate-600"
                                  >
                                    Unassigned
                                  </SelectItem>
                                  {employees.map((employee) => (
                                    <SelectItem
                                      key={employee.id}
                                      value={employee.id}
                                      className="cursor-pointer rounded-lg py-2 text-xs font-semibold text-slate-700 focus:bg-transparent focus:text-slate-700"
                                    >
                                      {employee.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </td>
                        <td className="space-y-[5px] px-2 py-0 pb-[5px] max-w-[160px] whitespace-nowrap text-center">
                          {rows.map((row) => (
                            <div
                              key={row.id}
                              className="my-[5px] flex h-8 items-center justify-center whitespace-nowrap"
                            >
                              {row.unitType
                                ? `${row.unitType} · ${formatNumber(
                                    row.quantity ?? 0
                                  )}`
                                : "-"}
                            </div>
                          ))}
                        </td>
                        <td className="space-y-[5px] px-2 py-0 pb-[5px] font-medium whitespace-nowrap text-center">
                          {rows.map((row) => (
                            <div
                              key={row.id}
                              className="my-[5px] flex h-8 items-center justify-center whitespace-nowrap"
                            >
                              {formatINR(row.amount ?? 0)}
                            </div>
                          ))}
                        </td>
                        <td className="space-y-[5px] px-2 py-0 pb-[5px] whitespace-nowrap">
                          {rows.map((row) => (
                            <div
                              key={row.id}
                              className="my-[5px] flex h-8 items-center justify-center"
                            >
                              <div
                                className={`relative inline-flex items-center rounded-full border px-2.5 shadow-sm ${
                                  row.status === "Completed"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : row.status === "Hold" ||
                                      row.status === "On Hold"
                                    ? "border-amber-200 bg-amber-50 text-amber-700"
                                    : row.status === "Not Started Yet"
                                    ? "border-slate-200 bg-slate-100 text-slate-600"
                                    : row.status === "QC Pending"
                                    ? "border-teal-200 bg-teal-50 text-teal-700"
                                    : row.status === "In Progress 25%" ||
                                      row.status === "In Progress – 25%"
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : row.status === "In Progress 45%" ||
                                      row.status === "In Progress – 45%"
                                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                    : row.status === "In Progress 80%" ||
                                      row.status === "In Progress – 80%"
                                    ? "border-purple-200 bg-purple-50 text-purple-700"
                                    : "border-violet-200 bg-violet-50 text-violet-700"
                                }`}
                              >
                                <Select
                                  value={row.status}
                                  onValueChange={(value) =>
                                    handleStatusChange(
                                      row,
                                      value as Assignment["status"]
                                    )
                                  }
                                >
                                  <SelectTrigger
                                    aria-label={`Status for ${row.siteName}`}
                                    className="h-auto w-auto min-w-[124px] border-0 bg-transparent py-2 px-1.5 text-xs font-semibold shadow-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-60"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="min-w-[170px] rounded-xl border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 data-[state=open]:animate-none data-[state=closed]:animate-none">
                                    <SelectItem
                                      value="In Progress"
                                      className="cursor-pointer rounded-lg py-2 pl-8 text-xs font-semibold text-violet-700 focus:bg-transparent focus:text-violet-700"
                                    >
                                      In Progress
                                    </SelectItem>

                                    <SelectItem
                                      value="Completed"
                                      className="cursor-pointer rounded-lg py-2 pl-8 text-xs font-semibold text-emerald-700 focus:bg-transparent focus:text-emerald-700"
                                    >
                                      Completed
                                    </SelectItem>

                                    {/* Gray divider */}
                                    <div className="my-1 border-t border-gray-200" />

                                    <SelectItem
                                      value="In Progress 25%"
                                      className="cursor-pointer rounded-lg py-2 pl-8 text-xs font-semibold text-blue-700 focus:bg-transparent focus:text-blue-700"
                                    >
                                      In Progress 25%
                                    </SelectItem>
                                    <SelectItem
                                      value="In Progress 45%"
                                      className="cursor-pointer rounded-lg py-2 pl-8 text-xs font-semibold text-indigo-700 focus:bg-transparent focus:text-indigo-700"
                                    >
                                      In Progress 45%
                                    </SelectItem>
                                    <SelectItem
                                      value="In Progress 80%"
                                      className="cursor-pointer rounded-lg py-2 pl-8 text-xs font-semibold text-purple-700 focus:bg-transparent focus:text-purple-700"
                                    >
                                      In Progress 80%
                                    </SelectItem>
                                    <SelectItem
                                      value="QC Pending"
                                      className="cursor-pointer rounded-lg py-2 pl-8 text-xs font-semibold text-teal-700 focus:bg-transparent focus:text-teal-700"
                                    >
                                      QC Pending
                                    </SelectItem>

                                    <SelectItem
                                      value="Hold"
                                      className="cursor-pointer rounded-lg py-2 pl-8 text-xs font-semibold text-amber-700 focus:bg-transparent focus:text-amber-700"
                                    >
                                      Hold
                                    </SelectItem>
                                    <SelectItem
                                      value="Not Started Yet"
                                      className="cursor-pointer rounded-lg py-2 pl-8 text-xs font-semibold text-slate-600 focus:bg-transparent focus:text-slate-600"
                                    >
                                      Not Started Yet
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                        </td>
                        <td className="w-[52px] space-y-[5px] px-0.5 py-0 pb-[5px] align-middle text-center">
                          {rows.map((row) => (
                            <div
                              key={row.id}
                              className="my-[5px] flex h-8 items-center justify-center"
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full"
                                    aria-label="Open actions"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-32 rounded-xl p-1.5"
                                >
                                  <DropdownMenuItem
                                    onClick={() => addAssigneeToGroup(row)}
                                    className="cursor-pointer rounded-lg text-xs"
                                  >
                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                    More
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openComplete(row)}
                                    className="cursor-pointer rounded-lg text-xs"
                                  >
                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => deleteAssignment(row.id)}
                                    className="cursor-pointer rounded-lg text-xs text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))}
                        </td>
                      </tr>
                    );
                  })
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
