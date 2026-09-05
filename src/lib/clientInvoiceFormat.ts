/**
 * Helper to compute the formatted file name for Client Invoice.
 * Pattern requested:
 * CAPL-INV-[FINANCIAL YEAR]-[INVOICE NUMBER]_[DATE]
 * (e.g., CAPL-INV-25-26-26_26_06_26.pdf)
 */

export interface InvoiceDateParts {
  day: number;
  month: number;
  year: number;
}

export const parseInvoiceDate = (dateStr?: string): InvoiceDateParts => {
  if (dateStr) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return { year, month, day };
      }
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return {
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate(),
      };
    }
  }

  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
};

/**
 * Calculates Indian Financial Year (starts April 1, ends March 31).
 * Returns format: "25-26"
 */
export const getFinancialYear = (month: number, year: number): string => {
  const fyStart = month >= 4 ? year : year - 1;
  const fyEnd = fyStart + 1;
  const startStr = String(fyStart % 100).padStart(2, "0");
  const endStr = String(fyEnd % 100).padStart(2, "0");
  return `${startStr}-${endStr}`;
};

/**
 * Formats the date as DD_MM_YY (e.g. 26_06_26)
 */
export const formatInvoiceDateCode = (dateParts: InvoiceDateParts): string => {
  const dd = String(dateParts.day).padStart(2, "0");
  const mm = String(dateParts.month).padStart(2, "0");
  const yy = String(dateParts.year % 100).padStart(2, "0");
  return `${dd}_${mm}_${yy}`;
};

/**
 * Computes the client invoice file name in the requested pattern:
 * CAPL-INV-[FINANCIAL YEAR]-[INVOICE NUMBER]_[DATE]
 * e.g. CAPL-INV-25-26-26_26_06_26
 */
export const formatClientInvoiceFileName = (
  rawInvoiceNumber: string,
  rawInvoiceDate: string
): string => {
  const dateParts = parseInvoiceDate(rawInvoiceDate);
  const dateCode = formatInvoiceDateCode(dateParts);
  const calculatedFy = getFinancialYear(dateParts.month, dateParts.year);

  const trimmed = (rawInvoiceNumber || "").trim();

  // If already matches the complete pattern with date suffix e.g. CAPL-INV-25-26-26_26_06_26
  if (/^CAPL-INV-.*_\d{2}_\d{2}_\d{2}$/i.test(trimmed)) {
    return trimmed;
  }

  let base = "";

  // Check if invoice number matches CAPL-INV-(FY)-(NUMBER) e.g. CAPL-INV-25-26-26
  const fullMatch = trimmed.match(/^CAPL-INV-(\d{2}-\d{2})-(.+)$/i);
  if (fullMatch) {
    const fy = fullMatch[1];
    const invNum = fullMatch[2].trim();
    base = `CAPL-INV-${fy}-${invNum}`;
  } else {
    // Check if invoice number matches CAPL-INV-(NUMBER) e.g. CAPL-INV-26
    const caplMatch = trimmed.match(/^CAPL-INV-(.+)$/i);
    if (caplMatch) {
      const invNum = caplMatch[1].trim();
      base = `CAPL-INV-${calculatedFy}-${invNum}`;
    } else if (trimmed) {
      // User entered a number or code e.g. "26" or "08"
      const cleanNum = trimmed.replace(/^[#/ -]+/, "");
      base = `CAPL-INV-${calculatedFy}-${cleanNum}`;
    } else {
      // Fallback if blank
      base = `CAPL-INV-${calculatedFy}-01`;
    }
  }

  return `${base}_${dateCode}`;
};
