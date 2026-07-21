import { useRef, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Download, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type Row = (string | number)[];

const UploadCsv = () => {
  const [file, setFile] = useState<File | null>(null);
  const [accountingCode, setAccountingCode] = useState("");
  const [processed, setProcessed] = useState<{
    rows: Row[];
    headers: string[];
    filledCount: number;
    baseName: string;
  } | null>(null);
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

  const handleProcess = async () => {
    if (!accountingCode.trim()) return toast.error("Accounting Code is required");
    if (!file) return toast.error("Please upload a CSV or Excel file first");

    try {
      const isCsv = /\.csv$/i.test(file.name);
      let wb: XLSX.WorkBook;
      if (isCsv) {
        const text = await file.text();
        wb = XLSX.read(text, { type: "string", raw: true });
      } else {
        const buf = await file.arrayBuffer();
        wb = XLSX.read(buf, { type: "array" });
      }
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, defval: "", blankrows: true });

      if (data.length === 0) return toast.error("File is empty");

      // Detect header row (contains "Accounting Code" or "Projects")
      let headerIdx = 0;
      for (let i = 0; i < Math.min(data.length, 5); i++) {
        const joined = data[i].map((c) => String(c).toLowerCase()).join("|");
        if (joined.includes("accounting code") || joined.includes("projects")) {
          headerIdx = i;
          break;
        }
      }
      const headerRow = data[headerIdx].map((c) => String(c));
      let acCol = headerRow.findIndex((h) => h.toLowerCase().includes("accounting code"));
      const srCol = headerRow.findIndex((h) => h.toLowerCase().includes("sr"));

      // If no Accounting Code column, append it
      if (acCol === -1) {
        acCol = headerRow.length;
        headerRow.push("Accounting Code");
        data[headerIdx] = headerRow;
      }

      const code = accountingCode.trim();
      let filled = 0;
      for (let i = headerIdx + 1; i < data.length; i++) {
        const row = [...data[i]];
        // Ensure width
        while (row.length <= acCol) row.push("");
        const srVal = srCol >= 0 ? String(row[srCol] ?? "").trim() : String(row[0] ?? "").trim();
        const projectsCol = headerRow.findIndex((h) => h.toLowerCase().includes("projects"));
        const projVal = projectsCol >= 0 ? String(row[projectsCol] ?? "").trim() : "";
        // A "project row" has a numeric Sr No. and a non-empty project name
        if (/^\d+$/.test(srVal) && projVal !== "") {
          row[acCol] = code;
          filled++;
        }
        data[i] = row;
      }

      const baseName = file.name.replace(/\.csv$/i, "");
      setProcessed({ rows: data, headers: headerRow, filledCount: filled, baseName });
      toast.success(`Processed ${filled} project rows`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to process the CSV file");
    }
  };

  const downloadFile = (kind: "xlsx" | "csv") => {
    if (!processed) return;
    const ws = XLSX.utils.aoa_to_sheet(processed.rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const filename = `${processed.baseName}-updated.${kind}`;
    XLSX.writeFile(wb, filename, { bookType: kind });
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
          <p className="text-muted-foreground">
            Auto-fill Accounting Code for all project rows and download the updated file.
          </p>
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
            <Label>Upload CSV</Label>
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
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
              Process CSV
            </Button>
          </div>
        </Card>

        {processed && (
          <Card className="p-6 space-y-4 border-green-500/40 bg-green-500/5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">
                  CSV processed successfully.
                </div>
                <div className="text-sm text-muted-foreground">
                  Accounting Code added to {processed.filledCount} matching project row
                  {processed.filledCount === 1 ? "" : "s"}.
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
