import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import MonthNavigator, { MONTH_NAMES } from "@/components/pm/MonthNavigator";
import MultiSearchableSelect from "@/components/pm/MultiSearchableSelect";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  ArrowDown,
  Printer,
  FileText,
  Plus,
  Minus,
  Save,
  Trash2,
  Pencil,
  Loader2,
  X,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatNumber } from "@/lib/pmFormat";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from "@/assets/logo.png";

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const belowThousandToWords = (value: number) => {
  const parts: string[] = [];
  if (value >= 100) parts.push(`${ONES[Math.floor(value / 100)]} Hundred`);
  const remainder = value % 100;
  if (remainder >= 20)
    parts.push(
      `${TENS[Math.floor(remainder / 10)]}${
        remainder % 10 ? ` ${ONES[remainder % 10]}` : ""
      }`
    );
  else if (remainder) parts.push(ONES[remainder]);
  return parts.join(" ");
};

const amountInWords = (amount: number) => {
  const totalPaise = Math.round(amount * 100);
  let rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  const parts: string[] = [];
  for (const [divisor, label] of [
    [10_000_000, "Crore"],
    [100_000, "Lakh"],
    [1_000, "Thousand"],
  ] as const) {
    const count = Math.floor(rupees / divisor);
    if (count) {
      parts.push(`${belowThousandToWords(count)} ${label}`);
      rupees %= divisor;
    }
  }
  if (rupees || parts.length === 0)
    parts.push(belowThousandToWords(rupees) || "Zero");
  return `${parts.join(" ")}${
    paise ? ` and Paise ${belowThousandToWords(paise)}` : ""
  } Rupees Only`;
};

interface OtherItem {
  id: string;
  project: string;
  site: string;
  unit: string;
  quantity: number;
  rate: number;
}

const DownloadInvoices = () => {
  const { employees, assignments, addInvoice } = useData();
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [slipDate, setSlipDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [otherItems, setOtherItems] = useState<OtherItem[]>([]);
  const [addedOtherIds, setAddedOtherIds] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pendingDownloadAssigneeId, setPendingDownloadAssigneeId] = useState<
    string | null
  >(null);
  const [pendingPrintAssigneeId, setPendingPrintAssigneeId] = useState<
    string | null
  >(null);
  const [showSlipPreview, setShowSlipPreview] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const assignee = employees.find((e) => e.id === assigneeId);
  const filtered = useMemo(
    () =>
      assignments.filter(
        (a) =>
          a.month === month &&
          a.year === year &&
          a.assigneeId === assigneeId &&
          a.status === "Completed"
      ),
    [assignments, month, year, assigneeId]
  );

  const monthCompletedAssignments = useMemo(
    () =>
      assignments.filter(
        (a) => a.month === month && a.year === year && a.status === "Completed"
      ),
    [assignments, month, year]
  );
  const monthTotal = monthCompletedAssignments.reduce(
    (sum, assignment) => sum + (assignment.amount ?? 0),
    0
  );
  const availableAssigneeIds = useMemo(
    () =>
      Array.from(
        new Set(
          monthCompletedAssignments
            .map((assignment) => assignment.assigneeId)
            .filter(Boolean)
        )
      ) as string[],
    [monthCompletedAssignments]
  );
  const addedOthers = otherItems.filter((item) =>
    addedOtherIds.includes(item.id)
  );
  const addedOthersTotal = addedOthers.reduce(
    (s, item) => s + item.quantity * item.rate,
    0
  );
  const totalQty =
    filtered.reduce((s, a) => s + (a.quantity || 0), 0) +
    addedOthers.reduce((s, item) => s + item.quantity, 0);
  const calculatedGrandTotal =
    filtered.reduce((s, a) => s + (a.amount ?? 0), 0) + addedOthersTotal;
  // Payment slips may differ by up to ₹1 because of line-item decimal precision.
  // Normalize those near-whole totals while keeping larger fractional values intact.
  const grandTotal =
    Math.abs(calculatedGrandTotal - Math.round(calculatedGrandTotal)) <= 1
      ? Math.round(calculatedGrandTotal)
      : calculatedGrandTotal;
  const invoiceNumber = `PS-${year}${String(month + 1).padStart(2, "0")}-${
    assigneeId.slice(-4).toUpperCase() || "----"
  }`;
  const invoiceDate = slipDate
    ? new Date(`${slipDate}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const createEmptyOther = (): OtherItem => ({
    id: crypto.randomUUID(),
    project: "",
    site: "",
    unit: "",
    quantity: 0,
    rate: 0,
  });

  const addOther = () =>
    setOtherItems((items) =>
      items.some((item) => !addedOtherIds.includes(item.id))
        ? items
        : [...items, createEmptyOther()]
    );

  const updateOther = (id: string, patch: Partial<OtherItem>) =>
    setOtherItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );

  const isOtherComplete = (item: OtherItem) =>
    Boolean(
      item.project.trim() &&
        item.site.trim() &&
        item.unit.trim() &&
        item.quantity > 0 &&
        item.rate > 0
    );

  const download = async () => {
    if (
      !invoiceRef.current ||
      (filtered.length === 0 && addedOthers.length === 0)
    )
      return;
    setIsDownloading(true);
    try {
      toast.info("Generating PDF...");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const canvas = await html2canvas(invoiceRef.current, {
        width: invoiceRef.current.scrollWidth,
        windowWidth: invoiceRef.current.scrollWidth,
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const pageHeight = Math.floor(canvas.width * (277 / 190));
      for (let page = 0, top = 0; top < canvas.height; page += 1) {
        if (page > 0) pdf.addPage();
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.min(pageHeight, canvas.height - top);
        slice.getContext("2d")!.drawImage(canvas, 0, -top);
        pdf.addImage(
          slice.toDataURL("image/jpeg", 0.95),
          "JPEG",
          10,
          10,
          190,
          (slice.height / canvas.width) * 190
        );
        top += slice.height;
      }
      const pageCount = pdf.getNumberOfPages();
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(170, 170, 170);
      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.text(`Page ${page} of ${pageCount}`, 200, 289, { align: "right" });
      }
      const filename = `${assignee?.name}_Payslip_${MONTH_NAMES[month]}_${year}.pdf`;
      pdf.save(filename);

      addInvoice({
        invoiceNumber,
        assigneeId,
        assigneeName: assignee!.name,
        month,
        year,
        generatedDate: new Date(`${slipDate}T00:00:00`).toISOString(),
        generatedBy: user || "user",
        total: grandTotal,
      });
      toast.success("Payment slip downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (!pendingDownloadAssigneeId || assigneeId !== pendingDownloadAssigneeId)
      return;
    void download().finally(() => setPendingDownloadAssigneeId(null));
    // The PDF must run after the selected assignee's preview renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDownloadAssigneeId, assigneeId]);

  useEffect(() => {
    if (!pendingPrintAssigneeId || assigneeId !== pendingPrintAssigneeId)
      return;
    printInvoice();
    setShowSlipPreview(false);
    setPendingPrintAssigneeId(null);
    // The print view needs the selected slip to render first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrintAssigneeId, assigneeId]);

  const previewForAssignee = (id: string) => {
    setAssigneeId(id);
    setShowSlipPreview(true);
    setShowOthers(false);
  };

  const addOtherForAssignee = (id: string) => {
    setAssigneeId(id);
    setShowOthers(true);
  };

  const previewAndDownloadForAssignee = (id: string) => {
    setAssigneeId(id);
    setShowSlipPreview(true);
    setShowOthers(false);
    setPendingPrintAssigneeId(id);
  };

  const printInvoice = () => {
    if (!invoiceRef.current) return;
    const printWindow = window.open("", "", "width=900,height=1200");
    if (!printWindow) return;
    const printableAssigneeName = (assignee?.name || "Assignee").replace(
      /[^a-z0-9]+/gi,
      "_"
    );
    const printTitle = `${printableAssigneeName}_Payslip_${MONTH_NAMES[month]}_${year}`;
    printWindow.document.write(`
      <html><head><title>${printTitle}</title>
      <style>
        @page{size:A4 portrait;margin:10mm;@bottom-right{content:"Page " counter(page) " of " counter(pages);color:#aaa;font:8pt Arial}}
        *{box-sizing:border-box}
        html,body{margin:0;padding:0;background:#fff}
        body{font-family:Arial,sans-serif}
        .payment-slip{width:190mm!important;min-height:277mm!important;padding:10mm!important;margin:0 auto!important;border:0!important;box-shadow:none!important;border-radius:0!important}
        .payment-slip-page-header{position:fixed;top:0;left:0;width:190mm;background:#fff;z-index:2}
        .payment-slip-page-body{padding-top:0}
        .payment-slip-page-body .payment-slip-table{margin-top:10px!important}
        .payment-slip-header,.payment-slip-company,.payment-slip-customer,.payment-slip-table{break-inside:avoid;page-break-inside:avoid}
        .payment-slip-table{width:100%;table-layout:fixed}
        .payment-slip-table thead{display:table-header-group}
        .payment-slip-table tr{break-inside:avoid;page-break-inside:avoid}
        .payment-slip-table .payment-slip-footer{break-inside:avoid;page-break-inside:avoid;display:table-row-group}
        .payment-slip-others,.payment-slip-others tr{break-inside:avoid;page-break-inside:avoid}
        .payment-slip-footer-table{break-inside:avoid;page-break-inside:avoid}
        @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.payment-slip{width:190mm!important}.payment-slip-page-header{position:static;width:190mm;background:#fff}.payment-slip-page-body{padding-top:0!important}.payment-slip-page-body .payment-slip-table{margin-top:10px!important}}
        ${
          document.head.innerHTML
            .match(/<style[^>]*>[\s\S]*?<\/style>/g)
            ?.join("") || ""
        }
      </style>
      </head><body>${invoiceRef.current.outerHTML}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-3">
        <div className="relative flex flex-wrap items-center justify-between gap-4 bg-slate-50 pb-4 before:absolute before:bottom-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-b before:border-slate-200 before:content-['']">
          <div>
            <h3 className="text-xl font-semibold text-yellow-800">
              Payment Slips
            </h3>
          </div>
          <MonthNavigator
            month={month}
            year={year}
            onChange={(m, y) => {
              setMonth(m);
              setYear(y);
            }}
          />
        </div>

        <Card className="mx-auto flex h-8 w-fit max-w-[calc(100vw-2rem)] items-center justify-center rounded-full border-slate-200 bg-slate-100/90 px-3 py-0 shadow-none">
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-800">
              Total payment for {MONTH_NAMES[month]} {year}
            </p>
            <p className="font-mono text-base font-semibold leading-none text-red-600">
              {formatINR(monthTotal)}
            </p>
          </div>
        </Card>

        <Card className="grid max-w-4xl gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-yellow-800">
              Assignees
            </label>
            <MultiSearchableSelect
              value={selectedAssigneeIds}
              onChange={(ids) => {
                setSelectedAssigneeIds(ids);
                setAssigneeId(ids[0] ?? "");
                setShowSlipPreview(false);
                setShowOthers(false);
              }}
              options={employees
                .filter((employee) =>
                  availableAssigneeIds.includes(employee.id)
                )
                .map((employee) => ({
                  id: employee.id,
                  label: employee.name,
                }))}
              placeholder="Select assignees"
            />
          </div>
          <div>
            <label
              htmlFor="slip-date"
              className="mb-1.5 block text-sm font-semibold text-amber-800"
            >
              Payment Slip Date
            </label>
            <input
              id="slip-date"
              type="date"
              value={slipDate}
              onChange={(e) => setSlipDate(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </Card>

        {selectedAssigneeIds.length > 0 && (
          <Card className="max-w-4xl overflow-hidden">
            <div className="border-b border-border bg-slate-50 px-4 py-2">
              <h4 className="text-sm font-semibold text-yellow-800">
                Selected payment slips
              </h4>
            </div>
            <div className="divide-y divide-border">
              {selectedAssigneeIds.map((id) => {
                const employee = employees.find((item) => item.id === id);
                const employeeAssignments = monthCompletedAssignments.filter(
                  (assignment) => assignment.assigneeId === id
                );
                const employeeTotal = employeeAssignments.reduce(
                  (sum, assignment) => sum + (assignment.amount ?? 0),
                  0
                );
                return (
                  <div
                    key={id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {employee?.name ?? "Unknown assignee"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {employeeAssignments.length} completed Site
                        {employeeAssignments.length === 1 ? "" : "s"} ·{" "}
                        {formatINR(employeeTotal)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addOtherForAssignee(id)}
                        className="h-8 gap-1.5 px-3 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 text-emerald-600" />
                        More
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (showSlipPreview && assigneeId === id) {
                            setShowSlipPreview(false);
                          } else {
                            previewForAssignee(id);
                          }
                        }}
                        disabled={
                          isDownloading || employeeAssignments.length === 0
                        }
                        className="h-8 px-3 text-xs"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5 text-violet-600" />
                        {showSlipPreview && assigneeId === id ? "Hide" : "Show"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => previewAndDownloadForAssignee(id)}
                        disabled={
                          isDownloading || employeeAssignments.length === 0
                        }
                        className="h-8 bg-blue-600 px-3 text-xs text-white hover:bg-blue-700"
                      >
                        <ArrowDown className="mr-1.5 h-3.5 w-3.5 animate-bounce text-white" />
                        Download
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {assigneeId && (showSlipPreview || showOthers) && (
          <>
            {showSlipPreview &&
            filtered.length === 0 &&
            addedOthers.length === 0 ? (
              <Card className="p-10 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  No completed projects found for the selected assignee and
                  month.
                </p>
              </Card>
            ) : (
              <>
                <Card className="space-y-4 border-slate-200/80 bg-white/95 p-4 shadow-lg shadow-slate-900/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-yellow-800">
                      Others
                    </h4>
                    {otherItems.filter(
                      (item) => !addedOtherIds.includes(item.id)
                    ).length === 0 && (
                      <Button
                        type="button"
                        onClick={addOther}
                        aria-label="Add other item"
                        title="Add other item"
                        className="h-8 w-8 rounded-full bg-violet-400 p-0 text-white hover:bg-violet-500"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {otherItems
                    .filter((item) => !addedOtherIds.includes(item.id))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="grid min-w-[620px] max-w-4xl grid-cols-[minmax(120px,1.5fr)_minmax(120px,1.5fr)_72px_60px_82px_96px_auto_auto] items-center gap-2"
                      >
                        <input
                          value={item.project}
                          placeholder="Project"
                          onChange={(e) =>
                            updateOther(item.id, { project: e.target.value })
                          }
                          className="h-9 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm"
                        />
                        <input
                          value={item.site}
                          placeholder="Site"
                          onChange={(e) =>
                            updateOther(item.id, { site: e.target.value })
                          }
                          className="h-9 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm"
                        />
                        <input
                          value={item.unit}
                          placeholder="Unit"
                          onChange={(e) =>
                            updateOther(item.id, { unit: e.target.value })
                          }
                          className="h-9 w-full rounded-lg border border-input bg-background px-2 text-center text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          placeholder="Qty"
                          onChange={(e) =>
                            updateOther(item.id, {
                              quantity: Math.max(
                                0,
                                Number(e.target.value) || 0
                              ),
                            })
                          }
                          className="h-9 w-full rounded-lg border border-input bg-background px-2 text-right text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          placeholder="Rate"
                          title="Rate (₹)"
                          onChange={(e) =>
                            updateOther(item.id, {
                              rate: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="h-9 w-full rounded-lg border border-input bg-background px-2 text-right text-sm"
                        />
                        <div
                          className="flex h-9 w-full items-center justify-end overflow-hidden rounded-lg border bg-muted px-2.5 text-sm font-medium"
                          aria-label="Amount (₹)"
                          title="Amount (₹)"
                        >
                          {formatINR(item.quantity * item.rate)}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setOtherItems((items) =>
                              items.filter((current) => current.id !== item.id)
                            );
                            setAddedOtherIds((ids) =>
                              ids.filter((id) => id !== item.id)
                            );
                          }}
                          aria-label="Delete draft other item"
                          title="Delete"
                          className="h-9 w-9 shrink-0 rounded-full bg-red-600 p-0 text-white hover:bg-red-700"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          disabled={!isOtherComplete(item)}
                          onClick={() => {
                            if (!isOtherComplete(item)) {
                              toast.error(
                                "Please complete all Other fields before adding."
                              );
                              return;
                            }
                            setAddedOtherIds((ids) =>
                              ids.includes(item.id) ? ids : [...ids, item.id]
                            );
                          }}
                          className="h-9 w-9 shrink-0 rounded-full p-0"
                          aria-label="Save other item"
                          title="Save"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </Card>
                {addedOtherIds.length > 0 && (
                  <Card className="overflow-x-auto border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5">
                    <h4 className="border-b border-border bg-slate-50/80 px-4 py-3 font-semibold text-yellow-800">
                      Added Others
                    </h4>
                    <table className="w-full text-sm">
                      <tbody>
                        {otherItems
                          .filter((item) => addedOtherIds.includes(item.id))
                          .map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-border last:border-0"
                            >
                              <td className="px-4 py-3">{item.project}</td>
                              <td className="px-4 py-3">{item.site}</td>
                              <td className="px-4 py-3">{item.unit}</td>
                              <td className="px-4 py-3 text-right">
                                {formatNumber(item.quantity)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {item.rate.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatINR(item.quantity * item.rate)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Open other item actions"
                                      className="h-8 w-8 rounded-full"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-32"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setShowOthers(true);
                                        addOther();
                                        window.scrollTo({
                                          top: 0,
                                          behavior: "smooth",
                                        });
                                      }}
                                    >
                                      <Plus className="mr-2 h-3.5 w-3.5" />
                                      More
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        window.scrollTo({
                                          top: 0,
                                          behavior: "smooth",
                                        })
                                      }
                                    >
                                      <Pencil className="mr-2 h-3.5 w-3.5" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setOtherItems((items) =>
                                          items.filter(
                                            (current) => current.id !== item.id
                                          )
                                        );
                                        setAddedOtherIds((ids) =>
                                          ids.filter((id) => id !== item.id)
                                        );
                                      }}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </Card>
                )}
                {showSlipPreview && (
                  <>
                    {/* Payment Slip Preview */}
                    <div
                      className={
                        showSlipPreview
                          ? "fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-slate-950/35 p-4 backdrop-blur-sm sm:p-8"
                          : "hidden"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setShowSlipPreview(false)}
                        className="fixed right-4 top-4 z-[51] rounded-full bg-white p-2.5 text-slate-700 shadow-lg transition-colors hover:bg-slate-100 sm:right-8 sm:top-8"
                        aria-label="Close payment slip preview"
                        title="Close preview"
                      >
                        <X className="h-6 w-6" />
                      </button>
                      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-[210mm] overflow-auto rounded-xl bg-white p-3 shadow-2xl sm:max-h-[calc(100vh-4rem)] sm:p-4">
                        <div
                          ref={invoiceRef}
                          className="payment-slip"
                          style={{
                            width: "190mm",
                            boxSizing: "border-box",
                            fontFamily: "Arial, sans-serif",
                          }}
                        >
                          <div className="payment-slip-page-header">
                            <div
                              className="payment-slip-header"
                              style={{
                                textAlign: "center",
                                fontWeight: "bold",
                                padding: "4px",
                                marginBottom: "6px",
                              }}
                            >
                              Payment Slip
                            </div>
                          </div>

                          <div className="payment-slip-page-body">
                            <div style={{ display: "flex", gap: 0 }}>
                              <div
                                className="payment-slip-company"
                                style={{
                                  flex: 2,
                                  border: "1px solid #666",
                                  padding: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <img
                                  src={logo}
                                  alt="Logo"
                                  style={{ height: 56, width: "auto" }}
                                  crossOrigin="anonymous"
                                />
                                <div>
                                  <h1 style={{ margin: 0, fontSize: 18 }}>
                                    Civique Arts
                                  </h1>
                                  <p style={{ margin: "3px 0", fontSize: 13 }}>
                                    Ground Floor Ghar No 214 Milkat No 2841
                                    Inamdar Wasti Koregaon Mul
                                  </p>
                                  <p style={{ margin: "3px 0", fontSize: 13 }}>
                                    <b>Phone:</b> 9011718351 &nbsp;&nbsp;{" "}
                                    <b>Email:</b> vijayc@civiquearts.com
                                  </p>
                                </div>
                              </div>
                              <div
                                className="payment-slip-company"
                                style={{
                                  flex: 1,
                                  border: "1px solid #666",
                                  borderLeft: "none",
                                  padding: "8px",
                                }}
                              >
                                <p style={{ margin: "3px 0", fontSize: 13 }}>
                                  <b>Payment Slip No.:</b> {invoiceNumber}
                                </p>
                                <p style={{ margin: "3px 0", fontSize: 13 }}>
                                  <b>Date:</b> {invoiceDate}
                                </p>
                              </div>
                            </div>

                            <div
                              className="payment-slip-customer"
                              style={{
                                border: "1px solid #666",
                                borderTop: "none",
                                padding: "8px",
                              }}
                            >
                              <b>Full Name:</b> {assignee?.name}
                              {assignee?.mobile ? ` · ${assignee.mobile}` : ""}
                            </div>
                            <table
                              className="payment-slip-table"
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                tableLayout: "fixed",
                                marginTop: 6,
                              }}
                            >
                              <colgroup>
                                <col style={{ width: "5.3%" }} />
                                <col style={{ width: "51.5%" }} />
                                <col style={{ width: "10.9%" }} />
                                <col style={{ width: "6.9%" }} />
                                <col style={{ width: "11.9%" }} />
                                <col style={{ width: "13.6%" }} />
                              </colgroup>
                              <thead>
                                <tr style={{ background: "#f2f2f2" }}>
                                  <th
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                    }}
                                  >
                                    #
                                  </th>
                                  <th
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      textAlign: "left",
                                    }}
                                  >
                                    Item Name
                                  </th>
                                  <th
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      textAlign: "right",
                                    }}
                                  >
                                    Quantity
                                  </th>
                                  <th
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      textAlign: "right",
                                    }}
                                  >
                                    Unit
                                  </th>
                                  <th
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      textAlign: "right",
                                    }}
                                  >
                                    Price (₹)
                                  </th>
                                  <th
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      textAlign: "right",
                                    }}
                                  >
                                    Amount (₹)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.map((a, i) => (
                                  <tr key={a.id}>
                                    <td
                                      style={{
                                        border: "1px solid #666",
                                        padding: 6,
                                        fontSize: 13,
                                      }}
                                    >
                                      {i + 1}
                                    </td>
                                    <td
                                      style={{
                                        border: "1px solid #666",
                                        padding: 6,
                                        fontSize: 13,
                                      }}
                                    >
                                      {a.siteName} - ({a.projectName})
                                    </td>
                                    <td
                                      style={{
                                        border: "1px solid #666",
                                        padding: 6,
                                        fontSize: 13,
                                        textAlign: "right",
                                      }}
                                    >
                                      {formatNumber(a.quantity || 0)}
                                    </td>
                                    <td
                                      style={{
                                        border: "1px solid #666",
                                        padding: 6,
                                        fontSize: 13,
                                      }}
                                    >
                                      {a.unitType}
                                    </td>
                                    <td
                                      style={{
                                        border: "1px solid #666",
                                        padding: 6,
                                        fontSize: 13,
                                        textAlign: "right",
                                      }}
                                    >
                                      {a.rate?.toFixed(2)}
                                    </td>
                                    <td
                                      style={{
                                        border: "1px solid #666",
                                        padding: 6,
                                        fontSize: 13,
                                        textAlign: "right",
                                      }}
                                    >
                                      {formatINR(a.amount || 0)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              {addedOthers.length > 0 && (
                                <tbody className="payment-slip-others">
                                  <tr>
                                    <td
                                      colSpan={6}
                                      style={{
                                        border: "1px solid #666",
                                        padding: 6,
                                        fontSize: 13,
                                        fontWeight: "bold",
                                        background: "#f2f2f2",
                                      }}
                                    >
                                      Others
                                    </td>
                                  </tr>
                                  {addedOthers.map((item, i) => (
                                    <tr key={item.id}>
                                      <td
                                        style={{
                                          border: "1px solid #666",
                                          padding: 6,
                                          fontSize: 13,
                                        }}
                                      >
                                        {filtered.length + i + 1}
                                      </td>
                                      <td
                                        style={{
                                          border: "1px solid #666",
                                          padding: 6,
                                          fontSize: 13,
                                        }}
                                      >
                                        {item.site} - ({item.project})
                                      </td>
                                      <td
                                        style={{
                                          border: "1px solid #666",
                                          padding: 6,
                                          fontSize: 13,
                                          textAlign: "right",
                                        }}
                                      >
                                        {formatNumber(item.quantity)}
                                      </td>
                                      <td
                                        style={{
                                          border: "1px solid #666",
                                          padding: 6,
                                          fontSize: 13,
                                        }}
                                      >
                                        {item.unit}
                                      </td>
                                      <td
                                        style={{
                                          border: "1px solid #666",
                                          padding: 6,
                                          fontSize: 13,
                                          textAlign: "right",
                                        }}
                                      >
                                        {item.rate.toFixed(2)}
                                      </td>
                                      <td
                                        style={{
                                          border: "1px solid #666",
                                          padding: 6,
                                          fontSize: 13,
                                          textAlign: "right",
                                        }}
                                      >
                                        {formatINR(item.quantity * item.rate)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              )}
                              <tbody>
                                <tr>
                                  <td
                                    colSpan={2}
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      fontWeight: "bold",
                                    }}
                                  >
                                    Total
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      textAlign: "right",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {formatNumber(totalQty)}
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                    }}
                                  />
                                  <td
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                    }}
                                  />
                                  <td
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      textAlign: "right",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {formatINR(grandTotal)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <table
                              className="payment-slip-table payment-slip-footer-table"
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                tableLayout: "fixed",
                                marginTop: 0,
                              }}
                            >
                              <colgroup>
                                <col style={{ width: "5.3%" }} />
                                <col style={{ width: "51.5%" }} />
                                <col style={{ width: "10.9%" }} />
                                <col style={{ width: "6.9%" }} />
                                <col style={{ width: "11.9%" }} />
                                <col style={{ width: "13.6%" }} />
                              </colgroup>
                              <tbody className="payment-slip-footer">
                                <tr>
                                  <td
                                    colSpan={5}
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      textAlign: "left",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    Sub Total
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      textAlign: "right",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {formatINR(grandTotal)}
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    colSpan={5}
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      textAlign: "left",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    Total
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      textAlign: "right",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {formatINR(grandTotal)}
                                  </td>
                                </tr>
                                <tr>
                                  <td
                                    colSpan={6}
                                    style={{
                                      border: "1px solid #666",
                                      padding: 6,
                                      fontSize: 13,
                                      textAlign: "left",
                                    }}
                                  >
                                    <b>Amount in Words:</b>{" "}
                                    {amountInWords(grandTotal)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                border: "1px solid #666",
                                borderTop: "none",
                                padding: 6,
                                fontSize: 13,
                                fontWeight: "bold",
                              }}
                            >
                              <span>Paid</span>
                              <span>{formatINR(grandTotal)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default DownloadInvoices;
