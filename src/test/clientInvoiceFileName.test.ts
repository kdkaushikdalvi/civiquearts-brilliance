import { describe, it, expect } from "vitest";
import {
  formatClientInvoiceFileName,
  getFinancialYear,
  formatInvoiceDateCode,
  parseInvoiceDate,
} from "@/lib/clientInvoiceFormat";

describe("Client Invoice File Name Formatter", () => {
  it("formats file name in requested pattern: CAPL-INV-25-26-26_26_06_26", () => {
    const fileName = formatClientInvoiceFileName("CAPL-INV-25-26-26", "2026-06-26");
    expect(fileName).toBe("CAPL-INV-25-26-26_26_06_26");
  });

  it("handles invoice number with just number e.g. 26 with 2025-06-26 date", () => {
    const fileName = formatClientInvoiceFileName("26", "2025-06-26");
    expect(fileName).toBe("CAPL-INV-25-26-26_26_06_25");
  });

  it("handles invoice number with CAPL-INV-26", () => {
    const fileName = formatClientInvoiceFileName("CAPL-INV-26", "2025-06-26");
    expect(fileName).toBe("CAPL-INV-25-26-26_26_06_25");
  });

  it("preserves financial year in CAPL-INV-25-26-08", () => {
    const fileName = formatClientInvoiceFileName("CAPL-INV-25-26-08", "2026-06-26");
    expect(fileName).toBe("CAPL-INV-25-26-08_26_06_26");
  });

  it("calculates Indian Financial Year properly", () => {
    expect(getFinancialYear(1, 2026)).toBe("25-26");
    expect(getFinancialYear(3, 2026)).toBe("25-26");
    expect(getFinancialYear(4, 2026)).toBe("26-27");
    expect(getFinancialYear(6, 2025)).toBe("25-26");
  });

  it("formats date code as DD_MM_YY", () => {
    const dateParts = parseInvoiceDate("2026-06-26");
    expect(formatInvoiceDateCode(dateParts)).toBe("26_06_26");
  });
});
