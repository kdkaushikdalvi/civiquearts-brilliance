import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import MonthNavigator, { MONTH_NAMES } from "@/components/pm/MonthNavigator";
import SearchableSelect from "@/components/pm/SearchableSelect";
import { useData } from "@/contexts/DataContext";
import { getSiteCode } from "@/lib/siteCodeMatching";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, Printer, FileText } from "lucide-react";
import { toast } from "sonner";
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

const dollarsInWords = (amount: number) => {
  let dollars = Math.round(amount);
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
  `$ ${n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;

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
  const { clients, projects, assignments, siteCodes } = useData();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [clientId, setClientId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [billTo, setBillTo] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [showPreview, setShowPreview] = useState(false);
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
      sites.map((s) => ({
        id: s.id,
        name: `${s.siteName} (${s.projectName})`,
        code: getSiteCode(siteCodes, s.siteName),
        quantity: s.quantity ?? 0,
        unit: s.unitType ?? "-",
        price: 0,
        amount: 0,
      }))
    );
  }, [sites, siteCodes]);

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
  // Round only the final two digits: retain the hundreds and above.
  const rounded = Math.round(subTotal / 100) * 100;
  const roundOff = rounded - subTotal;

  const invoiceNumber = `CAPL-INV-${String(year).slice(-2)}-${String(
    month + 1
  ).padStart(2, "0")}`;
  const displayDate = invoiceDate
    ? new Date(`${invoiceDate}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const download = async () => {
    if (!invoiceRef.current) return;
    try {
      toast.info("Generating PDF...");
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const w = pdf.internal.pageSize.getWidth();
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        w,
        (canvas.height * w) / canvas.width
      );
      pdf.save(
        `Invoice_${client?.name.replace(/\s/g, "") || "Client"}_${
          MONTH_NAMES[month]
        }_${year}.pdf`
      );
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
    setTimeout(() => {
      w.print();
      w.close();
    }, 300);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <h1 className="text-2xl font-bold text-foreground">Client Invoice</h1>
          <MonthNavigator
            month={month}
            year={year}
            onChange={(m, y) => {
              setMonth(m);
              setYear(y);
            }}
          />
        </div>

        <Card className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Client Name
            </label>
            <SearchableSelect
              value={clientId}
              onChange={setClientId}
              options={clients.map((c) => ({ id: c.id, label: c.name }))}
              placeholder="Select Client"
            />
          </div>
          <div>
            <label
              htmlFor="inv-date"
              className="text-sm font-medium mb-1.5 block"
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
          <div>
            <label
              htmlFor="bill-to"
              className="text-sm font-medium mb-1.5 block"
            >
              Bill To
            </label>
            <Input
              id="bill-to"
              value={billTo}
              onChange={(e) => setBillTo(e.target.value)}
              placeholder="Client name | address | city"
            />
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
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60">
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
                        Price/Unit ($)
                      </th>
                      <th className="text-right font-semibold px-4 py-3 w-32">
                        Amount ($)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="px-4 py-2 text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-4 py-2 font-medium">{l.name}</td>
                        <td className="px-4 py-2">
                          <Input
                            value={l.code}
                            onChange={(e) =>
                              patch(l.id, { code: e.target.value })
                            }
                            placeholder="Code"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            className="text-right"
                            value={l.quantity}
                            onChange={(e) =>
                              patch(l.id, { quantity: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            value={l.unit}
                            onChange={(e) =>
                              patch(l.id, { unit: e.target.value })
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            step="0.0001"
                            className="text-right"
                            value={l.price}
                            onChange={(e) =>
                              patch(l.id, { price: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            step="0.0001"
                            className="text-right"
                            value={l.amount}
                            onChange={(e) =>
                              patch(l.id, { amount: Number(e.target.value) })
                            }
                          />
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
                      <td className="px-4 py-3 text-right">{usd(subTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </Card>

              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview((s) => !s)}
                >
                  <FileText className="h-4 w-4 mr-2" />{" "}
                  {showPreview ? "Hide Preview" : "Preview"}
                </Button>
                <Button variant="outline" onClick={printInvoice}>
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                <Button
                  onClick={download}
                  className="gradient-saffron text-saffron-foreground"
                >
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>

              <div
                className={
                  showPreview ? "overflow-auto" : "h-0 overflow-hidden"
                }
                aria-hidden={!showPreview}
              >
                <div
                  ref={invoiceRef}
                  className="bg-white text-black mx-auto rounded-lg border border-gray-300 shadow-card"
                  style={{
                    width: "210mm",
                    minHeight: "297mm",
                    padding: "10mm",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  <div
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
                              padding: "10px 20px",
                              minHeight: 145,
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
                                  width: 210,
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
                                  fontSize: 12.5,
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
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "2px solid #4a4a4a",
                      marginTop: 10,
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ ...headCell, width: 34 }}>#</th>
                        <th style={headCell}>Site Name (Project Name)</th>
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
                          Price/ Unit($)
                        </th>

                        <th
                          style={{
                            ...headCell,
                            textAlign: "right",
                          }}
                        >
                          Amount($)
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {/* Item Rows */}
                      {lines.map((l, i) => (
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
                            {usd(l.price)}
                          </td>

                          <td
                            style={{
                              ...cell,
                              textAlign: "right",
                            }}
                          >
                            {usd(l.amount)}
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
                          {usd(subTotal)}
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
                              {usd(subTotal, 4)}
                            </span>
                          </div>
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
                            <span>Round Off</span>

                            <span>
                              <span style={{ marginRight: "250px" }}>:</span>
                              {roundOff < 0 ? "- " : ""}
                              {usd(Math.abs(roundOff), 4)}
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
                              {usd(rounded, 4)}
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
                          {dollarsInWords(rounded)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div>
                    <table
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
