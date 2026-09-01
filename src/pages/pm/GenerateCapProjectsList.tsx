import { useMemo, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import MonthNavigator, { MONTH_NAMES } from "@/components/pm/MonthNavigator";
import SearchableSelect from "@/components/pm/SearchableSelect";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import {
  capProjectsListFilename,
  generateAndDownloadCapProjectsList,
} from "@/lib/capProjectsListExcel";

const GenerateCapProjectsList = () => {
  const { assignments, projects } = useData();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState("all");

  const filtered = useMemo(
    () => assignments.filter((a) => a.month === month && a.year === year && (projectId === "all" || a.projectId === projectId)),
    [assignments, month, year, projectId]
  );

  const projectOptions = [
    { id: "all", label: "All Projects" },
    ...projects.map((project) => ({ id: project.id, label: project.name })),
  ];

  const filename = capProjectsListFilename(MONTH_NAMES[month], year);

  const handleGenerate = async () => {
    if (filtered.length === 0) {
      toast.error("No projects found for the selected month.");
      return;
    }
    setBusy(true);
    try {
      const count = await generateAndDownloadCapProjectsList(
        filtered,
        MONTH_NAMES[month],
        year
      );
      toast.success(
        `Downloaded ${filename} (${count} site${count === 1 ? "" : "s"})`
      );
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
        <div className="relative flex flex-wrap items-center justify-between gap-4 bg-slate-50 pb-4 before:absolute before:bottom-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-b before:border-slate-200 before:content-['']">
          <div>
            <h3 className="text-xl font-semibold text-emerald-800">
              Generate Excel
            </h3>
          </div>
          <MonthNavigator
            month={month}
            year={year}
            onChange={(m, y) => {
              setMonth(m);
              setYear(y);
            }}
          />
        </div>

        <Card className="p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-emerald-800">Project</label>
            <SearchableSelect value={projectId} onChange={setProjectId} options={projectOptions} placeholder="Select Project" />
          </div>
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="h-8 w-8 text-saffron shrink-0" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">
                  Output file:
                </span>{" "}
                {filename}
              </p>
              <p>
                <span className="font-medium text-foreground">Records:</span>{" "}
                {filtered.length} project{filtered.length === 1 ? "" : "s"} for{" "}
                {MONTH_NAMES[month]} {year}
              </p>
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
