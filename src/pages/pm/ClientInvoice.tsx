import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/pm/AppShell";
import MonthNavigator, { MONTH_NAMES } from "@/components/pm/MonthNavigator";
import SearchableSelect from "@/components/pm/SearchableSelect";
import { useData } from "@/contexts/DataContext";
import { getSiteCode } from "@/lib/siteCodeMatching";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDown, Printer, FileText, Pencil, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { formatClientInvoiceFileName } from "@/lib/clientInvoiceFormat";

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

const dollarsInWords = (amount: number) => {
  // The invoice displays four decimal places, but USD words should use the
  // currency's two-decimal cents. Round the complete value first so the text
  // always matches the displayed total instead of dropping the fractional part.
  const totalCents = Math.round((amount + Number.EPSILON) * 100);
  let dollars = Math.floor(totalCents / 100);
  const cents = totalCents % 100;
  const parts: string[] = [];
  for (const [divisor, label] of [
    [1_000_000_000, "Billion"],
    [1_000_000, "Million"],
    [1_000, "Thousand"],
  ] as const) {
    const count = Math.floor(dollars / divisor);
    if (count) {
      parts.push(`${belowThousandToWords(count)} ${label}`);
      dollars %= divisor;
    }
  }
  if (dollars || parts.length === 0)
    parts.push(belowThousandToWords(dollars) || "Zero");
  const dollarWords = `${parts.join(" ")} Dollar${dollars === 1 ? "" : "s"}`;
  const centWords = cents
    ? ` and ${belowThousandToWords(cents)} Cent${cents === 1 ? "" : "s"}`
    : "";
  return `${dollarWords}${centWords} Only`;
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

const plainUsd = (n: number, digits = 4) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const BORDER_COLOR = "#4a4a4a";

const cell: React.CSSProperties = {
  border: `1px solid ${BORDER_COLOR}`,
  padding: "7px 9px",
  fontSize: 12.5,
};
const headCell: React.CSSProperties = {
  ...cell,
  background: "#f1f2f6",
  fontWeight: 700,
  textAlign: "left",
};

const ClientInvoice = () => {
  const { clients, projects, assignments, siteCodes, billTos } = useData();
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [invoiceNumber, setInvoiceNumber] = useState(
    `CAPL-INV-25-${String(now.getFullYear()).slice(-2)}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`
  );
  const [clientId, setClientId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [billTo, setBillTo] = useState("");
  const [billToId, setBillToId] = useState("");

  const applyBillTo = (id: string) => {
    setBillToId(id);
    const entry = billTos.find((b) => b.id === id);
    if (!entry) return;
    const parts = [entry.name, ...entry.details.split("\n").map((l) => l.trim()).filter(Boolean)];
    if (entry.gstin) parts.push(`GSTIN: ${entry.gstin}`);
    setBillTo(parts.join(" "));
  };
  const [lines, setLines] = useState<Line[]>([]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [allocationTableOpen, setAllocationTableOpen] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const client = clients.find((c) => c.id === clientId);

  const sites = useMemo(
    () => {
      const clientProjectIds = new Set(
        projects.filter((p) => p.clientId === clientId).map((p) => p.id)
      );

      return assignments.filter(
        (a) =>
          a.month === month &&
          a.year === year &&
          a.status === "Completed" &&
          (a.clientId === clientId || clientProjectIds.has(a.projectId))
      );
    },
    [assignments, clientId, month, projects, year]
  );

  useEffect(() => {
    setLines(
      sites.map((s) => {
        // Price is owned by Project master data (Default Price); fall back to
        // the allocation rate only when the project has no default price.
        const project = projects.find((p) => p.id === s.projectId);
        const price =
          Number.isFinite(project?.defaultPrice) && project?.defaultPrice != null
            ? project.defaultPrice
            : Number.isFinite(s.rate)
              ? s.rate ?? 0
              : 0;
        const quantity = s.quantity ?? 0;
        return {
          id: s.id,
          name: `${s.siteName} - (${s.projectName})`,
          code: getSiteCode(siteCodes, s.siteName) || "N/A",
          quantity,
          unit: s.unitType ?? "-",
          price,
          amount: Number((quantity * price).toFixed(4)),
        };
      })
    );
  }, [sites, siteCodes, projects]);

  const patch = (id: string, p: Partial<Line>) =>
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...p };
        if (p.quantity !== undefined || p.price !== undefined)
          next.amount = Number(
            ((next.quantity || 0) * (next.price || 0)).toFixed(4)
          );
        return next;
      })
    );

  const totalQty = lines.reduce((s, l) => s + (l.quantity || 0), 0);
  const subTotal = lines.reduce((s, l) => s + (l.amount || 0), 0);
  const invoiceLines = useMemo(() => {
    const grouped = new Map<string, Line>();
    lines.forEach((line) => {
      // A site/project pair is one invoice line, even when source records
      // contain different units. Accounting codes are attached to this pair.
      const key = line.name.trim().toLowerCase();
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, { ...line });
        return;
      }
      const quantity = (existing.quantity || 0) + (line.quantity || 0);
      const amount = (existing.amount || 0) + (line.amount || 0);
      grouped.set(key, {
        ...existing,
        quantity,
        amount,
        price: quantity ? amount / quantity : existing.price,
      });
    });
    return Array.from(grouped.values());
  }, [lines]);

  const displayDate = invoiceDate
    ? new Date(`${invoiceDate}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const computedFileName = useMemo(
    () => formatClientInvoiceFileName(invoiceNumber, invoiceDate),
    [invoiceNumber, invoiceDate]
  );

  const printInvoice = () => {
    if (!invoiceRef.current) return;
    const w = window.open("", "", "width=900,height=1200");
    if (!w) return;
    w.document.write(`<html><head><title>${computedFileName}</title><style>
      @page{size:A4 portrait;margin:10mm;@bottom-right{content:"Page " counter(page) " of " counter(pages);color:#aaa;font:8pt Arial}}*{box-sizing:border-box}
      html,body{margin:0;padding:0;background:#fff}body{font-family:Arial,sans-serif}
      .client-invoice{width:190mm!important;min-height:0!important;margin:0 auto!important;padding:0!important;border:0!important;box-shadow:none!important;border-radius:0!important}
      .client-invoice-title,.client-invoice-company,.client-invoice-billing,.client-invoice-terms{break-inside:avoid;page-break-inside:avoid}
      .client-invoice-table{width:100%;table-layout:fixed}.client-invoice-table thead{display:table-header-group}
      .client-invoice-table tr{break-inside:avoid;page-break-inside:avoid}
      @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.client-invoice{width:190mm!important}.client-invoice-title{position:static;margin:0 0 10px 0;background:#fff}}
      </style></head><body>${invoiceRef.current.outerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => {
      w.print();
      w.close();
    }, 300);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="relative flex flex-wrap items-center justify-between gap-4 bg-slate-50 pb-4 before:absolute before:bottom-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-b before:border-slate-200 before:content-['']">
          <h3 className="text-xl font-semibold text-pink-800">Client Invoice</h3>
          <MonthNavigator
            month={month}
            year={year}
            onChange={(m, y) => {
              setMonth(m);
              setYear(y);
            }}
          />
        </div>

        <Card className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <div className="order-4">
            <label
              htmlFor="invoice-number"
              className="mb-1.5 block text-sm font-semibold text-pink-800"
            >
              Invoice Number
            </label>
            <Input
              id="invoice-number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="CAPL-INV-25-26-08"
            />
          </div>
          <div className="order-1">
            <label className="mb-1.5 block text-sm font-semibold text-pink-800">
              Client Name
            </label>
            <SearchableSelect
              value={clientId}
              onChange={setClientId}
              options={clients.map((c) => ({ id: c.id, label: c.name }))}
              placeholder="Select Client"
            />
          </div>
          <div className="order-2">
            <label
              htmlFor="inv-date"
              className="mb-1.5 block text-sm font-semibold text-rose-800"
            >
              Invoice Date
            </label>
            <Input
              id="inv-date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div className="order-3">
            <label
              className="mb-1.5 block text-sm font-semibold text-fuchsia-800"
            >
              Bill To
            </label>
            {billTos.length > 0 && (
              <div className="mb-2">
                <SearchableSelect
                  value={billToId}
                  onChange={applyBillTo}
                  options={billTos.map((b) => ({ id: b.id, label: b.name }))}
                  placeholder="Pick saved Bill To..."
                  title="Saved Bill To"
                  openUp
                />
              </div>
            )}
            {billTo.trim() && billToId && (
              <div className="flex items-start gap-2 px-1 py-3 text-sm text-slate-800">
                <span>{billTo.replace(/\s*\|\s*/g, ", ")}</span>
                <button
                  type="button"
                  onClick={() => navigate("/app/master/all", { state: { tab: "billto" } })}
                  className="shrink-0 rounded p-1 pt-0.5 text-fuchsia-800 hover:bg-fuchsia-50"
                  aria-label="Edit Bill To master data"
                  title="Edit Bill To master data"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </Card>

        {clientId &&
          (lines.length === 0 ? (
            <Card className="p-10 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No sites found for this client in {MONTH_NAMES[month]} {year}.
              </p>
            </Card>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAllocationTableOpen((open) => !open)}
                className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-lg font-semibold text-slate-800 hover:bg-slate-100"
                aria-expanded={allocationTableOpen}
              >
                <span>Allocate Accounting Code</span>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    allocationTableOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {allocationTableOpen && <Card className="overflow-x-auto rounded-2xl border-slate-200 shadow-sm">
                <table className="w-full table-fixed text-sm">
                  <colgroup>
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "37%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "17%" }} />
                  </colgroup>
                  <thead className="bg-gradient-to-r from-indigo-100 via-blue-50 to-cyan-100">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3 w-10">
                        #
                      </th>
                      <th className="text-left font-semibold px-4 py-3">
                        Site Name (Project Name)
                      </th>
                      <th className="text-left font-semibold px-4 py-3 w-40">
                        Accounting Code
                      </th>
                      <th className="text-right font-semibold px-4 py-3 w-28">
                        Quantity
                      </th>
                      <th className="text-left font-semibold px-4 py-3 w-28">
                        Unit
                      </th>
                      <th className="text-right font-semibold px-4 py-3 w-32">
                        Price ($)
                      </th>
                      <th className="text-right font-semibold px-4 py-3 w-32">
                        Amount ($)
                      </th>
                      <th className="text-center font-semibold px-4 py-3 w-32">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceLines.map((l, i) => (
                      <tr key={l.id} className="border-t border-border transition-colors odd:bg-white even:bg-slate-100/70 hover:bg-blue-50/70">
                        <td className="px-4 py-2 text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-4 py-2 font-medium">{l.name}</td>
                        <td className="px-4 py-2">
                          {editingLineId === l.id ? <Input
                            type="text"
                            value={l.code}
                            className="m-0 h-12 rounded-xl border-2 border-indigo-200 bg-white px-4 py-2 text-base shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-400"
                            readOnly={editingLineId !== l.id}
                            disabled={false}
                            aria-label={`Accounting code for ${l.name}`}
                            autoComplete="off"
                            onChange={(e) =>
                              patch(l.id, { code: e.target.value })
                            }
                            placeholder="Code"
                          /> : <span className="block truncate px-1 font-medium">{l.code || "N/A"}</span>}
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            className="m-0 h-auto border-0 bg-transparent p-0 text-right shadow-none focus-visible:ring-0"
                            value={l.quantity}
                            readOnly
                            onChange={(e) =>
                              patch(l.id, { quantity: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            value={l.unit}
                            className="m-0 h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                            readOnly
                            onChange={(e) =>
                              patch(l.id, { unit: e.target.value })
                            }
                          />
                        </td>
                         <td className="px-4 py-2">
                          <span
                            className="block cursor-not-allowed text-right text-muted-foreground"
                            title="Price comes from the project's Default Price. Change it in Master Data → Project."
                          >
                            {plainUsd(l.price)}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            step="0.0001"
                            className="m-0 h-auto border-0 bg-transparent p-0 text-right shadow-none focus-visible:ring-0"
                            value={l.amount}
                            readOnly
                            onChange={(e) =>
                              patch(l.id, { amount: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {editingLineId === l.id ? (
                              <button
                                type="button"
                                onClick={() => setEditingLineId(null)}
                                className="rounded p-1.5 text-emerald-600 hover:bg-emerald-100"
                                aria-label={`Save row for ${l.name}`}
                                title="Save"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditingLineId(l.id)}
                                className="rounded p-1.5 text-indigo-600 hover:bg-indigo-100"
                                aria-label={`Edit row for ${l.name}`}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setLines((prev) => prev.filter((line) => line.id !== l.id));
                                setEditingLineId(null);
                              }}
                              className="rounded p-1.5 text-red-600 hover:bg-red-100"
                              aria-label={`Delete row for ${l.name}`}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-secondary/40 font-semibold">
                      <td className="px-4 py-3" colSpan={3}>
                        Total
                      </td>
                      <td className="px-4 py-3 text-right">
                        {totalQty.toLocaleString("en-US")}
                      </td>
                      <td colSpan={2} />
                      <td className="px-4 py-3 text-right">{plainUsd(subTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </Card>}

              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={printInvoice} className="lg:fixed lg:bottom-6 lg:right-6 lg:z-50 lg:shadow-lg">
                  <Printer className="h-4 w-4 mr-2" /> Preview &amp; Download
                </Button>
              </div>

              <div
                className="overflow-auto"
              >
                <div
                  ref={invoiceRef}
                  className="client-invoice bg-white text-black mx-auto rounded-lg border border-gray-300 shadow-card"
                  style={{
                    width: "190mm",
                    minHeight: "277mm",
                    padding: "10mm",
                    boxSizing: "border-box",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  <div
                    className="client-invoice-title"
                    style={{
                      textAlign: "center",
                      fontWeight: 700,
                      fontSize: 20,
                      marginBottom: 10,
                    }}
                  >
                    Tax Invoice
                  </div>

                  <table
                    className="client-invoice-company"
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: `2px solid ${BORDER_COLOR}`,
                    }}
                  >
                    <tbody>
                      {/* Company Header */}
                      <tr>
                        <td
                          colSpan={2}
                          style={{
                            padding: 0,
                            border: `1px solid ${BORDER_COLOR}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "8px 20px",
                              minHeight: 125,
                              boxSizing: "border-box",
                            }}
                          >
                            {/* Logo */}
                            <div
                              style={{
                                width: "30%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                paddingLeft: 18,
                                paddingRight: 25,
                                boxSizing: "border-box",
                              }}
                            >
                              <img
                                src={logo}
                                alt="Civique Arts logo"
                                style={{
                                  width: 145,
                                  maxHeight: 105,
                                  height: "auto",
                                  objectFit: "contain",
                                }}
                                crossOrigin="anonymous"
                              />
                            </div>

                            {/* Company Details */}
                            <div
                              style={{
                                width: "70%",
                                paddingLeft: 25,
                                paddingRight: 25,
                                boxSizing: "border-box",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 22,
                                  fontWeight: 700,
                                  lineHeight: 1.15,
                                  marginBottom: 10,
                                }}
                              >
                                Civique Arts Private Limited
                              </div>

                              <div
                                style={{
                                  fontSize: 11.5,
                                  whiteSpace: "nowrap",
                                  marginBottom: 8,
                                }}
                              >
                                G NO 214 GIRME WASTI KOREGAON MOOL HAVELI Uruli
                                Kanchan
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  fontSize: 12.5,
                                  marginBottom: 7,
                                }}
                              >
                                <div style={{ width: "50%" }}>
                                  <b>Phone:</b>&nbsp; +919011718351
                                </div>

                                <div style={{ width: "50%" }}>
                                  <b>Email:</b>&nbsp; vijayc@civiquearts.com
                                </div>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  fontSize: 12.5,
                                  marginBottom: 7,
                                }}
                              >
                                <div style={{ width: "50%" }}>
                                  <b>GSTIN:</b>&nbsp; 27AAMCC0869Q1ZU
                                </div>

                                <div style={{ width: "50%" }}>
                                  <b>State:</b>&nbsp; 27-Maharashtra
                                </div>
                              </div>

                              <div style={{ fontSize: 12.5 }}>
                                <b>LUT #:</b>&nbsp; AD2710240347548
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Bill To + Invoice Details */}
                      <tr>
                        {/* Bill To */}
                        <td
                          style={{
                            width: "50%",
                            padding: 0,
                            verticalAlign: "top",
                            border: `1px solid ${BORDER_COLOR}`,
                          }}
                        >
                          <div
                            style={{
                              padding: "7px 9px",
                              fontSize: 12.5,
                              fontWeight: 700,
                              background: "#f1f2f6",
                              borderBottom: `1px solid ${BORDER_COLOR}`,
                            }}
                          >
                            Bill To:
                          </div>

                          <div
                            style={{
                              padding: "7px 9px",
                              fontSize: 12.5,
                              minHeight: 90,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {billTo
                              ? (() => {
                                  const parts = billTo
                                    .split("|")
                                    .map((item) => item.trim())
                                    .filter(Boolean);

                                  return (
                                    <>
                                      {/* Company Name */}
                                      <div
                                        style={{
                                          fontWeight: 700,
                                          marginBottom: 8,
                                        }}
                                      >
                                        {parts[0]}
                                      </div>

                                      {/* Address */}
                                      {parts.slice(1).map((part, index) => (
                                        <div key={index}>
                                          {part}
                                        </div>
                                      ))}
                                    </>
                                  );
                                })()
                              : "-"}
                          </div>
                        </td>

                        {/* Invoice Details */}
                        <td
                          style={{
                            width: "50%",
                            padding: 0,
                            verticalAlign: "top",
                            border: `1px solid ${BORDER_COLOR}`,
                          }}
                        >
                          <div
                            style={{
                              padding: "7px 9px",
                              fontSize: 12.5,
                              fontWeight: 700,
                              background: "#f1f2f6",
                              borderBottom: `1px solid ${BORDER_COLOR}`,
                            }}
                          >
                            Invoice Details:
                          </div>

                          <div
                            style={{
                              padding: "7px 9px",
                              fontSize: 12.5,
                              minHeight: 90,
                            }}
                          >
                            <div>
                              <b>Invoice No.:</b> {invoiceNumber}
                            </div>

                            <div style={{ marginTop: 6 }}>
                              <b>Date:</b> {displayDate}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <table
                    className="client-invoice-table"
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      tableLayout: "fixed",
                      border: "2px solid #4a4a4a",
                      marginTop: 10,
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
                      <tr>
                        <th style={headCell}>#</th>
                        <th style={headCell}>Item Name</th>
                        <th
                          style={{
                            ...headCell,
                            textAlign: "right",
                          }}
                        >
                          Quantity
                        </th>

                        <th
                          style={{
                            ...headCell,
                            textAlign: "right",
                          }}
                        >
                          Unit
                        </th>

                        <th
                          style={{
                            ...headCell,
                            textAlign: "right",
                          }}
                        >
                          Price ($)
                        </th>

                        <th
                          style={{
                            ...headCell,
                            textAlign: "right",
                          }}
                        >
                          Amount ($)
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {/* Item Rows */}
                      {invoiceLines.map((l, i) => (
                        <tr key={l.id}>
                          <td style={cell}>{i + 1}</td>

                          <td style={cell}>
                            <b>{l.name}</b>

                            {l.code && (
                              <div style={{ fontSize: 11 }}>
                                (Accounting code {l.code})
                              </div>
                            )}
                          </td>

                          <td
                            style={{
                              ...cell,
                              textAlign: "right",
                            }}
                          >
                            {(l.quantity || 0).toLocaleString("en-US")}
                          </td>

                          <td
                            style={{
                              ...cell,
                              textAlign: "right",
                            }}
                          >
                            {l.unit || "-"}
                          </td>

                          <td
                            style={{
                              ...cell,
                              textAlign: "right",
                            }}
                          >
                            {plainUsd(l.price)}
                          </td>

                          <td
                            style={{
                              ...cell,
                              textAlign: "right",
                            }}
                          >
                            {plainUsd(l.amount)}
                          </td>
                        </tr>
                      ))}

                      {/* Items Total */}
                      <tr>
                        <td
                          style={{
                            ...cell,
                            fontWeight: 700,
                          }}
                          colSpan={2}
                        >
                          Total
                        </td>

                        <td
                          style={{
                            ...cell,
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          {totalQty.toLocaleString("en-US")}
                        </td>

                        <td style={cell} />

                        <td style={cell} />

                        <td
                          style={{
                            ...cell,
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          {plainUsd(subTotal)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            ...cell,
                            padding: "4px 6px",
                          }}
                          colSpan={6}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              lineHeight: "1.2",
                              marginBottom: "1px",
                            }}
                          >
                            <span>Sub Total</span>

                            <span>
                              <span style={{ marginRight: "250px" }}>:</span>
                              $ {plainUsd(subTotal, 4)}
                            </span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            ...cell,
                            padding: "6px",
                            fontWeight: 700,
                          }}
                          colSpan={6}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              lineHeight: "1.2",
                            }}
                          >
                            <span>Total</span>

                            <span>
                              <span style={{ marginRight: "250px" }}>:</span>
                              $ {plainUsd(subTotal, 4)}
                            </span>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style={{
                            ...cell,
                            padding: "6px",
                            fontWeight: 700,
                            ...headCell,
                          }}
                          colSpan={6}
                        >
                          Invoice Amount in Words:
                        </td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            ...cell,
                            padding: "8px 6px",
                            fontWeight: 400,
                          }}
                          colSpan={6}
                        >
                          {dollarsInWords(subTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div>
                    <table
                      className="client-invoice-terms"
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        border: "2px solid #4a4a4a",
                        marginTop: 10,
                      }}
                    >
                      <tbody>
                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              ...cell,
                              border: "1px solid #4a4a4a",
                              fontWeight: 700,
                              padding: "6px",
                              background: "#f1f2f6",
                            }}
                          >
                            Terms &amp; Conditions:
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              ...cell,
                              border: "1px solid #4a4a4a",
                              padding: "7px 6px",
                              height: 32,
                              verticalAlign: "top",
                            }}
                          >
                            Thanks for doing business with us!
                          </td>
                        </tr>

                        <tr>
                          <td
                            style={{
                              ...cell,
                              width: "50%",
                              border: "1px solid #4a4a4a",
                              fontWeight: 700,
                              padding: "6px",
                              background: "#f1f2f6",
                            }}
                          >
                            Bank Details:
                          </td>

                          <td
                            style={{
                              ...cell,
                              width: "50%",
                              border: "1px solid #4a4a4a",
                              fontWeight: 700,
                              padding: "6px",
                              background: "#f1f2f6",
                            }}
                          >
                            For Civique Arts Private Limited:
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              ...cell,
                              border: "1px solid #4a4a4a",
                              verticalAlign: "top",
                              height: 124,
                              padding: "7px 6px",
                              lineHeight: 1.9,
                            }}
                          >
                            <div>
                              Name : <b>STATE BANK OF INDIA, URALIKANCHAN</b>
                            </div>

                            <div>
                              Account No. : <b>43302336371</b>
                            </div>

                            <div>
                              IFSC code : <b>SBIN0007762</b>
                            </div>

                            <div>
                              Swift code : <b>SBININBB238</b>
                            </div>
                          </td>

                          <td
                            style={{
                              ...cell,
                              border: "1px solid #4a4a4a",
                              height: 124,
                              verticalAlign: "bottom",
                              textAlign: "center",
                              color: "#4a4a4a",
                              marginBottom: 6,
                            }}
                          >
                            Authorized Signatory
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ))}
      </div>
    </AppShell>
  );
};

export default ClientInvoice;
