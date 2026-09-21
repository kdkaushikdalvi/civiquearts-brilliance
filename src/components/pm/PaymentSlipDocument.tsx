import React from "react";
import logo from "@/assets/logo.png";
import { formatINR, formatNumber } from "@/lib/pmFormat";
import { cleanUnit } from "@/lib/unitFormat";
import type { Employee, Assignment } from "@/types";

export interface OtherSlipItem {
  id: string;
  assigneeId: string;
  month: number;
  year: number;
  project: string;
  site: string;
  unit: string;
  quantity: number;
  rate: number;
}

export interface PaymentSlipDocumentProps {
  assignee?: Employee;
  invoiceNumber: string;
  invoiceDate: string;
  filtered: Assignment[];
  addedOthers: OtherSlipItem[];
  totalQty: number;
  grandTotal: number;
}

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

export const PaymentSlipDocument = React.forwardRef<
  HTMLDivElement,
  PaymentSlipDocumentProps
>(function PaymentSlipDocument(
  {
    assignee,
    invoiceNumber,
    invoiceDate,
    filtered,
    addedOthers,
    totalQty,
    grandTotal,
  },
  ref
) {
  return (
    <div
      ref={ref}
      className="payment-slip mx-auto bg-white p-4 shadow-sm sm:p-5"
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
              <h1 style={{ margin: 0, fontSize: 18 }}>Civique Arts</h1>
              <p style={{ margin: "3px 0", fontSize: 13 }}>
                Ground Floor Ghar No 214 Milkat No 2841 Inamdar Wasti Koregaon Mul
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
              <b>Slip No.:</b> {invoiceNumber}
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
            <col style={{ width: "5%" }} />
            <col style={{ width: "45.4%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "12.6%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
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
                  textAlign: "left",
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
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {cleanUnit(a.unitType)}
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
                    {item.site && item.project
                      ? `${item.site} - (${item.project})`
                      : item.site || item.project || "Other Item"}
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
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {cleanUnit(item.unit)}
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
            <col style={{ width: "5%" }} />
            <col style={{ width: "45.4%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "12.6%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
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
                <b>Amount in Words:</b> {amountInWords(grandTotal)}
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
  );
});

export default PaymentSlipDocument;
