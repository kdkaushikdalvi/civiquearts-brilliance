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
  ArrowUp,
  ArrowDown,
  Mail,
  MoreHorizontal,
  Pencil,
  Search,
  X,
  AlertCircle,
  Copy,
  ExternalLink,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatNumber } from "@/lib/pmFormat";
import { cleanUnit } from "@/lib/unitFormat";
import { getStatusRank } from "@/lib/statusSort";
import { isSiteGroupCompleted } from "@/lib/projectCompletion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ExcelJS from "exceljs";
import { compactAssigneeName } from "@/lib/assigneeFormat";

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
  const { user } = useAuth();

  const getLocalDateString = (d: Date = new Date()): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [reportFrom, setReportFrom] = useState(() => getLocalDateString(now));
  const [reportTo, setReportTo] = useState(() => getLocalDateString(now));
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportSending, setReportSending] = useState(false);
  const [reportErrorDetail, setReportErrorDetail] = useState<string | null>(null);
  const [reportSectionOpen, setReportSectionOpen] = useState(false);
  const [allocationFormOpen, setAllocationFormOpen] = useState(false);
  const [siteSearch, setSiteSearch] = useState("");

  const [editSiteModalOpen, setEditSiteModalOpen] = useState(false);
  const [editingSiteRows, setEditingSiteRows] = useState<Assignment[] | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedSiteName, setSelectedSiteName] = useState("");
  const [isSavingSiteChange, setIsSavingSiteChange] = useState(false);

  const handleOpenEditSiteModal = (rows: Assignment[]) => {
    setEditingSiteRows(rows);
    const currentSiteName = rows[0]?.siteName || "";
    const currentProjectId = rows[0]?.projectId || "";
    const matched = availableSites.find(
      (s) =>
        s.projectId === currentProjectId &&
        s.name.toLowerCase() === currentSiteName.toLowerCase()
    );
    setSelectedSiteId(matched?.id || "");
    setSelectedSiteName(currentSiteName);
    setEditSiteModalOpen(true);
  };

  const handleSaveSiteChange = async () => {
    if (!editingSiteRows || !editingSiteRows.length) return;
    const newSiteName = selectedSiteName.trim();
    if (!newSiteName) {
      toast.error("Site name cannot be empty");
      return;
    }

    const currentSiteName = editingSiteRows[0]?.siteName || "";
    if (newSiteName.toLowerCase() === currentSiteName.toLowerCase()) {
      toast.info("Site name is unchanged");
      setEditSiteModalOpen(false);
      setEditingSiteRows(null);
      return;
    }

    setIsSavingSiteChange(true);
    try {
      const currentProjectId = editingSiteRows[0]?.projectId || "";
      const matchedSite = availableSites.find(
        (s) =>
          s.projectId === currentProjectId &&
          s.name.toLowerCase() === newSiteName.toLowerCase()
      );
      const newSiteId = matchedSite ? matchedSite.id : selectedSiteId || undefined;

      for (const row of editingSiteRows) {
        await updateAssignment(row.id, {
          siteName: newSiteName,
          siteId: newSiteId,
        });
      }

      toast.success(`Site name updated to "${newSiteName}"`);
      setEditSiteModalOpen(false);
      setEditingSiteRows(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update site name");
    } finally {
      setIsSavingSiteChange(false);
    }
  };

  const editModalSiteOptions = useMemo(() => {
    if (!editingSiteRows || !editingSiteRows[0]) return [];
    const targetProjectId = editingSiteRows[0].projectId;
    const projectSites = availableSites.filter((s) => s.projectId === targetProjectId);
    const otherSites = availableSites.filter((s) => s.projectId !== targetProjectId);

    return [
      ...projectSites.map((s) => ({ id: s.id, label: s.name })),
      ...otherSites.map((s) => ({ id: s.id, label: `${s.name} (Other Project)` })),
    ];
  }, [editingSiteRows, availableSites]);

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

  const [sortField, setSortField] = useState<"project" | "site" | "status">("status");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: "project" | "site" | "status") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filtered = useMemo(() => {
    const list = assignments.filter(
      (a) => a.month === month && a.year === year
    );
    const query = siteSearch.trim().toLowerCase();
    const searchedList = query
      ? list.filter((a) => {
          const siteMatch = a.siteName && a.siteName.toLowerCase().includes(query);
          const projectMatch =
            a.projectName && a.projectName.toLowerCase().includes(query);
          return siteMatch || projectMatch;
        })
      : list;

    return searchedList.sort((a, b) => {
      const nameA = a.projectName || "";
      const nameB = b.projectName || "";

      if (sortField === "site") {
        return sortDirection === "asc"
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sortField === "project") {
        const cmp = nameA.localeCompare(nameB, undefined, {
          sensitivity: "base",
          numeric: true,
        });
        if (cmp !== 0) return sortDirection === "asc" ? cmp : -cmp;
        const siteA = a.siteName || "";
        const siteB = b.siteName || "";
        return siteA.localeCompare(siteB, undefined, {
          sensitivity: "base",
          numeric: true,
        });
      }

      // sortField === "status":
      // Keep project order unchanged:
      const pCmp = nameA.localeCompare(nameB, undefined, {
        sensitivity: "base",
        numeric: true,
      });
      if (pCmp !== 0) return pCmp;

      // Within each project group, sort by status:
      const rankA = getStatusRank(a.status, sortDirection);
      const rankB = getStatusRank(b.status, sortDirection);
      if (rankA !== rankB) return rankA - rankB;

      const siteA = a.siteName || "";
      const siteB = b.siteName || "";
      return siteA.localeCompare(siteB, undefined, {
        sensitivity: "base",
        numeric: true,
      });
    });
  }, [assignments, month, year, sortField, sortDirection, siteSearch]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Assignment[]>();
    filtered.forEach((assignment) => {
      const key = `${assignment.projectId}-${assignment.siteName}`;
      groups.set(key, [...(groups.get(key) ?? []), assignment]);
    });

    const siteGroups = Array.from(groups.values()).map((rows) => {
      if (sortField === "status") {
        return [...rows].sort((a, b) => {
          const rankA = getStatusRank(a.status, sortDirection);
          const rankB = getStatusRank(b.status, sortDirection);
          if (rankA !== rankB) return rankA - rankB;
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
      return [...rows].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });

    return siteGroups.sort((rowsA, rowsB) => {
      const pA = rowsA[0]?.projectName || "";
      const pB = rowsB[0]?.projectName || "";

      if (sortField === "site") {
        return rowsA[0] && rowsB[0]
          ? sortDirection === "asc"
            ? new Date(rowsA[0].createdAt).getTime() - new Date(rowsB[0].createdAt).getTime()
            : new Date(rowsB[0].createdAt).getTime() - new Date(rowsA[0].createdAt).getTime()
          : 0;
      }

      if (sortField === "project") {
        const cmp = pA.localeCompare(pB, undefined, {
          sensitivity: "base",
          numeric: true,
        });
        if (cmp !== 0) return sortDirection === "asc" ? cmp : -cmp;
        const sA = rowsA[0]?.siteName || "";
        const sB = rowsB[0]?.siteName || "";
        return sA.localeCompare(sB, undefined, {
          sensitivity: "base",
          numeric: true,
        });
      }

      // Status sort: keep project order unchanged, sort within project group
      const projectCmp = pA.localeCompare(pB, undefined, {
        sensitivity: "base",
        numeric: true,
      });
      if (projectCmp !== 0) return projectCmp;

      const rankA = getStatusRank(rowsA[0]?.status, sortDirection);
      const rankB = getStatusRank(rowsB[0]?.status, sortDirection);
      if (rankA !== rankB) return rankA - rankB;

      const sA = rowsA[0]?.siteName || "";
      const sB = rowsB[0]?.siteName || "";
      return sA.localeCompare(sB, undefined, {
        sensitivity: "base",
        numeric: true,
      });
    });
  }, [filtered, sortField, sortDirection]);

  const inProgressGrouped = useMemo(() => {
    return grouped.filter((rows) => !isSiteGroupCompleted(rows));
  }, [grouped]);

  const completedGrouped = useMemo(() => {
    return grouped.filter((rows) => isSiteGroupCompleted(rows));
  }, [grouped]);

  const inProgressAssignmentsCount = useMemo(() => {
    return inProgressGrouped.reduce((sum, rows) => sum + rows.length, 0);
  }, [inProgressGrouped]);

  const completedAssignmentsCount = useMemo(() => {
    return completedGrouped.reduce((sum, rows) => sum + rows.length, 0);
  }, [completedGrouped]);

  const inProgressProjectsCount = useMemo(() => {
    const pSet = new Set<string>();
    inProgressGrouped.forEach((rows) => {
      const pKey = rows[0]?.projectId || rows[0]?.projectName;
      if (pKey) pSet.add(pKey);
    });
    return pSet.size;
  }, [inProgressGrouped]);

  const completedProjectsCount = useMemo(() => {
    const pSet = new Set<string>();
    completedGrouped.forEach((rows) => {
      const pKey = rows[0]?.projectId || rows[0]?.projectName;
      if (pKey) pSet.add(pKey);
    });
    return pSet.size;
  }, [completedGrouped]);

  const [userSelectedTab, setUserSelectedTab] = useState<
    "all" | "in_progress" | "completed" | null
  >(null);
  const [lastMonthYearKey, setLastMonthYearKey] = useState(`${month}-${year}`);

  // Reset explicit tab selection when navigating to a different month/year
  const currentMonthYearKey = `${month}-${year}`;
  if (lastMonthYearKey !== currentMonthYearKey) {
    setLastMonthYearKey(currentMonthYearKey);
    setUserSelectedTab(null);
  }

  // Default selection: "in_progress" if greater than zero, else "all"
  const activeTab: "all" | "in_progress" | "completed" =
    userSelectedTab ?? (inProgressAssignmentsCount > 0 ? "in_progress" : "all");

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

  const reportRecords = useMemo(() => {
    const from = reportFrom ? new Date(`${reportFrom}T00:00:00`) : null;
    const to = reportTo ? new Date(`${reportTo}T23:59:59.999`) : null;
    if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return [];
    }

    return assignments.filter((assignment) => {
      if (assignment.status !== "Completed") return false;
      const completedAt = new Date(assignment.updatedAt ?? assignment.createdAt);
      return !Number.isNaN(completedAt.getTime()) && completedAt >= from && completedAt <= to;
    });
  }, [assignments, reportFrom, reportTo]);

  const reportTotalAmount = useMemo(
    () => reportRecords.reduce((sum, r) => sum + (r.amount || 0), 0),
    [reportRecords]
  );

  const openReportConfirmation = () => {
    if (!reportFrom || !reportTo || reportFrom > reportTo)
      return toast.error("Select a valid date range");
    if (!reportRecords.length)
      return toast.info(
        "No completed sites found for the selected date range."
      );
    setReportErrorDetail(null);
    setReportModalOpen(true);
  };

  const exportCompletedSitesExcel = async () => {
    if (!reportRecords.length) {
      toast.info("No completed sites found to export");
      return;
    }
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Site Allocation");

      const grouped = new Map<string, Assignment[]>();
      reportRecords.forEach((record) => {
        const key = record.projectName || "Other Sites";
        grouped.set(key, [...(grouped.get(key) ?? []), record]);
      });

      for (const [projectName, records] of grouped) {
        const section = sheet.addRow([
          `We have completed ${records.length} ${projectName}${records.length === 1 ? "" : "s"} and uploaded at this location - Please see status below`,
        ]);
        sheet.mergeCells(`A${section.number}:G${section.number}`);
        section.font = { name: "Arial", bold: true, size: 11, color: { argb: "FF000000" } };

        const header = sheet.addRow([
          "Sr. No.", "Site Name", "Incoming Date", "Foot Count",
          "Considered Foot Count", "Completed Date", "Status",
        ]);
        header.font = { name: "Arial", bold: false, size: 11, color: { argb: "FF000000" } };
        header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
        header.alignment = { horizontal: "center", vertical: "middle" };
        header.eachCell((cell) => {
          cell.border = { top: { style: "thin", color: { argb: "FF777777" } }, bottom: { style: "thin", color: { argb: "FF777777" } }, left: { style: "thin", color: { argb: "FF777777" } }, right: { style: "thin", color: { argb: "FF777777" } } };
        });

        records.forEach((a, index) => {
          const incomingDate = a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-US") : "";
          const completedDate = a.updatedAt ? new Date(a.updatedAt).toLocaleDateString("en-US") : "";
          const row = sheet.addRow([
            index + 1,
            a.siteName,
            incomingDate,
            a.quantity ?? "",
            a.quantity ?? "",
            completedDate,
            a.status,
          ]);
          row.font = { name: "Arial", size: 11, color: { argb: "FF000000" } };
          row.alignment = { horizontal: "center", vertical: "middle" };
          row.eachCell((cell) => {
            cell.border = { top: { style: "thin", color: { argb: "FF777777" } }, bottom: { style: "thin", color: { argb: "FF777777" } }, left: { style: "thin", color: { argb: "FF777777" } }, right: { style: "thin", color: { argb: "FF777777" } } };
          });
        });
        sheet.addRow([]);
      }

      [10, 42, 18, 16, 24, 18, 16].forEach((width, index) => {
        sheet.getColumn(index + 1).width = width;
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `Completed Sites Report ${reportFrom} to ${reportTo}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Completed sites Excel report downloaded");
    } catch {
      toast.error("Failed to generate Excel report");
    }
  };

  const getReportSummaryText = () => {
    const totalQty = reportRecords.reduce((sum, r) => sum + (r.quantity || 0), 0);
    return [
      `Completed Sites Report — Civique Arts`,
      `Date Range: ${reportFrom} to ${reportTo}`,
      `Total Completed Sites: ${reportRecords.length}`,
      `Total Quantity: ${totalQty}`,
      `Total Value: ₹${reportTotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      ``,
      `--- Completed Sites Summary ---`,
      ...reportRecords.map(
        (r, i) =>
          `${i + 1}. Project: ${r.projectName} | Site: ${r.siteName}\n   Assignee: ${r.assigneeName || "Unassigned"} | Qty: ${r.quantity || 0} ${r.unitType || ""} | Rate: ₹${r.rate || 0} | Amount: ₹${(r.amount || 0).toLocaleString("en-IN")}`
      ),
      ``,
      `Generated by Civique Arts Portal`,
    ].join("\n");
  };

  const getGmailComposeUrl = () => {
    const recipient = user?.email || "";
    const subject = `Completed Sites Report: ${reportFrom} to ${reportTo}`;
    const body = getReportSummaryText();
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getMailtoUrl = () => {
    const recipient = user?.email || "";
    const subject = `Completed Sites Report: ${reportFrom} to ${reportTo}`;
    const body = getReportSummaryText();
    return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleCopyReportText = async () => {
    try {
      await navigator.clipboard.writeText(getReportSummaryText());
      toast.success("Report summary copied to clipboard!");
    } catch {
      toast.error("Failed to copy report to clipboard");
    }
  };

  const sendCompletedSitesReport = async () => {
    if (!user)
      return toast.error("Unable to determine the authenticated user's email");
    setReportSending(true);
    setReportErrorDetail(null);
    const { data, error } = await supabase.functions.invoke(
      "send-completed-sites-report",
      {
        body: {
          fromDate: reportFrom,
          toDate: reportTo,
          fromEmail: "Civique Arts <onboarding@resend.dev>",
        },
      }
    );
    setReportSending(false);
    if (error) {
      let detail = error.message || "Failed to send report";
      try {
        const context = (error as { context?: Response }).context;
        if (context) {
          const body = (await context.clone().json()) as { error?: string; message?: string };
          if (body.error) detail = body.error;
          else if (body.message) detail = body.message;
        }
      } catch {
        /* Keep the provider message when the response is not JSON. */
      }
      setReportErrorDetail(detail);
      if (detail.includes("gmail.com") || detail.includes("not verified")) {
        return toast.error(
          "Resend domain error: Resend cannot send from @gmail.com without domain verification. Use Gmail or Download Excel below."
        );
      }
      return toast.error(detail);
    }
    if (!data?.sent) {
      const msg = data?.message || "The report was not sent";
      setReportErrorDetail(msg);
      return toast.error(msg);
    }
    setReportModalOpen(false);
    toast.success("Completed sites report sent successfully.");
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
        unitType: cleanUnit(data.unitType),
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
              status: (emp?.id
                ? "In Progress – 0%"
                : "Not Started Yet") as const,
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
        cleanUnit(a.unitType),
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
          "On Hold",
          "In Progress – 0%",
          "In Progress – 25%",
          "In Progress – 45%",
          "In Progress – 80%",
          "QC Pending",
          "Not Started Yet",
        ].includes(String(status))
          ? (String(status) as Assignment["status"])
          : employee?.id
          ? "In Progress – 0%"
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
          unitType: cleanUnit(String(unitType ?? "-")),
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

  const renderSiteRow = (rows: Assignment[], index: number) => {
    const a = rows[0];
    return (
      <tr
        key={a.id}
        className={`cursor-pointer [&>td]:border-y [&>td]:border-slate-200 [&>td:first-child]:border-l [&>td:last-child]:border-r ${
          index % 2 === 0 ? "bg-blue-50" : "bg-violet-50"
        }`}
      >
        <td
          className="px-3 py-1 max-w-[180px] truncate whitespace-nowrap font-medium text-slate-800"
          title={a.projectName}
        >
          {a.projectName}
        </td>
        <td
          className="px-3 py-1 whitespace-normal break-words text-slate-700"
          title={a.siteName}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-800 break-words">{a.siteName}</span>
          </div>
        </td>
        {activeTab !== "in_progress" && <td className="space-y-[5px] px-2 py-0 pb-[5px] max-w-[160px] whitespace-nowrap text-left">
          {rows.map((row) => (
            <div
              key={row.id}
              className="my-[5px] flex h-8 items-center justify-start whitespace-nowrap"
            >
              {row.unitType
                ? `${cleanUnit(row.unitType)} · ${formatNumber(row.quantity ?? 0)}`
                : "-"}
            </div>
          ))}
        </td>}
        {activeTab !== "in_progress" && <td className="space-y-[5px] px-2 py-0 pb-[5px] font-medium whitespace-nowrap text-left">
          {rows.map((row) => (
            <div
              key={row.id}
              className="my-[5px] flex h-8 items-center justify-start whitespace-nowrap"
            >
              {formatINR(row.amount ?? 0)}
            </div>
          ))}
        </td>}
        <td className="space-y-[5px] px-2 py-0 pb-[5px] align-middle text-left">
          {rows.map((row) => (
            <div
              key={row.id}
              className="relative my-[5px] flex h-8 items-center justify-start whitespace-nowrap"
            >
              <Select
                value={row.assigneeId ?? "__unassigned__"}
                onValueChange={(value) => {
                  if (value === "__unassigned__" || value === "__remove__") {
                    updateAssignment(row.id, {
                      assigneeId: undefined,
                      assigneeName: undefined,
                      status: "Not Started Yet",
                    });
                    return;
                  }
                  const employee = employees.find((item) => item.id === value);
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
                          ? "In Progress – 0%"
                          : row.status,
                    });
                  }
                }}
              >
                <SelectTrigger
                  aria-label={`Assigned To for ${row.siteName}`}
                  className={`h-8 w-[150px] rounded-full py-0 px-3 text-xs font-semibold shadow-sm focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-75 ${
                    row.assigneeId
                      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100/60 hover:border-red-300 [&>svg]:text-red-600"
                      : "border-slate-200 bg-slate-100 text-slate-500 hover:border-red-200 hover:bg-red-50/40 hover:text-red-600"
                  }`}
                >
                  <SelectValue placeholder="Unassigned">
                    {compactAssigneeName(
                      row.assigneeName,
                      row.assigneeId,
                      employees
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[170px] rounded-xl border-red-100 bg-white p-1.5 shadow-xl shadow-red-950/10 data-[state=open]:animate-none data-[state=closed]:animate-none">
                  <SelectItem
                    value="__unassigned__"
                    className="cursor-pointer rounded-lg py-2 text-xs font-semibold text-slate-600 focus:bg-red-50 focus:text-red-700"
                  >
                    Unassigned
                  </SelectItem>
                  {employees.map((employee) => (
                    <SelectItem
                      key={employee.id}
                      value={employee.id}
                      className="cursor-pointer rounded-lg py-2 text-xs font-semibold text-slate-700 focus:bg-red-50 focus:text-red-700 data-[state=checked]:text-red-700 data-[state=checked]:font-bold"
                    >
                      {compactAssigneeName(employee.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </td>
        <td className="space-y-[5px] px-2 py-0 pb-[5px] whitespace-nowrap">
          {rows.map((row) => (
            <div
              key={row.id}
              className="my-[5px] flex h-8 items-center justify-start"
            >
              <div
                className={`relative inline-flex items-center rounded-full border px-2.5 shadow-sm ${
                  row.status === "Completed"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : row.status === "On Hold" || row.status === "On Hold"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : row.status === "Not Started Yet"
                    ? "border-slate-200 bg-slate-100 text-slate-600"
                    : row.status === "QC Pending"
                    ? "border-teal-200 bg-teal-50 text-teal-700"
                    : row.status === "In Progress – 25%" ||
                      row.status === "In Progress – 25%"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : row.status === "In Progress – 45%" ||
                      row.status === "In Progress – 45%"
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : row.status === "In Progress – 80%" ||
                      row.status === "In Progress – 80%"
                    ? "border-purple-200 bg-purple-50 text-purple-700"
                    : "border-violet-200 bg-violet-50 text-violet-700"
                }`}
              >
                <Select
                  value={row.status}
                  onValueChange={(value) =>
                    handleStatusChange(row, value as Assignment["status"])
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
                      value="In Progress – 0%"
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
                      value="In Progress – 25%"
                      className="cursor-pointer rounded-lg py-2 pl-8 text-xs font-semibold text-blue-700 focus:bg-transparent focus:text-blue-700"
                    >
                      In Progress – 25%
                    </SelectItem>
                    <SelectItem
                      value="In Progress – 45%"
                      className="cursor-pointer rounded-lg py-2 pl-8 text-xs font-semibold text-indigo-700 focus:bg-transparent focus:text-indigo-700"
                    >
                      In Progress – 45%
                    </SelectItem>
                    <SelectItem
                      value="In Progress – 80%"
                      className="cursor-pointer rounded-lg py-2 pl-8 text-xs font-semibold text-purple-700 focus:bg-transparent focus:text-purple-700"
                    >
                      In Progress – 80%
                    </SelectItem>
                    <SelectItem
                      value="QC Pending"
                      className="cursor-pointer rounded-lg py-2 pl-8 text-xs font-semibold text-teal-700 focus:bg-transparent focus:text-teal-700"
                    >
                      QC Pending
                    </SelectItem>

                    <SelectItem
                      value="On Hold"
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
        <td className="w-[52px] space-y-[5px] px-0.5 py-0 pb-[5px] align-middle text-left">
          {rows.map((row) => (
            <div
              key={row.id}
              className="my-[5px] flex h-8 items-center justify-start"
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
                    onClick={() => handleOpenEditSiteModal(rows)}
                    className="cursor-pointer rounded-lg text-xs"
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5 text-blue-600" />
                    Change Site
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
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-3">
        <div className="relative flex flex-wrap items-center justify-between gap-3 bg-slate-50 pb-2.5 before:absolute before:bottom-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-b before:border-slate-200 before:content-['']">
          <div>
            <h3 className="w-fit bg-gradient-to-r from-blue-700 via-violet-600 to-fuchsia-500 bg-[length:200%_100%] bg-clip-text text-lg font-extrabold text-transparent animate-gradient-flow">
              Projects &amp; Sites
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="border border-indigo-950 bg-[#172554] text-amber-300 shadow-lg shadow-indigo-950/20 hover:border-indigo-500 hover:bg-indigo-900 hover:text-amber-200"
              onClick={() => setReportSectionOpen((open) => !open)}
              title="Open completed sites report"
              aria-label="Open completed sites report"
              aria-expanded={reportSectionOpen}
            >
              <Mail className="h-4 w-4 text-amber-300" />
            </Button>
            <MonthNavigator
              month={month}
              year={year}
              onChange={(m, y) => {
                setMonth(m);
                setYear(y);
                  const currentDate = new Date();
                  if (y === currentDate.getFullYear() && m === currentDate.getMonth()) {
                    const todayStr = getLocalDateString(currentDate);
                    setReportFrom(todayStr);
                    setReportTo(todayStr);
                  } else {
                    const firstDay = new Date(y, m, 1);
                    const lastDay = new Date(y, m + 1, 0);
                    setReportFrom(getLocalDateString(firstDay));
                    setReportTo(getLocalDateString(lastDay));
                  }
                persistDraft({ month: m, year: y });
              }}
            />
          </div>
        </div>

        {reportSectionOpen && (
          <Card className="border-blue-100 bg-blue-50/40">
            <div className="flex flex-wrap items-end gap-3 p-3">
              <div className="space-y-1">
                <Label htmlFor="report-from" className="text-xs text-blue-900">
                  From Date
                </Label>
                <Input
                  id="report-from"
                  type="date"
                  value={reportFrom}
                  onChange={(e) => setReportFrom(e.target.value)}
                  className="h-9 w-[155px] bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="report-to" className="text-xs text-blue-900">
                  To Date
                </Label>
                <Input
                  id="report-to"
                  type="date"
                  value={reportTo}
                  onChange={(e) => setReportTo(e.target.value)}
                  className="h-9 w-[155px] bg-white"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const todayStr = getLocalDateString(new Date());
                  setReportFrom(todayStr);
                  setReportTo(todayStr);
                }}
                className="h-9 border-blue-200 bg-white text-blue-700 hover:bg-white hover:text-blue-700 text-xs font-semibold shadow-2xs"
                title="Set both From Date and To Date to Today"
              >
                Today
              </Button>
              <Button
                onClick={openReportConfirmation}
                disabled={reportSending}
                className="h-9 bg-blue-700 hover:bg-blue-800 gap-1.5"
              >
                <Mail className="h-4 w-4" />
                {reportSending ? "Sending…" : "Send Mail"}
              </Button>
              <Button
                variant="outline"
                onClick={exportCompletedSitesExcel}
                className="h-9 border-blue-300 bg-white text-blue-800 hover:bg-white hover:text-blue-800 gap-1.5"
                title="Download completed sites directly as an Excel spreadsheet"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export Excel ({reportRecords.length})
              </Button>
            </div>
          </Card>
        )}

        {/* Tab Filter & Actions Section */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-semibold shadow-2xs">
            {/* ALL Tab */}
            <button
              type="button"
              onClick={() => setUserSelectedTab("all")}
              className={`relative rounded-md px-2.5 py-1 cursor-pointer select-none border transition-colors ${
                activeTab === "all"
                  ? "border-blue-600 bg-white text-blue-700 font-bold shadow-2xs"
                  : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white/80 hover:text-blue-700"
              }`}
            >
              <span className="flex items-center gap-1">
                <span>ALL</span>
                <span
                  className={`inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10.5px] font-semibold transition-colors ${
                    activeTab === "all"
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "bg-slate-200/70 text-slate-600"
                  }`}
                >
                  ({filtered.length})
                </span>
              </span>
            </button>

            {/* In Progress Tab */}
            <button
              type="button"
              onClick={() => setUserSelectedTab("in_progress")}
              className={`relative rounded-md px-2.5 py-1 cursor-pointer select-none border transition-colors ${
                activeTab === "in_progress"
                  ? "border-[#7c3aed] bg-white text-[#7c3aed] font-bold shadow-2xs"
                  : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white/80 hover:text-[#7c3aed]"
              }`}
            >
              <span className="flex items-center gap-1">
                <span>In Progress</span>
                <span
                  className={`inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10.5px] font-semibold transition-colors ${
                    activeTab === "in_progress"
                      ? "bg-purple-100 text-purple-700 border border-purple-200"
                      : "bg-slate-200/70 text-slate-600"
                  }`}
                >
                  ({inProgressAssignmentsCount})
                </span>
              </span>
            </button>

            {/* Completed Tab */}
            <button
              type="button"
              onClick={() => setUserSelectedTab("completed")}
              className={`relative rounded-md px-2.5 py-1 cursor-pointer select-none border transition-colors ${
                activeTab === "completed"
                  ? "border-emerald-600 bg-white text-emerald-700 font-bold shadow-2xs"
                  : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white/80 hover:text-emerald-700"
              }`}
            >
              <span className="flex items-center gap-1">
                <span>Completed</span>
                <span
                  className={`inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10.5px] font-semibold transition-colors ${
                    activeTab === "completed"
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-slate-200/70 text-slate-600"
                  }`}
                >
                  ({completedAssignmentsCount})
                </span>
              </span>
            </button>
          </div>

          <div className="flex flex-1 sm:flex-initial items-center justify-end gap-2">
            {/* Site Search Bar */}
            <div className="relative w-36 sm:w-44 md:w-52 max-w-full">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                id="site-search-bar"
                type="text"
                placeholder="Search sites..."
                value={siteSearch}
                onChange={(e) => setSiteSearch(e.target.value)}
                className="h-8 w-full rounded-md border border-slate-300 bg-white pl-7 pr-6 text-xs text-black placeholder:text-slate-400 focus-visible:border-blue-600 focus-visible:ring-1 focus-visible:ring-blue-600 shadow-2xs"
              />
              {siteSearch && (
                <button
                  type="button"
                  onClick={() => setSiteSearch("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600"
                  title="Clear search"
                  aria-label="Clear site search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              id="add-site-allocation-btn"
              onClick={() => setAllocationFormOpen((open) => !open)}
              className="flex h-8 shrink-0 items-center gap-2 rounded-full border border-blue-600 bg-white pl-1.5 pr-3 py-1 text-left text-sm font-semibold text-blue-700 shadow-xs transition-colors hover:bg-blue-50"
              aria-expanded={allocationFormOpen}
            >
              <span className="flex items-center gap-2 font-semibold">
                <span className="relative flex h-5.5 w-5.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                  <span
                    className={`absolute inset-0 rounded-full bg-emerald-400 opacity-60 ${
                      !allocationFormOpen ? "animate-slow-ping" : ""
                    }`}
                  />
                  <Plus className="relative h-3.5 w-3.5 stroke-[2.5]" />
                </span>
                <span className="text-sm font-bold text-blue-700">Add</span>
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-blue-600 transition-transform duration-300 ${
                  allocationFormOpen ? "rotate-180" : "animate-slow-bounce"
                }`}
              />
            </button>
          </div>
        </div>
        {allocationFormOpen && (
          <Card className="relative z-30 overflow-visible shadow-md">
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

              <div className="relative z-20 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 hidden grid-cols-[1fr_1fr_auto] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                  <span className="text-cyan-800">Site Name</span>
                  <span className="text-pink-800">Select Assignee</span>
                  <span className="w-10" />
                </div>
                <div className="space-y-2">
                  {sites.map((s, sIdx) => (
                    <div
                      key={s.id}
                      style={{ zIndex: sites.length - sIdx + 10 }}
                      className="relative grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-start"
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
        <Card className="relative z-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-0.5 text-sm">
              <thead
                className={`text-center text-white transition-colors duration-300 ${
                  activeTab === "in_progress"
                    ? "bg-gradient-to-r from-purple-600 via-[#7c3aed] to-violet-600"
                    : activeTab === "completed"
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600"
                    : "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700"
                }`}
              >
                <tr>
                  <th
                    className="px-4 py-3 text-left font-semibold whitespace-nowrap truncate max-w-[160px]"
                    title={
                      sortField === "project"
                        ? `Sorted by Project (${
                            sortDirection === "asc" ? "A to Z" : "Z to A"
                          }) - click to reverse`
                        : "Click to sort by Project"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => handleSort("project")}
                      className="group inline-flex items-center justify-start gap-1.5 font-semibold text-white hover:text-white/80 transition-colors focus:outline-none cursor-pointer"
                      aria-label={`Sort by Project, currently ${
                        sortField === "project"
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : "unsorted"
                      }`}
                    >
                      <span>Project</span>
                      {sortField === "project" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-4 w-4 shrink-0 text-amber-300" />
                        ) : (
                          <ArrowDown className="h-4 w-4 shrink-0 text-amber-300" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                      )}
                    </button>
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold whitespace-nowrap max-w-[170px]"
                      title="Site"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSort("site")}
                        className="group inline-flex items-center gap-1.5 font-semibold text-white hover:text-white/80 transition-colors focus:outline-none"
                        aria-label={`Sort by Site date, currently ${
                          sortField === "site"
                            ? sortDirection === "asc" ? "oldest first" : "newest first"
                            : "unsorted"
                        }`}
                        title="Sort Site by date"
                      >
                        <span>Site</span>
                        {sortField === "site" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-4 w-4 text-amber-300" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-amber-300" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-60" />
                        )}
                      </button>
                    </div>
                  </th>
                  {activeTab !== "in_progress" && <th
                    className="px-4 py-3 text-left font-semibold whitespace-nowrap truncate max-w-[160px]"
                    title="Unit / Qty"
                  >
                    Unit / Qty
                  </th>}
                  {activeTab !== "in_progress" && <th
                    className="px-4 py-3 text-left font-semibold whitespace-nowrap truncate max-w-[160px]"
                    title="Amount"
                  >
                    Amount
                  </th>}
                  <th
                    className="px-4 py-3 text-left font-semibold whitespace-nowrap truncate max-w-[160px]"
                    title="Assigned To"
                  >
                    Assigned To
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold whitespace-nowrap truncate max-w-[160px]"
                    title={
                      sortField === "status"
                        ? `Sorted by Status (${
                            sortDirection === "asc"
                              ? "In Progress → Not Yet Started → Completed"
                              : "Completed → Not Yet Started → In Progress"
                          }) - click to reverse`
                        : "Click to sort by Status"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => handleSort("status")}
                      className="group inline-flex items-center justify-start gap-1.5 font-semibold text-white hover:text-white/80 transition-colors focus:outline-none cursor-pointer"
                      aria-label={`Sort by Status, currently ${
                        sortField === "status"
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : "unsorted"
                      }`}
                    >
                      <span>Status</span>
                      {sortField === "status" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-4 w-4 shrink-0 text-amber-300" />
                        ) : (
                          <ArrowDown className="h-4 w-4 shrink-0 text-amber-300" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                      )}
                    </button>
                  </th>
                  <th
                    className="w-[52px] px-0.5 py-3 text-center font-semibold whitespace-nowrap"
                    aria-label="Actions"
                  />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === "in_progress" ? 5 : 7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      {siteSearch.trim() ? (
                        <div className="space-y-1">
                          <p className="font-medium text-slate-700">
                            No sites found matching "{siteSearch.trim()}"
                          </p>
                          <p className="text-xs text-slate-500">
                            Check your spelling or clear the search query.
                          </p>
                        </div>
                      ) : (
                        "No projects for this month."
                      )}
                    </td>
                  </tr>
                ) : activeTab === "all" ? (
                  <>
                    {/* In Progress Section Header */}
                    <tr className="border-y border-purple-200 bg-purple-50/90 text-left font-semibold">
                      <td colSpan={activeTab === "in_progress" ? 5 : 7} className="px-4 py-2">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-700">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-purple-500 shadow-xs" />
                            <span>In Progress</span>
                            <span className="text-[11px] font-medium text-purple-600 lowercase">
                              ({inProgressProjectsCount} project
                              {inProgressProjectsCount === 1 ? "" : "s"} ·{" "}
                              {inProgressGrouped.length} site
                              {inProgressGrouped.length === 1 ? "" : "s"})
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {inProgressGrouped.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeTab === "in_progress" ? 5 : 7}
                          className="px-4 py-4 text-center text-xs text-muted-foreground italic"
                        >
                          {siteSearch.trim()
                            ? `No in-progress sites matching "${siteSearch.trim()}".`
                            : "No in-progress projects for this month."}
                        </td>
                      </tr>
                    ) : (
                      inProgressGrouped.map((rows, index) =>
                        renderSiteRow(rows, index)
                      )
                    )}

                    {/* Completed Section Header */}
                    <tr className="border-y border-emerald-200 bg-emerald-50/90 text-left font-semibold">
                          <td colSpan={activeTab === "in_progress" ? 5 : 7} className="px-4 py-2">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-800">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-600 shadow-xs" />
                            <span>Completed</span>
                            <span className="text-[11px] font-medium text-emerald-700 lowercase">
                              ({completedProjectsCount} project
                              {completedProjectsCount === 1 ? "" : "s"} ·{" "}
                              {completedGrouped.length} site
                              {completedGrouped.length === 1 ? "" : "s"})
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {completedGrouped.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeTab === "in_progress" ? 5 : 7}
                          className="px-4 py-4 text-center text-xs text-muted-foreground italic"
                        >
                          {siteSearch.trim()
                            ? `No completed sites matching "${siteSearch.trim()}".`
                            : "No completed projects for this month yet."}
                        </td>
                      </tr>
                    ) : (
                      completedGrouped.map((rows, index) =>
                        renderSiteRow(rows, index)
                      )
                    )}
                  </>
                ) : activeTab === "in_progress" ? (
                  inProgressGrouped.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeTab === "in_progress" ? 5 : 7}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        {siteSearch.trim() ? (
                          <div className="space-y-1">
                            <p className="font-medium text-slate-700">
                              No in-progress sites found matching "{siteSearch.trim()}"
                            </p>
                            <p className="text-xs text-slate-500">
                              Try checking other tabs or clear your search.
                            </p>
                          </div>
                        ) : (
                          "No in-progress projects for this month."
                        )}
                      </td>
                    </tr>
                  ) : (
                    inProgressGrouped.map((rows, index) =>
                      renderSiteRow(rows, index)
                    )
                  )
                ) : completedGrouped.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === "in_progress" ? 5 : 7}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      {siteSearch.trim() ? (
                        <div className="space-y-1">
                          <p className="font-medium text-slate-700">
                            No completed sites found matching "{siteSearch.trim()}"
                          </p>
                          <p className="text-xs text-slate-500">
                            Try checking other tabs or clear your search.
                          </p>
                        </div>
                      ) : (
                        "No completed projects for this month yet."
                      )}
                    </td>
                  </tr>
                ) : (
                  completedGrouped.map((rows, index) =>
                    renderSiteRow(rows, index)
                  )
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
      <Dialog
        open={reportModalOpen}
        onOpenChange={(open) => !reportSending && setReportModalOpen(open)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Completed Sites Report</DialogTitle>
            <DialogDescription>
              Export or email the summary of completed sites for the selected dates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/80 text-xs">
              <span className="text-slate-500 font-medium">Date range</span>
              <span className="font-semibold text-slate-800">{reportFrom} to {reportTo}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/80 text-xs">
              <span className="text-slate-500 font-medium">Completed sites</span>
              <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {reportRecords.length} site{reportRecords.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/80 text-xs">
              <span className="text-slate-500 font-medium">Total Value</span>
              <span className="font-bold text-emerald-700">₹{reportTotalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center py-1 text-xs">
              <span className="text-slate-500 font-medium">Recipient</span>
              <span className="font-medium text-slate-700 truncate max-w-[240px]">
                {user?.email || "kaushikdalvi91@gmail.com"}
              </span>
            </div>
          </div>

          {/* Quick 1-Click Export & Direct Send Options */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Instant Options:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="justify-start gap-2 h-11 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-900 font-medium text-xs shadow-2xs"
                onClick={exportCompletedSitesExcel}
              >
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-left leading-tight">
                  <div className="font-bold">Download Excel (.xlsx)</div>
                  <div className="text-[10px] text-emerald-700 font-normal">Instant file download</div>
                </div>
              </Button>

              <a
                href={getGmailComposeUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-start gap-2 h-11 px-3 border border-red-200 bg-red-50/40 hover:bg-red-100/70 text-red-900 font-medium text-xs rounded-md shadow-2xs transition-colors"
              >
                <Mail className="h-5 w-5 text-red-600 shrink-0" />
                <div className="text-left leading-tight">
                  <div className="font-bold flex items-center gap-1">
                    Send via Gmail <ExternalLink className="h-3 w-3 inline opacity-70" />
                  </div>
                  <div className="text-[10px] text-red-700 font-normal">Pre-filled in new tab</div>
                </div>
              </a>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-slate-600 hover:text-slate-900 gap-1.5 px-2"
                onClick={handleCopyReportText}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Summary Text
              </Button>

              <a
                href={getMailtoUrl()}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600"
              >
                <span>Other mail client</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {reportErrorDetail && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">Resend Email Service Notice</p>
                  <p className="text-amber-800 leading-relaxed">
                    Resend rejects sending from <code>@gmail.com</code> because public webmail domains cannot be verified in DNS.
                    In Supabase Secrets, set <code>REPORT_FROM_EMAIL</code> to <code>Civique Arts &lt;onboarding@resend.dev&gt;</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row justify-between items-center gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReportModalOpen(false)}
              disabled={reportSending}
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => void sendCompletedSitesReport()}
              disabled={reportSending}
              className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              {reportSending ? "Sending via Resend…" : "Send via Resend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={editSiteModalOpen}
        onOpenChange={(open) => {
          if (!open && !isSavingSiteChange) {
            setEditSiteModalOpen(false);
            setEditingSiteRows(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <Pencil className="h-4 w-4 text-blue-600" />
              Change Site Name
            </DialogTitle>
          </DialogHeader>

          {editingSiteRows && editingSiteRows[0] && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Project:</span>
                  <span className="font-semibold text-slate-800">
                    {editingSiteRows[0].projectName}
                  </span>
                </div>
                {editingSiteRows[0].clientName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Client:</span>
                    <span className="font-medium text-slate-700">
                      {editingSiteRows[0].clientName}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current Site Name:</span>
                  <span className="font-semibold text-blue-700">
                    {editingSiteRows[0].siteName}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Select Site Name from Dropdown <span className="text-destructive">*</span>
                </label>
                <SearchableSelect
                  value={selectedSiteId}
                  onChange={(siteId) => {
                    setSelectedSiteId(siteId);
                    const found = availableSites.find((s) => s.id === siteId);
                    if (found) {
                      setSelectedSiteName(found.name);
                    }
                  }}
                  options={editModalSiteOptions}
                  placeholder="Select site name from dropdown..."
                  emptyActionLabel="Add Site Name"
                  onEmptyAction={async (query) => {
                    const trimmed = query.trim();
                    if (!trimmed || !editingSiteRows || !editingSiteRows[0]) {
                      toast.error("Site name is required");
                      return;
                    }
                    const newSite = await upsertSite(
                      editingSiteRows[0].projectId,
                      trimmed
                    );
                    if (newSite) {
                      setSelectedSiteId(newSite.id);
                      setSelectedSiteName(newSite.name);
                      toast.success(`Added "${newSite.name}"`);
                    }
                  }}
                />
              </div>

            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditSiteModalOpen(false);
                setEditingSiteRows(null);
              }}
              disabled={isSavingSiteChange}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSaveSiteChange}
              disabled={isSavingSiteChange || !selectedSiteName.trim()}
            >
              {isSavingSiteChange ? "Updating…" : "Save Site Name"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default Assignments;
