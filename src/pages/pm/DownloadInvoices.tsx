import { useMemo, useRef, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import MonthNavigator, { MONTH_NAMES } from "@/components/pm/MonthNavigator";
import SearchableSelect from "@/components/pm/SearchableSelect";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Printer, FileText } from "lucide-react";
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

  const grandTotal = filtered.reduce((s, a) => s + (a.amount ?? 0), 0);
  const invoiceNumber = `PS-${year}${String(month + 1).padStart(2, "0")}-${assigneeId.slice(-4).toUpperCase() || "----"}`;
  const invoiceDate = slipDate
    ? new Date(`${slipDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const download = async () => {
    if (!invoiceRef.current || filtered.length === 0) return;
    try {
      toast.info("Generating PDF...");
      const canvas = await html2canvas(invoiceRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const filename = `Payment_Slip_${assignee?.name.replace(/\s/g, "")}_${MONTH_NAMES[month]}_${year}.pdf`;
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
    }
  };

  const printInvoice = () => {
    if (!invoiceRef.current) return;
    const printWindow = window.open("", "", "width=900,height=1200");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Payment Slip</title>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#fff}
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment Slips</h1>
          </div>
          <MonthNavigator month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
        </div>

        <Card className="p-5 grid gap-4 sm:grid-cols-2 max-w-3xl">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Assignee</label>
            <SearchableSelect
              value={assigneeId}
              onChange={setAssigneeId}
              options={employees.map((e) => ({ id: e.id, label: e.name }))}
              placeholder="Select Assignee"
            />
          </div>
          <div>
            <label htmlFor="slip-date" className="text-sm font-medium mb-1.5 block">Payment Slip Date</label>
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
            {filtered.length === 0 ? (
              <Card className="p-10 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  No completed projects found for the selected assignee and month.
                </p>
              </Card>
            ) : (
              <>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={printInvoice}>
                    <Printer className="h-4 w-4 mr-2" /> Print
                  </Button>
                  <Button onClick={download} className="gradient-saffron text-saffron-foreground">
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </div>

                {/* Invoice Preview */}
                <div className="overflow-auto">
                  <div
                    ref={invoiceRef}
                    className="bg-white text-black mx-auto rounded-lg border border-gray-300 shadow-card"
                    style={{ width: "210mm", minHeight: "297mm", padding: "10mm", fontFamily: "Arial, sans-serif" }}
                  >
                    <div style={{ border: "2px solid #666", textAlign: "center", fontWeight: "bold", padding: "4px", marginBottom: "6px" }}>
                      Payment Slip
                    </div>

                    <div style={{ display: "flex", gap: 0 }}>
                      <div style={{ flex: 2, border: "1px solid #666", padding: "8px", display: "flex", alignItems: "center", gap: 10 }}>
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
                      <div style={{ flex: 1, border: "1px solid #666", borderLeft: "none", padding: "8px" }}>
                        <p style={{ margin: "3px 0", fontSize: 13 }}><b>Payment Slip No.:</b> {invoiceNumber}</p>
                        <p style={{ margin: "3px 0", fontSize: 13 }}><b>Date:</b> {invoiceDate}</p>
                        <p style={{ margin: "3px 0", fontSize: 13 }}><b>Billing Month:</b> {MONTH_NAMES[month]} {year}</p>
                      </div>
                    </div>

                    <div style={{ border: "1px solid #666", borderTop: "none", padding: "8px" }}>
                      <b>Full Name:</b> {assignee?.name}
                      {assignee?.mobile ? ` · ${assignee.mobile}` : ""}
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6 }}>
                      <thead>
                        <tr style={{ background: "#f2f2f2" }}>
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "left", width: 40 }}>#</th>
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "left" }}>Project</th>
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "left" }}>Site</th>
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "left" }}>Unit</th>
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right", width: 100 }}>Qty</th>
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right", width: 100 }}>Rate (₹)</th>
                          <th style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right", width: 120 }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((a, i) => (
                          <tr key={a.id}>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13 }}>{i + 1}</td>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13 }}>{a.projectName}</td>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13 }}>{a.siteName}</td>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13 }}>{a.unitType}</td>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>{formatNumber(a.quantity || 0)}</td>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>{a.rate?.toFixed(2)}</td>
                            <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right" }}>{formatINR(a.amount || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={7} style={{ height: 12, border: "1px solid #666", borderTop: "none" }} />
                        </tr>
                        <tr>
                          <td colSpan={6} style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "left", fontWeight: "bold" }}>Sub Total</td>
                          <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right", fontWeight: "bold" }}>{formatINR(grandTotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={6} style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "left", fontWeight: "bold" }}>Total</td>
                          <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right", fontWeight: "bold" }}>{formatINR(grandTotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={7} style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "left" }}><b>Amount in Words:</b> {amountInWords(grandTotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={6} style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "left", fontWeight: "bold" }}>Paid</td>
                          <td style={{ border: "1px solid #666", padding: 6, fontSize: 13, textAlign: "right", fontWeight: "bold" }}>{formatINR(grandTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
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
