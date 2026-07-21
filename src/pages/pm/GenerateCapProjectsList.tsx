import { useMemo, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import MonthNavigator, { MONTH_NAMES } from "@/components/pm/MonthNavigator";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { capProjectsListFilename, generateAndDownloadCapProjectsList } from "@/lib/capProjectsListExcel";

const GenerateCapProjectsList = () => {
  const { assignments } = useData();
  const [month, setMonth] = useState(6); // July (0-indexed)
  const [year, setYear] = useState(2026);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => assignments.filter((a) => a.month === month && a.year === year),
    [assignments, month, year],
  );

  const filename = capProjectsListFilename(MONTH_NAMES[month], year);

  const handleGenerate = async () => {
    if (filtered.length === 0) {
      toast.error("No project assignments found for the selected month.");
      return;
    }
    setBusy(true);
    try {
      const count = await generateAndDownloadCapProjectsList(filtered, MONTH_NAMES[month], year);
      toast.success(`Downloaded ${filename} (${count} site${count === 1 ? "" : "s"})`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Excel file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">CAP Projects List</h1>
            <p className="text-muted-foreground">
              Export project names with sites for CAP upload (Accounting Code left blank).
            </p>
          </div>
          <MonthNavigator month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="h-8 w-8 text-saffron shrink-0" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Output file:</span> {filename}
              </p>
              <p>
                <span className="font-medium text-foreground">Records:</span>{" "}
                {filtered.length} assignment{filtered.length === 1 ? "" : "s"} for {MONTH_NAMES[month]} {year}
              </p>
              <ul className="list-disc pl-5 space-y-0.5 pt-1">
                <li>Project names as bold section headers; sites listed underneath</li>
                <li>Projects and sites sorted A–Z; Sr No. restarts per project</li>
                <li>Accounting Code column empty on every row</li>
              </ul>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={busy || filtered.length === 0}
            className="gradient-saffron text-saffron-foreground"
          >
            <Download className="h-4 w-4 mr-2" />
            {busy ? "Generating…" : "Generate & Download Excel"}
          </Button>
        </Card>
      </div>
    </AppShell>
  );
};

export default GenerateCapProjectsList;
