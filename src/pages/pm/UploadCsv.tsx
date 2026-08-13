import { useRef, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { useData } from "@/contexts/DataContext";
import { getSiteCode, normalizeSiteName } from "@/lib/siteCodeMatching";

type ProcessedXlsx = {
  kind: "xlsx";
  workbook: ExcelJS.Workbook;
  baseName: string;
};

type ProcessedCsv = {
  kind: "csv";
  rows: string[][];
  baseName: string;
};

type Processed = ProcessedXlsx | ProcessedCsv;

const cellText = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as any;
    if ("text" in o) return String(o.text);
    if ("result" in o) return String(o.result ?? "");
    if ("richText" in o) return (o.richText as any[]).map((t) => t.text).join("");
  }
  return String(v);
};

const clean = (s: string) => (s ?? "").replace(/\u00a0/g, " ").trim();

const headerText = (value: string) => normalizeSiteName(clean(value));

const findMappingColumns = (rows: string[][]) => {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const headers = rows[rowIndex].map(headerText);
    const codeIndex = headers.findIndex((header) =>
      header.includes("accountingcode") || header.includes("accountcode") || header.includes("acccode"),
    );
    const siteIndex = headers.findIndex((header) =>
      /^(site|sitename|projects?|projectname)/.test(header),
    );
    if (codeIndex >= 0 && siteIndex >= 0) return { rowIndex, siteIndex, codeIndex };
  }

  // Preserve support for the original CAP template: site names in column B,
  // accounting codes in column C.
  return { rowIndex: -1, siteIndex: 1, codeIndex: 2 };
};

export const extractCodePairs = (rows: string[][]) => {
  const out: { siteName: string; code: string }[] = [];
  const seen = new Set<string>();
  const { rowIndex, siteIndex, codeIndex } = findMappingColumns(rows);
  for (const r of rows.slice(rowIndex + 1)) {
    const siteName = clean(r[siteIndex] ?? "");
    const code = clean(r[codeIndex] ?? "");
    if (!siteName || !code) continue;
    const ln = siteName.toLowerCase();
    const lc = code.toLowerCase();
    if (ln === "projects" || ln === "project" || ln === "site name" || ln === "sr no." ) continue;
    if (lc === "accounting code") continue;
    const key = normalizeSiteName(siteName);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ siteName, code });
  }
  return out;
};


const UploadCsv = () => {
  const { saveSiteCodes, siteCodes } = useData();
  const [pendingPairs, setPendingPairs] = useState<{ siteName: string; code: string }[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
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
    setPendingPairs(null);
    setConfirmed(false);
  };

  // Simple CSV parser preserving quoted fields
  const parseCsv = (text: string): string[][] => {
    const delimiters = [",", ";", "\t"];
    const delimiter = delimiters.reduce((best, candidate) =>
      text.split(candidate).length > text.split(best).length
        ? candidate
        : best,
    );
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
        else if (c === delimiter) { cur.push(field); field = ""; }
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

  const sheetToRows = (sheet: ExcelJS.Worksheet): string[][] => {
    const rows: string[][] = [];
    for (let i = 1; i <= sheet.rowCount; i++) {
      const vals = sheet.getRow(i).values as unknown[];
      const out: string[] = [];
      for (let c = 1; c < Math.max(vals.length, 4); c++) out.push(cellText(vals[c]));
      rows.push(out);
    }
    return rows;
  };

  const confirmMapping = async () => {
    const pairs = (pendingPairs ?? []).filter((p) => p.siteName.trim() && p.code.trim());
    if (pairs.length === 0) return toast.error("Nothing to save");
    setSaving(true);
    await saveSiteCodes(pairs);
    setSaving(false);
    setConfirmed(true);
    toast.success(`Saved ${pairs.length} site accounting code${pairs.length > 1 ? "s" : ""}`);
  };

  const handleProcess = async () => {
    if (!file) return toast.error("Please upload a CSV or Excel file first");

    const baseName = file.name.replace(/\.(csv|xlsx|xls)$/i, "");
    const isCsv = /\.csv$/i.test(file.name);

    try {
      if (isCsv) {
        const text = await file.text();
        const rows = parseCsv(text);
        if (rows.length === 0) return toast.error("File is empty");
        setProcessed({ kind: "csv", rows, baseName });
        setPendingPairs(extractCodePairs(rows));
        setConfirmed(false);
        toast.success("File processed");
      } else {
        // XLSX — preserve original formatting/fonts using ExcelJS
        const buf = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buf);
        if (!workbook.worksheets[0]) return toast.error("File has no sheets");
        setProcessed({ kind: "xlsx", workbook, baseName });
        setPendingPairs(extractCodePairs(sheetToRows(workbook.worksheets[0])));
        setConfirmed(false);
        toast.success("File processed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to process the file");
    }
  };

  const reset = () => {
    setFile(null);
    setProcessed(null);
    setPendingPairs(null);
    setConfirmed(false);
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

        {pendingPairs && (
          <Card className="p-6 space-y-4">
            <div>
              <div className="font-semibold text-foreground">
                Mapping preview {confirmed && <span className="text-green-600 text-sm font-medium">(saved)</span>}
              </div>
              <div className="text-sm text-muted-foreground">
                Review each site name and accounting code. Edit or remove rows, then confirm to apply them to invoice prefill.
              </div>
            </div>

            {pendingPairs.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No site rows with an accounting code were found in this file.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">#</th>
                      <th className="text-left px-4 py-2 font-semibold">Site Name</th>
                      <th className="text-left px-4 py-2 font-semibold">Accounting Code</th>
                      <th className="text-left px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPairs.map((p, i) => {
                      const existing = getSiteCode(siteCodes, p.siteName);
                      const status = !existing
                        ? "New"
                        : existing === p.code.trim()
                        ? "Unchanged"
                        : `Updates ${existing}`;
                      return (
                        <tr key={`${p.siteName}-${i}`} className="border-t border-border">
                          <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-2">
                            <Input
                              value={p.siteName}
                              onChange={(e) =>
                                setPendingPairs((prev) =>
                                  (prev ?? []).map((r, idx) => (idx === i ? { ...r, siteName: e.target.value } : r))
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              value={p.code}
                              onChange={(e) =>
                                setPendingPairs((prev) =>
                                  (prev ?? []).map((r, idx) => (idx === i ? { ...r, code: e.target.value } : r))
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{status}</td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() =>
                                setPendingPairs((prev) => (prev ?? []).filter((_, idx) => idx !== i))
                              }
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Remove row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {pendingPairs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={confirmMapping}
                  disabled={saving}
                  className="gradient-saffron text-saffron-foreground"
                >
                  {saving ? "Saving..." : confirmed ? "Save Again" : "Confirm & Save Mapping"}
                </Button>
                <Button variant="outline" onClick={() => setPendingPairs(null)}>
                  Discard Mapping
                </Button>
              </div>
            )}
          </Card>
        )}

      </div>
    </AppShell>
  );
};

export default UploadCsv;
