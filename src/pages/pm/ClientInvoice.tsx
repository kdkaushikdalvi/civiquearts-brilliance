import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import MonthNavigator, { MONTH_NAMES } from "@/components/pm/MonthNavigator";
import SearchableSelect from "@/components/pm/SearchableSelect";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, Printer, FileText } from "lucide-react";
import { toast } from "sonner";
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

const dollarsInWords = (amount: number) => {
  let dollars = Math.round(amount);
  const parts: string[] = [];
  for (const [divisor, label] of [[1_000_000_000, "Billion"], [1_000_000, "Million"], [1_000, "Thousand"]] as const) {
    const count = Math.floor(dollars / divisor);
    if (count) {
      parts.push(`${belowThousandToWords(count)} ${label}`);
      dollars %= divisor;
    }
  }
  if (dollars || parts.length === 0) parts.push(belowThousandToWords(dollars) || "Zero");
  return `${parts.join(" ")} Dollars only`;
};

interface Line {
  id: string;
  name: string;
  code: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
}

const usd = (n: number, digits = 4) =>
  `$ ${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const cell: React.CSSProperties = { border: "1px solid #c9ccd6", padding: "7px 9px", fontSize: 12.5 };
const headCell: React.CSSProperties = { ...cell, background: "#f1f2f6", fontWeight: 700, textAlign: "left" };

const ClientInvoice = () => {
  const { projects, assignments } = useData();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [projectId, setProjectId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [billTo, setBillTo] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const project = projects.find((p) => p.id === projectId);

  const sites = useMemo(
    () => assignments.filter((a) => a.month === month && a.year === year && a.projectId === projectId),
    [assignments, month, year, projectId]
  );

  useEffect(() => {
    setLines(
      sites.map((s) => ({
        id: s.id,
        name: s.siteName,
        code: "",
        quantity: s.quantity ?? 0,
        unit: s.unitType ?? "-",
        price: 0,
        amount: 0,
      }))
    );
  }, [sites]);

  const patch = (id: string, p: Partial<Line>) =>
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...p };
        if (p.quantity !== undefined || p.price !== undefined)
          next.amount = Number(((next.quantity || 0) * (next.price || 0)).toFixed(4));
        return next;
      })
    );

  const totalQty = lines.reduce((s, l) => s + (l.quantity || 0), 0);
  const subTotal = lines.reduce((s, l) => s + (l.amount || 0), 0);
  const rounded = Math.round(subTotal);
  const roundOff = rounded - subTotal;

  const invoiceNumber = `CAPL-INV-${String(year).slice(-2)}-${String(month + 1).padStart(2, "0")}`;
  const displayDate = invoiceDate
    ? new Date(`${invoiceDate}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const download = async () => {
    if (!invoiceRef.current) return;
    try {
      toast.info("Generating PDF...");
      const canvas = await html2canvas(invoiceRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, (canvas.height * w) / canvas.width);
      pdf.save(`Invoice_${project?.name.replace(/\s/g, "") || "Client"}_${MONTH_NAMES[month]}_${year}.pdf`);
      toast.success("Invoice downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    }
  };

  const printInvoice = () => {
    if (!invoiceRef.current) return;
    const w = window.open("", "", "width=900,height=1200");
    if (!w) return;
    w.document.write(
      `<html><head><title>Tax Invoice</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#fff}</style></head><body>${invoiceRef.current.outerHTML}</body></html>`
    );
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Client Invoice</h1>
          <MonthNavigator month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
        </div>

        <Card className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Project Name</label>
            <SearchableSelect
              value={projectId}
              onChange={setProjectId}
              options={projects.map((p) => ({ id: p.id, label: p.name }))}
              placeholder="Select Project"
            />
          </div>
          <div>
            <label htmlFor="inv-date" className="text-sm font-medium mb-1.5 block">Invoice Date</label>
            <Input id="inv-date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="bill-to" className="text-sm font-medium mb-1.5 block">Bill To</label>
            <Input id="bill-to" value={billTo} onChange={(e) => setBillTo(e.target.value)} placeholder="Client name & address" />
          </div>
        </Card>

        {projectId && (
          lines.length === 0 ? (
            <Card className="p-10 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No sites found for this project in {MONTH_NAMES[month]} {year}.</p>
            </Card>
          ) : (
            <>
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3 w-10">#</th>
                      <th className="text-left font-semibold px-4 py-3">Site / Item</th>
                      <th className="text-left font-semibold px-4 py-3 w-40">Accounting Code</th>
                      <th className="text-right font-semibold px-4 py-3 w-28">Quantity</th>
                      <th className="text-left font-semibold px-4 py-3 w-28">Unit</th>
                      <th className="text-right font-semibold px-4 py-3 w-32">Price/Unit ($)</th>
                      <th className="text-right font-semibold px-4 py-3 w-32">Amount ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2 font-medium">{l.name}</td>
                        <td className="px-4 py-2">
                          <Input value={l.code} onChange={(e) => patch(l.id, { code: e.target.value })} placeholder="Code" />
                        </td>
                        <td className="px-4 py-2">
                          <Input type="number" className="text-right" value={l.quantity}
                            onChange={(e) => patch(l.id, { quantity: Number(e.target.value) })} />
                        </td>
                        <td className="px-4 py-2">
                          <Input value={l.unit} onChange={(e) => patch(l.id, { unit: e.target.value })} />
                        </td>
                        <td className="px-4 py-2">
                          <Input type="number" step="0.0001" className="text-right" value={l.price}
                            onChange={(e) => patch(l.id, { price: Number(e.target.value) })} />
                        </td>
                        <td className="px-4 py-2">
                          <Input type="number" step="0.0001" className="text-right" value={l.amount}
                            onChange={(e) => patch(l.id, { amount: Number(e.target.value) })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-secondary/40 font-semibold">
                      <td className="px-4 py-3" colSpan={3}>Total</td>
                      <td className="px-4 py-3 text-right">{totalQty.toLocaleString("en-US")}</td>
                      <td colSpan={2} />
                      <td className="px-4 py-3 text-right">{usd(subTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </Card>

              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => setShowPreview((s) => !s)}>
                  <FileText className="h-4 w-4 mr-2" /> {showPreview ? "Hide Preview" : "Preview"}
                </Button>
                <Button variant="outline" onClick={printInvoice}>
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                <Button onClick={download} className="gradient-saffron text-saffron-foreground">
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>

              <div className={showPreview ? "overflow-auto" : "h-0 overflow-hidden"} aria-hidden={!showPreview}>
                <div
                  ref={invoiceRef}
                  className="bg-white text-black mx-auto"
                  style={{ width: "210mm", minHeight: "297mm", padding: "10mm", fontFamily: "Arial, sans-serif" }}
                >
                  <div style={{ textAlign: "center", fontWeight: 700, fontSize: 20, marginBottom: 10 }}>Tax Invoice</div>

                  <div style={{ border: "1px solid #c9ccd6", display: "flex", alignItems: "center", gap: 16, padding: 12 }}>
                    <img src={logo} alt="Civique Arts logo" style={{ height: 64, width: "auto" }} crossOrigin="anonymous" />
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>Civique Arts Private Limited</div>
                      <div style={{ fontSize: 12.5, margin: "4px 0" }}>G NO 214 GIRME WASTI KOREGAON MOOL HAVELI Uruli Kanchan</div>
                      <div style={{ fontSize: 12.5 }}><b>Phone:</b> +919011718351 &nbsp;&nbsp; <b>Email:</b> vijayc@civiquearts.com</div>
                      <div style={{ fontSize: 12.5 }}><b>GSTIN:</b> 27AAMCC0869Q1ZU &nbsp;&nbsp; <b>State:</b> 27-Maharashtra</div>
                      <div style={{ fontSize: 12.5 }}><b>LUT #:</b> AD2710240347548</div>
                    </div>
                  </div>

                  <div style={{ display: "flex" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...headCell, borderTop: "none" }}>Bill To:</div>
                      <div style={{ ...cell, borderTop: "none", minHeight: 90, whiteSpace: "pre-wrap" }}>{billTo || "-"}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...headCell, borderTop: "none", borderLeft: "none" }}>Invoice Details:</div>
                      <div style={{ ...cell, borderTop: "none", borderLeft: "none", minHeight: 90 }}>
                        <div><b>Invoice No.:</b> {invoiceNumber}</div>
                        <div style={{ marginTop: 6 }}><b>Date:</b> {displayDate}</div>
                        <div style={{ marginTop: 6 }}><b>Billing Month:</b> {MONTH_NAMES[month]} {year}</div>
                      </div>
                    </div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
                    <thead>
                      <tr>
                        <th style={{ ...headCell, width: 34 }}>#</th>
                        <th style={headCell}>Item name</th>
                        <th style={{ ...headCell, textAlign: "right" }}>Quantity</th>
                        <th style={{ ...headCell, textAlign: "right" }}>Unit</th>
                        <th style={{ ...headCell, textAlign: "right" }}>Price/ Unit($)</th>
                        <th style={{ ...headCell, textAlign: "right" }}>Amount($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => (
                        <tr key={l.id}>
                          <td style={cell}>{i + 1}</td>
                          <td style={cell}>
                            <b>{l.name}</b>
                            {l.code && <div style={{ fontSize: 11 }}>(Accounting code {l.code})</div>}
                          </td>
                          <td style={{ ...cell, textAlign: "right" }}>{(l.quantity || 0).toLocaleString("en-US")}</td>
                          <td style={{ ...cell, textAlign: "right" }}>{l.unit || "-"}</td>
                          <td style={{ ...cell, textAlign: "right" }}>{usd(l.price)}</td>
                          <td style={{ ...cell, textAlign: "right" }}>{usd(l.amount)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ ...cell, fontWeight: 700 }} colSpan={2}>Total</td>
                        <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>{totalQty.toLocaleString("en-US")}</td>
                        <td style={cell} />
                        <td style={cell} />
                        <td style={{ ...cell, textAlign: "right", fontWeight: 700 }}>{usd(subTotal)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                    <tbody>
                      <tr>
                        <td style={{ ...cell, border: "none" }}>Sub Total</td>
                        <td style={{ ...cell, border: "none", width: 60 }}>:</td>
                        <td style={{ ...cell, border: "none", textAlign: "right" }}>{usd(subTotal)}</td>
                      </tr>
                      <tr>
                        <td style={{ ...cell, border: "none" }}>Round Off</td>
                        <td style={{ ...cell, border: "none" }}>:</td>
                        <td style={{ ...cell, border: "none", textAlign: "right" }}>
                          {roundOff < 0 ? "- " : ""}{usd(Math.abs(roundOff))}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ ...cell, fontWeight: 700 }}>Total</td>
                        <td style={{ ...cell, fontWeight: 700 }}>:</td>
                        <td style={{ ...cell, fontWeight: 700, textAlign: "right" }}>{usd(rounded, 4)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ ...headCell, marginTop: 8 }}>Invoice Amount in Words:</div>
                  <div style={{ ...cell, borderTop: "none" }}>{dollarsInWords(rounded)}</div>

                  <div style={{ ...headCell, marginTop: 8 }}>Terms &amp; Conditions:</div>
                  <div style={{ ...cell, borderTop: "none" }}>Thanks for doing business with us!</div>

                  <div style={{ display: "flex", marginTop: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={headCell}>Bank Details:</div>
                      <div style={{ ...cell, borderTop: "none", lineHeight: 1.9 }}>
                        <div>Name : <b>STATE BANK OF INDIA, URALIKANCHAN</b></div>
                        <div>Account No. : <b>43302336371</b></div>
                        <div>IFSC code : <b>SBIN0007762</b></div>
                        <div>Swift code : <b>SBININBB238</b></div>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...headCell, borderLeft: "none" }}>For Civique Arts Private Limited:</div>
                      <div style={{ ...cell, borderTop: "none", borderLeft: "none", height: 118, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        Authorized Signatory
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )
        )}
      </div>
    </AppShell>
  );
};

export default ClientInvoice;
