import { useRef, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Download, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";

type ProcessedXlsx = {
  kind: "xlsx";
  workbook: ExcelJS.Workbook;
  filledCount: number;
  baseName: string;
};

type ProcessedCsv = {
  kind: "csv";
  rows: string[][];
  filledCount: number;
  baseName: string;
};

type Processed = ProcessedXlsx | ProcessedCsv;

const UploadCsv = () => {
  const [file, setFile] = useState<File | null>(null);
  const [accountingCode, setAccountingCode] = useState("");
  const [processed, setProcessed] = useState<Processed | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPickFile = (f: File | null) => {
    if (!f) return;
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) {
      toast.error("Please upload a valid .csv or .xlsx file");
      return;
    }
    setFile(f);
    setProcessed(null);
  };

  // Simple CSV parser preserving quoted fields
  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let cur: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { cur.push(field); field = ""; }
        else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
        else if (c === "\r") { /* skip */ }
        else field += c;
      }
    }
    if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
    return rows;
  };

  const toCsv = (rows: string[][]): string =>
    rows.map((r) => r.map((v) => {
      const s = v ?? "";
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\r\n");

  const findHeaderInfo = (getRow: (i: number) => string[], maxScan: number) => {
    let headerIdx = 0;
    for (let i = 0; i < maxScan; i++) {
      const joined = getRow(i).map((c) => String(c).toLowerCase()).join("|");
      if (joined.includes("accounting code") || joined.includes("projects")) {
        headerIdx = i;
        break;
      }
    }
    const headerRow = getRow(headerIdx).map((c) => String(c));
    const acCol = headerRow.findIndex((h) => h.toLowerCase().includes("accounting code"));
    const srCol = headerRow.findIndex((h) => h.toLowerCase().includes("sr"));
    const projectsCol = headerRow.findIndex((h) => h.toLowerCase().includes("projects"));
    return { headerIdx, headerRow, acCol, srCol, projectsCol };
  };

  const handleProcess = async () => {
    if (!accountingCode.trim()) return toast.error("Accounting Code is required");
    if (!file) return toast.error("Please upload a CSV or Excel file first");

    const code = accountingCode.trim();
    const baseName = file.name.replace(/\.(csv|xlsx|xls)$/i, "");
    const isCsv = /\.csv$/i.test(file.name);

    try {
      if (isCsv) {
        const text = await file.text();
        const rows = parseCsv(text);
        if (rows.length === 0) return toast.error("File is empty");
        const info = findHeaderInfo((i) => rows[i] ?? [], Math.min(rows.length, 10));
        let acCol = info.acCol;
        if (acCol === -1) {
          acCol = info.headerRow.length;
          info.headerRow.push("Accounting Code");
          rows[info.headerIdx] = info.headerRow;
        }
        let filled = 0;
        for (let i = info.headerIdx + 1; i < rows.length; i++) {
          const row = rows[i] ?? [];
          while (row.length <= acCol) row.push("");
          const srVal = info.srCol >= 0 ? String(row[info.srCol] ?? "").trim() : String(row[0] ?? "").trim();
          const projVal = info.projectsCol >= 0 ? String(row[info.projectsCol] ?? "").trim() : "";
          if (/^\d+$/.test(srVal) && projVal !== "") {
            row[acCol] = code;
            filled++;
          }
          rows[i] = row;
        }
        setProcessed({ kind: "csv", rows, filledCount: filled, baseName });
        toast.success(`Processed ${filled} project rows`);
      } else {
        // XLSX — preserve original formatting/fonts using ExcelJS
        const buf = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buf);
        const sheet = workbook.worksheets[0];
        if (!sheet) return toast.error("File has no sheets");

        const maxScan = Math.min(sheet.rowCount, 10);
        const getRowValues = (i: number): string[] => {
          const r = sheet.getRow(i + 1); // exceljs is 1-indexed
          const out: string[] = [];
          const vals = r.values as unknown[];
          // vals[0] is undefined placeholder
          for (let c = 1; c < vals.length; c++) {
            const v = vals[c];
            out.push(v == null ? "" : typeof v === "object" && "text" in (v as any) ? String((v as any).text) : String(v));
          }
          return out;
        };
        const info = findHeaderInfo(getRowValues, maxScan);
        let acCol = info.acCol; // 0-based
        if (acCol === -1) {
          acCol = info.headerRow.length;
          const headerRow = sheet.getRow(info.headerIdx + 1);
          headerRow.getCell(acCol + 1).value = "Accounting Code";
          headerRow.commit();
        }

        let filled = 0;
        for (let i = info.headerIdx + 1; i < sheet.rowCount; i++) {
          const rowValues = getRowValues(i);
          const srVal = info.srCol >= 0 ? String(rowValues[info.srCol] ?? "").trim() : String(rowValues[0] ?? "").trim();
          const projVal = info.projectsCol >= 0 ? String(rowValues[info.projectsCol] ?? "").trim() : "";
          if (/^\d+$/.test(srVal) && projVal !== "") {
            const row = sheet.getRow(i + 1);
            row.getCell(acCol + 1).value = code;
            filled++;
          }
        }

        setProcessed({ kind: "xlsx", workbook, filledCount: filled, baseName });
        toast.success(`Processed ${filled} project rows`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to process the file");
    }
  };

  const downloadFile = async (kind: "xlsx" | "csv") => {
    if (!processed) return;
    const filename = `${processed.baseName}-updated.${kind}`;

    if (kind === "xlsx" && processed.kind === "xlsx") {
      const buf = await processed.workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      triggerDownload(blob, filename);
      return;
    }

    if (kind === "csv") {
      let csv: string;
      if (processed.kind === "csv") csv = toCsv(processed.rows);
      else {
        const sheet = processed.workbook.worksheets[0];
        const rows: string[][] = [];
        for (let i = 1; i <= sheet.rowCount; i++) {
          const r = sheet.getRow(i);
          const vals = r.values as unknown[];
          const out: string[] = [];
          for (let c = 1; c < vals.length; c++) {
            const v = vals[c];
            out.push(v == null ? "" : typeof v === "object" && "text" in (v as any) ? String((v as any).text) : String(v));
          }
          rows.push(out);
        }
        csv = toCsv(rows);
      }
      triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
      return;
    }

    if (kind === "xlsx" && processed.kind === "csv") {
      // Build a fresh xlsx from csv rows (no source styles to preserve)
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Sheet1");
      processed.rows.forEach((r) => ws.addRow(r));
      const buf = await wb.xlsx.writeBuffer();
      triggerDownload(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        filename,
      );
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFile(null);
    setAccountingCode("");
    setProcessed(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload CSV</h1>
        </div>

        <Card className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="ac">Accounting Code</Label>
            <Input
              id="ac"
              placeholder="e.g. AC-2026-001"
              value={accountingCode}
              onChange={(e) => setAccountingCode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Upload File (CSV or Excel)</Label>
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                className="hidden"
                id="csv-file"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" /> Choose File
              </Button>
              {file && (
                <div className="flex items-center gap-2 text-sm bg-secondary/60 rounded-md px-3 py-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-saffron" />
                  <span className="truncate max-w-[220px]">{file.name}</span>
                  <button
                    onClick={reset}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleProcess}
              className="gradient-saffron text-saffron-foreground"
            >
              Process File
            </Button>
          </div>
        </Card>

        {processed && (
          <Card className="p-6 space-y-4 border-green-500/40 bg-green-500/5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">
                  File processed successfully.
                </div>
                <div className="text-sm text-muted-foreground">
                  Accounting Code added to {processed.filledCount} matching project row
                  {processed.filledCount === 1 ? "" : "s"}. Original formatting preserved.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => downloadFile("xlsx")}
                className="gradient-saffron text-saffron-foreground"
              >
                <Download className="h-4 w-4 mr-2" /> Download Updated Excel
              </Button>
              <Button variant="outline" onClick={() => downloadFile("csv")}>
                <Download className="h-4 w-4 mr-2" /> Download Updated CSV
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
};

export default UploadCsv;
