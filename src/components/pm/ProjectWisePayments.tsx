import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Users,
  Building2,
  CheckCircle2,
  ExternalLink,
  ChevronsUpDown,
} from "lucide-react";
import { formatINR, formatNumber } from "@/lib/pmFormat";
import { MONTH_NAMES } from "@/components/pm/MonthNavigator";
import { Assignment, Employee } from "@/types/pm";
import {
  calculateProjectWisePayments,
  ProjectWisePaymentSummary,
} from "@/lib/projectWisePayments";
import ExcelJS from "exceljs";
import { toast } from "sonner";

interface ProjectWisePaymentsProps {
  month: number;
  year: number;
  assignments: Assignment[];
  employees: Employee[];
  onSelectAssigneeForSlip?: (employeeId: string) => void;
}

export default function ProjectWisePayments({
  month,
  year,
  assignments,
  employees: _employees,
  onSelectAssigneeForSlip,
}: ProjectWisePaymentsProps) {
  const [search, setSearch] = useState("");
  const [timeScope, setTimeScope] = useState<"month" | "all">("month");
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  // Filter assignments based on selected timeScope
  const relevantAssignments = useMemo(() => {
    if (timeScope === "month") {
      return assignments.filter(
        (a) => a.month === month && a.year === year && a.status === "Completed"
      );
    }
    return assignments.filter((a) => a.status === "Completed");
  }, [assignments, month, year, timeScope]);

  // Aggregate project-wise summaries
  const projectSummaries = useMemo(() => {
    return calculateProjectWisePayments(relevantAssignments);
  }, [relevantAssignments]);

  // Filter by search query
  const filteredSummaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projectSummaries;
    return projectSummaries.filter((p) => {
      const matchProject = p.projectName.toLowerCase().includes(q);
      const matchClient = p.clientName?.toLowerCase().includes(q);
      const matchEmployee = p.employees.some((e) =>
        e.employeeName.toLowerCase().includes(q)
      );
      const matchSite = p.employees.some((e) =>
        e.items.some((i) => i.siteName.toLowerCase().includes(q))
      );
      return matchProject || matchClient || matchEmployee || matchSite;
    });
  }, [projectSummaries, search]);

  // Overall totals
  const totalPaid = useMemo(
    () => projectSummaries.reduce((sum, p) => sum + p.totalAmount, 0),
    [projectSummaries]
  );
  const totalSites = useMemo(
    () => projectSummaries.reduce((sum, p) => sum + p.totalSites, 0),
    [projectSummaries]
  );
  const uniqueEmployeeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of projectSummaries) {
      for (const e of p.employees) {
        if (e.employeeId) ids.add(e.employeeId);
        else if (e.employeeName) ids.add(e.employeeName);
      }
    }
    return ids.size;
  }, [projectSummaries]);

  const toggleProject = (key: string) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAll = () => {
    const allExpanded = filteredSummaries.every(
      (p) => expandedProjects[p.projectId || p.projectName]
    );
    const next: Record<string, boolean> = {};
    if (!allExpanded) {
      for (const p of filteredSummaries) {
        next[p.projectId || p.projectName] = true;
      }
    }
    setExpandedProjects(next);
  };

  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Project Payouts");

      ws.columns = [
        { header: "Project Name", key: "project", width: 28 },
        { header: "Client Name", key: "client", width: 22 },
        { header: "Employee Name", key: "employee", width: 24 },
        { header: "Site Name", key: "site", width: 26 },
        { header: "Unit", key: "unit", width: 14 },
        { header: "Quantity", key: "qty", width: 12 },
        { header: "Rate (₹)", key: "rate", width: 14 },
        { header: "Amount (₹)", key: "amount", width: 16 },
      ];

      for (const p of projectSummaries) {
        for (const emp of p.employees) {
          for (const item of emp.items) {
            ws.addRow({
              project: p.projectName,
              client: p.clientName || "-",
              employee: emp.employeeName,
              site: item.siteName,
              unit: item.unitType || "-",
              qty: item.quantity,
              rate: item.rate,
              amount: item.amount,
            });
          }
        }
      }

      // Add summary row
      const totalRow = ws.addRow({
        project: "TOTAL",
        client: "",
        employee: "",
        site: "",
        unit: "",
        qty: "",
        rate: "",
        amount: totalPaid,
      });
      totalRow.font = { bold: true };

      // Header styling
      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF92400E" }, // amber-800
      };

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const monthLabel =
        timeScope === "month"
          ? `${MONTH_NAMES[month]}_${year}`
          : `All_Months_${year}`;
      a.download = `Project_Wise_Employee_Payments_${monthLabel}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel report exported successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Excel report");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Building2 className="h-4 w-4 text-amber-700" />
            <span>Total Payout</span>
          </div>
          <p className="mt-1.5 font-mono text-xl font-bold tracking-tight text-slate-900">
            {formatINR(totalPaid)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {timeScope === "month"
              ? `In ${MONTH_NAMES[month]} ${year}`
              : "All time total"}
          </p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Briefcase className="h-4 w-4 text-amber-700" />
            <span>Active Projects</span>
          </div>
          <p className="mt-1.5 font-mono text-xl font-bold tracking-tight text-slate-900">
            {projectSummaries.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">With completed work</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Users className="h-4 w-4 text-amber-700" />
            <span>Employees Paid</span>
          </div>
          <p className="mt-1.5 font-mono text-xl font-bold tracking-tight text-slate-900">
            {uniqueEmployeeIds}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Assigned & completed</p>
        </Card>

        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-amber-700" />
            <span>Completed Sites</span>
          </div>
          <p className="mt-1.5 font-mono text-xl font-bold tracking-tight text-slate-900">
            {totalSites}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total site deliverables</p>
        </Card>
      </div>

      {/* Control Bar */}
      <Card className="p-3 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project, client, or employee name..."
              className="pl-9 h-9 text-sm text-black border-slate-200"
            />
          </div>

          {/* Action buttons & Scope toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-100 text-xs font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setTimeScope("month")}
                className={`px-3 py-1 rounded transition-colors ${
                  timeScope === "month"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "hover:text-slate-900"
                }`}
              >
                {MONTH_NAMES[month]} {year}
              </button>
              <button
                type="button"
                onClick={() => setTimeScope("all")}
                className={`px-3 py-1 rounded transition-colors ${
                  timeScope === "all"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "hover:text-slate-900"
                }`}
              >
                All Months
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleAll}
              className="h-8 gap-1.5 text-xs border-slate-200"
            >
              <ChevronsUpDown className="h-3.5 w-3.5 text-slate-500" />
              Toggle All
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-8 gap-1.5 text-xs border-slate-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              Export Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Projects List / Table */}
      {filteredSummaries.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-200 bg-white">
          <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
          <h4 className="mt-3 text-sm font-semibold text-slate-800">
            No completed project payments found
          </h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {search
              ? "No projects or employees match your search query."
              : `There are no completed project assignments for ${
                  timeScope === "month"
                    ? `${MONTH_NAMES[month]} ${year}`
                    : "the selected period"
                }.`}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredSummaries.map((summary) => {
            const projectKey = summary.projectId || summary.projectName;
            const isExpanded = !!expandedProjects[projectKey];
            const percentageOfTotal =
              totalPaid > 0
                ? Math.round((summary.totalAmount / totalPaid) * 100)
                : 0;

            return (
              <Card
                key={projectKey}
                className="overflow-hidden border-slate-200 bg-white transition-all shadow-xs"
              >
                {/* Project Header Row */}
                <div
                  onClick={() => toggleProject(projectKey)}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 cursor-pointer hover:bg-slate-50/70 select-none transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <button
                      type="button"
                      aria-label="Toggle details"
                      className="mt-0.5 sm:mt-0 p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-amber-700" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900 text-base">
                          {summary.projectName}
                        </h4>
                        {summary.clientName && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {summary.clientName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {summary.employees.length} Employee
                        {summary.employees.length === 1 ? "" : "s"} ·{" "}
                        {summary.totalSites} Site
                        {summary.totalSites === 1 ? "" : "s"} completed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-emerald-800">
                        {formatINR(summary.totalAmount)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {percentageOfTotal}% of monthly payout
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details: Employees in Project */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Employee Payment Breakdown
                      </h5>
                      <span className="text-xs text-slate-400">
                        {summary.employees.length} recipient
                        {summary.employees.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600">
                            <th className="px-3 py-2 font-semibold">Employee</th>
                            <th className="px-3 py-2 font-semibold">
                              Completed Sites
                            </th>
                            <th className="px-3 py-2 font-semibold text-right">
                              Total Quantity
                            </th>
                            <th className="px-3 py-2 font-semibold text-right">
                              Total Paid
                            </th>
                            <th className="px-3 py-2 font-semibold text-right">
                              Share
                            </th>
                            <th className="px-3 py-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {summary.employees.map((emp) => {
                            const empShare =
                              summary.totalAmount > 0
                                ? Math.round(
                                    (emp.totalAmount / summary.totalAmount) * 100
                                  )
                                : 0;

                            return (
                              <tr
                                key={emp.employeeId || emp.employeeName}
                                className="hover:bg-slate-50/70 transition-colors"
                              >
                                <td className="px-3 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                                  {emp.employeeName}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">
                                  {emp.items.map((it) => it.siteName).join(", ")}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                                  {formatNumber(emp.totalQuantity)}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-800 whitespace-nowrap">
                                  {formatINR(emp.totalAmount)}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-slate-500 whitespace-nowrap">
                                  {empShare}%
                                </td>
                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                  {onSelectAssigneeForSlip && emp.employeeId && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectAssigneeForSlip(emp.employeeId);
                                      }}
                                      className="h-7 px-2 text-[11px] text-amber-800 hover:text-amber-900 hover:bg-amber-50"
                                    >
                                      View Slip
                                      <ExternalLink className="ml-1 h-3 w-3" />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200 bg-slate-50/80 font-semibold text-slate-800">
                            <td className="px-3 py-2">Total for Project</td>
                            <td className="px-3 py-2 text-slate-500">
                              {summary.totalSites} sites
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {formatNumber(
                                summary.employees.reduce(
                                  (s, e) => s + e.totalQuantity,
                                  0
                                )
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-800">
                              {formatINR(summary.totalAmount)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">100%</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
