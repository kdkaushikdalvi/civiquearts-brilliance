import { useMemo, useRef, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import MonthNavigator, { MONTH_NAMES } from "@/components/pm/MonthNavigator";
import SearchableSelect from "@/components/pm/SearchableSelect";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Printer, FileText, Plus, Minus, Save, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatNumber } from "@/lib/pmFormat";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from "@/assets/logo.png";

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const belowThousandToWords = (value: number) => {
  const parts: string[] = [];
  if (value >= 100) parts.push(`${ONES[Math.floor(value / 100)]} Hundred`);
  const remainder = value % 100;
  if (remainder >= 20) parts.push(`${TENS[Math.floor(remainder / 10)]}${remainder % 10 ? ` ${ONES[remainder % 10]}` : ""}`);
  else if (remainder) parts.push(ONES[remainder]);
  return parts.join(" ");
};

const amountInWords = (amount: number) => {
  const totalPaise = Math.round(amount * 100);
  let rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  const parts: string[] = [];
  for (const [divisor, label] of [[10_000_000, "Crore"], [100_000, "Lakh"], [1_000, "Thousand"]] as const) {
    const count = Math.floor(rupees / divisor);
    if (count) {
      parts.push(`${belowThousandToWords(count)} ${label}`);
      rupees %= divisor;
    }
  }
  if (rupees || parts.length === 0) parts.push(belowThousandToWords(rupees) || "Zero");
  return `${parts.join(" ")}${paise ? ` and Paise ${belowThousandToWords(paise)}` : ""} Rupees Only`;
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
  const [slipDate, setSlipDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [otherItems, setOtherItems] = useState<OtherItem[]>([]);
  const [addedOtherIds, setAddedOtherIds] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
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

  const addedOthers = otherItems.filter((item) => addedOtherIds.includes(item.id));
  const addedOthersTotal = addedOthers.reduce((s, item) => s + item.quantity * item.rate, 0);
  const totalQty = filtered.reduce((s, a) => s + (a.quantity || 0), 0) + addedOthers.reduce((s, item) => s + item.quantity, 0);
  const calculatedGrandTotal = filtered.reduce((s, a) => s + (a.amount ?? 0), 0) + addedOthersTotal;
  // Payment slips may differ by up to ₹1 because of line-item decimal precision.
  // Normalize those near-whole totals while keeping larger fractional values intact.
  const grandTotal = Math.abs(calculatedGrandTotal - Math.round(calculatedGrandTotal)) <= 1
    ? Math.round(calculatedGrandTotal)
    : calculatedGrandTotal;
  const invoiceNumber = `PS-${year}${String(month + 1).padStart(2, "0")}-${assigneeId.slice(-4).toUpperCase() || "----"}`;
  const invoiceDate = slipDate
    ? new Date(`${slipDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const addOther = () =>
    setOtherItems((items) => [...items, { id: crypto.randomUUID(), project: "", site: "", unit: "", quantity: 0, rate: 0 }]);

  const updateOther = (id: string, patch: Partial<OtherItem>) =>
    setOtherItems((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));

  const isOtherComplete = (item: OtherItem) =>
    Boolean(item.project.trim() && item.site.trim() && item.unit.trim() && item.quantity > 0 && item.rate > 0);

  const download = async () => {
    if (!invoiceRef.current || (filtered.length === 0 && addedOthers.length === 0)) return;
    setIsDownloading(true);
    try {
      toast.info("Generating PDF...");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const exportStyle = document.createElement("style");
      exportStyle.textContent = `
        *{box-sizing:border-box}
        .payment-slip{width:718px!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;border-radius:0!important}
        .payment-slip-page-header{position:static!important;width:100%!important;background:#fff}
        .payment-slip-page-body{padding-top:0!important}
        .payment-slip-page-body .payment-slip-table{margin-top:10px!important}
        .payment-slip-header,.payment-slip-company,.payment-slip-customer,.payment-slip-table{break-inside:avoid;page-break-inside:avoid}
        .payment-slip-table{width:100%;table-layout:fixed}
        .payment-slip-table thead{display:table-header-group}
        .payment-slip-table tr{break-inside:avoid;page-break-inside:avoid}
        .payment-slip-table .payment-slip-footer{break-inside:avoid;page-break-inside:avoid;display:table-row-group}
        .payment-slip-others,.payment-slip-others tr,.payment-slip-footer-table{break-inside:avoid;page-break-inside:avoid}
      `;
      document.head.appendChild(exportStyle);
      const exportRoot = invoiceRef.current.cloneNode(true) as HTMLDivElement;
      exportRoot.style.width = "718px";
      exportRoot.style.minHeight = "0";
      exportRoot.style.padding = "0";
      exportRoot.style.position = "absolute";
      exportRoot.style.left = "0";
      exportRoot.style.top = "0";
      exportRoot.style.zIndex = "-1";
      exportRoot.style.pointerEvents = "none";
      document.body.appendChild(exportRoot);
      try {
        const canvas = await html2canvas(exportRoot, {
          width: 718,
          windowWidth: 718,
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
        });
        const tableHeader = exportRoot.querySelector(".payment-slip-table thead");
        const headerCanvas = tableHeader
          ? await html2canvas(tableHeader as HTMLElement, { scale: 2, backgroundColor: "#ffffff", useCORS: true })
          : null;
        const pageHeight = Math.floor(canvas.width * (277 / 190));
        const headerHeight = headerCanvas ? headerCanvas.height : 0;
        const contentHeight = pageHeight - headerHeight;
        for (let page = 0, top = 0; top < canvas.height; page += 1) {
          if (page > 0) pdf.addPage();
          const sliceTop = page === 0 ? top : top + headerHeight;
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = Math.min(page === 0 ? pageHeight : contentHeight, canvas.height - sliceTop);
          slice.getContext("2d")!.drawImage(canvas, 0, -sliceTop);
          pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", 10, page === 0 || !headerCanvas ? 10 : 10 + (headerHeight / canvas.width) * 190, 190, (slice.height / canvas.width) * 190);
          if (page > 0 && headerCanvas) {
            pdf.addImage(headerCanvas.toDataURL("image/png"), "PNG", 10, 10, 190, (headerHeight / canvas.width) * 190);
          }
          top = sliceTop + slice.height;
        }
      } finally {
        exportStyle.remove();
        exportRoot.remove();
      }
      const pageCount = pdf.getNumberOfPages();
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(170, 170, 170);
      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.text(`Page ${page} of ${pageCount}`, 200, 289, { align: "right" });
      }
      const filename = `${assignee?.name}_Payslip_${MONTH_NAMES[month]} ${year}.pdf`;
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

  const printInvoice = () => {
    if (!invoiceRef.current) return;
    const printWindow = window.open("", "", "width=900,height=1200");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Payment Slip</title>
      <style>
        @page{size:A4 portrait;margin:10mm;@bottom-right{content:"Page " counter(page) " of " counter(pages);color:#aaa;font:8pt Arial}}
        *{box-sizing:border-box}
        html,body{margin:0;padding:0;background:#fff}
        body{font-family:Arial,sans-serif}
        .payment-slip{width:190mm!important;min-height:0!important;margin:0 auto!important;padding:0!important;border:0!important;box-shadow:none!important;border-radius:0!important}
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
        ${document.head.innerHTML.match(/<style[^>]*>[\s\S]*?<\/style>/g)?.join("") || ""}
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
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="relative flex flex-wrap items-center justify-between gap-4 bg-slate-50 pb-4 before:absolute before:bottom-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-b before:border-slate-200 before:content-['']">
          <div>
            <h3 className="text-xl font-semibold text-yellow-800">Payment Slips</h3>
          </div>
          <MonthNavigator month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
        </div>

        <Card className="p-5 grid gap-4 sm:grid-cols-2 max-w-3xl">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-yellow-800">Assignee</label>
            <SearchableSelect
              value={assigneeId}
              onChange={setAssigneeId}
              options={employees.map((e) => ({ id: e.id, label: e.name }))}
              placeholder="Select Assignee"
            />
          </div>
          <div>
            <label htmlFor="slip-date" className="mb-1.5 block text-sm font-semibold text-amber-800">Payment Slip Date</label>
            <input
              id="slip-date"
              type="date"
              value={slipDate}
              onChange={(e) => setSlipDate(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </Card>


        {assigneeId && (
          <>
            {filtered.length === 0 && addedOthers.length === 0 ? (
              <Card className="p-10 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  No completed projects found for the selected assignee and month.
                </p>
              </Card>
            ) : (
              <>
                <Card className="overflow-x-auto p-4 space-y-4">
                  <div className="flex items-center justify-start gap-5">
                    <h4 className="text-lg font-semibold text-yellow-800">Others</h4>
                    <Button type="button" onClick={addOther} aria-label="Add other item" className="h-8 w-8 rounded-full bg-green-600 p-0 text-white hover:bg-green-700">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {otherItems.map((item) => (
                    <div key={item.id} className="grid min-w-[620px] max-w-4xl grid-cols-[minmax(120px,1.5fr)_minmax(120px,1.5fr)_72px_60px_82px_96px_auto_auto] items-center gap-2">
                      <input
                        value={item.project}
                        placeholder="Project"
                        onChange={(e) => updateOther(item.id, { project: e.target.value })}
                        className="h-9 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                      <input
                        value={item.site}
                        placeholder="Site"
                        onChange={(e) => updateOther(item.id, { site: e.target.value })}
                        className="h-9 min-w-0 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                      <input
                        value={item.unit}
                        placeholder="Unit"
                        onChange={(e) => updateOther(item.id, { unit: e.target.value })}
                        className="h-9 w-full rounded-lg border border-input bg-background px-2 text-center text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        placeholder="Qty"
                        onChange={(e) => updateOther(item.id, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                        className="h-9 w-full rounded-lg border border-input bg-background px-2 text-right text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        placeholder="Rate"
                        title="Rate (₹)"
                        onChange={(e) => updateOther(item.id, { rate: Math.max(0, Number(e.target.value) || 0) })}
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
                          setOtherItems((items) => items.filter((current) => current.id !== item.id));
                          setAddedOtherIds((ids) => ids.filter((id) => id !== item.id));
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
                            toast.error("Please complete all Other fields before adding.");
                            return;
                          }
                          setAddedOtherIds((ids) => ids.includes(item.id) ? ids : [...ids, item.id]);
                        }}
                        className="h-9 w-9 shrink-0 rounded-full p-0"
                        aria-label="Save other item"
                        title="Save"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </Card>
                {addedOtherIds.length > 0 && (
                  <Card className="overflow-x-auto">
                    <h4 className="border-b border-border bg-slate-50 px-4 py-3 font-semibold text-yellow-800">Added Others</h4>
                    <table className="w-full text-sm">
                      <tbody>
                        {otherItems.filter((item) => addedOtherIds.includes(item.id)).map((item) => (
                          <tr key={item.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-3">{item.project}</td>
                            <td className="px-4 py-3">{item.site}</td>
                            <td className="px-4 py-3">{item.unit}</td>
                            <td className="px-4 py-3 text-right">{formatNumber(item.quantity)}</td>
                            <td className="px-4 py-3 text-right">{item.rate.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">{formatINR(item.quantity * item.rate)}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <Button type="button" variant="ghost" size="icon" aria-label="Edit other item" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><Pencil className="h-4 w-4" /></Button>
                              <Button type="button" variant="ghost" size="icon" aria-label="Delete other item" onClick={() => { setOtherItems((items) => items.filter((current) => current.id !== item.id)); setAddedOtherIds((ids) => ids.filter((id) => id !== item.id)); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={printInvoice} className="lg:fixed lg:bottom-6 lg:right-6 lg:z-50 lg:shadow-lg">
                    <Printer className="h-4 w-4 mr-2" /> Preview &amp; Download
                  </Button>
                </div>

                {/* Payment Slip Preview */}
                <div
                  className="overflow-auto"
                >
                  <div
                    ref={invoiceRef}
                    className="payment-slip bg-white text-black mx-auto rounded-lg border border-gray-300 shadow-card"
                    style={{ width: "190mm", minHeight: "277mm", padding: "10mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif" }}
                  >
                    <div className="payment-slip-page-header">
                      <div className="payment-slip-header" style={{ textAlign: "center", fontWeight: "bold", padding: "4px", marginBottom: "6px" }}>
                        Payment Slip
                      </div>
                    </div>

                    <div className="payment-slip-page-body">
                      <div style={{ display: "flex", gap: 0 }}>
                      <div className="payment-slip-company" style={{ flex: 2, border: "1px solid #666", padding: "8px", display: "flex", alignItems: "center", gap: 10 }}>
                        <img src={logo} alt="Logo" style={{ height: 56, width: "auto" }} crossOrigin="anonymous" />
                        <div>
                          <h1 style={{ margin: 0, fontSize: 18 }}>Civique Arts</h1>
                          <p style={{ margin: "3px 0", fontSize: 13 }}>
                            Ground Floor Ghar No 214 Milkat No 2841 Inamdar Wasti Koregaon Mul
                          </p>
                          <p style={{ margin: "3px 0", fontSize: 13 }}>
                            <b>Phone:</b> 9011718351 &nbsp;&nbsp; <b>Email:</b> vijayc@civiquearts.com
                          </p>
                        </div>
                      </div>
                      <div className="payment-slip-company" style={{ flex: 1, border: "1px solid #666", borderLeft: "none", padding: "8px" }}>
                        <p style={{ margin: "3px 0", fontSize: 13 }}><b>Payment Slip No.:</b> {invoiceNumber}</p>
                        <p style={{ margin: "3px 0", fontSize: 13 }}><b>Date:</b> {invoiceDate}</p>
                      </div>
                      </div>

                      <div className="payment-slip-customer" style={{ border: "1px solid #666", borderTop: "none", padding: "8px" }}>
                        <b>Full Name:</b> {assignee?.name}
                        {assignee?.mobile ? ` · ${assignee.mobile}` : ""}
                      </div>
                    <table className="payment-slip-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginTop: 6 }}>
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
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13 }}>#</th>
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "left" }}>Item Name</th>
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>Quantity</th>
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>Unit</th>
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>Price (₹)</th>
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((a, i) => (
                          <tr key={a.id}>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13 }}>{i + 1}</td>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13 }}>{a.siteName} - ({a.projectName})</td>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>{formatNumber(a.quantity || 0)}</td>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13 }}>{a.unitType}</td>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>{a.rate?.toFixed(2)}</td>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>{formatINR(a.amount || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                        {addedOthers.length > 0 && (
                        <tbody className="payment-slip-others">
                          <tr>
                            <td colSpan={6} style={{ border: "1px solid #666", padding: 6, fontSize: 13, fontWeight: "bold", background: "#f2f2f2" }}>Others</td>
                          </tr>
                          {addedOthers.map((item, i) => (
                            <tr key={item.id}>
                              <td style={{ border: "1px solid #666", padding: 6, fontSize: 13 }}>{filtered.length + i + 1}</td>
                              <td style={{ border: "1px solid #666", padding: 6, fontSize: 13 }}>{item.site} - ({item.project})</td>
                              <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>{formatNumber(item.quantity)}</td>
                              <td style={{ border: "1px solid #666", padding: 6, fontSize: 13 }}>{item.unit}</td>
                              <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>{item.rate.toFixed(2)}</td>
                              <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>{formatINR(item.quantity * item.rate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      )}
                      <tbody>
                        <tr>
                          <td colSpan={2} style={{ border: "1px solid #666", padding: 6, fontSize: 13, fontWeight: "bold" }}>Total</td>
                          <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right", fontWeight: "bold" }}>{formatNumber(totalQty)}</td>
                          <td style={{ border: "1px solid #666", padding: 6, fontSize: 13 }} />
                          <td style={{ border: "1px solid #666", padding: 6, fontSize: 13 }} />
                          <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right", fontWeight: "bold" }}>{formatINR(grandTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <table className="payment-slip-table payment-slip-footer-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginTop: 0 }}>
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
                          <td colSpan={5} style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "left", fontWeight: "bold" }}>Sub Total</td>
                          <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right", fontWeight: "bold" }}>{formatINR(grandTotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={5} style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "left", fontWeight: "bold" }}>Total</td>
                          <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right", fontWeight: "bold" }}>{formatINR(grandTotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={6} style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "left" }}><b>Amount in Words:</b> {amountInWords(grandTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #666", borderTop: "none", padding: 6, fontSize: 13, fontWeight: "bold" }}>
                      <span>Paid</span>
                      <span>{formatINR(grandTotal)}</span>
                    </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default DownloadInvoices;
