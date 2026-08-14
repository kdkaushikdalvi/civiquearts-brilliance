import { ReactNode, useMemo, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import SearchableSelect from "@/components/pm/SearchableSelect";

const PAGE_SIZE = 8;

const SiteList = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const { sites, projects, addSite, deleteSite } = useData();
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const rows = useMemo(
    () =>
      sites
        .map((s) => ({
          ...s,
          projectName: projects.find((p) => p.id === s.projectId)?.name ?? "-",
        }))
        .filter(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.projectName.toLowerCase().includes(search.toLowerCase()),
        ),
    [sites, projects, search],
  );
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageItems = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async () => {
    if (!projectId) return toast.error("Select a project");
    if (!name.trim()) return toast.error("Site name required");
    const s = await addSite(projectId, name.trim());
    if (!s) return;
    setName("");
    toast.success("Site added");
  };

  const Wrapper = ({ children }: { children: ReactNode }) =>
    embedded ? <>{children}</> : <AppShell>{children}</AppShell>;

  return (
    <Wrapper>
      <div className={embedded ? "space-y-6" : "p-6 max-w-5xl mx-auto space-y-6"}>
        {!embedded && <h1 className="text-2xl font-bold text-foreground">Site List</h1>}

        <Card className="p-5 space-y-3">
          <label className="text-sm font-medium block">Add Site</label>
          <SearchableSelect
            value={projectId}
            onChange={setProjectId}
            options={projects.map((p) => ({ id: p.id, label: p.name }))}
            placeholder="Select Project *"
            title="Select Project*"
          />
          <div className="flex gap-2">
            <Input
              placeholder="Site Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button
              onClick={handleAdd}
              title="Add this site to the selected project"
              className="gradient-saffron text-saffron-foreground"
            >
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
            <h2 className="font-semibold whitespace-nowrap">Sites ({rows.length})</h2>
            <div className="relative w-64 max-w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">#</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap truncate max-w-[200px]" title="Site Name">
                    Site Name
                  </th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap truncate max-w-[200px]" title="Project">
                    Project
                  </th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No sites found.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((s, i) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3 max-w-[220px] truncate whitespace-nowrap" title={s.name}>
                        {s.name}
                      </td>
                      <td
                        className="px-4 py-3 max-w-[220px] truncate whitespace-nowrap text-muted-foreground"
                        title={s.projectName}
                      >
                        {s.projectName}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete this site"
                          onClick={() => {
                            if (confirm(`Delete "${s.name}"?`)) {
                              deleteSite(s.id);
                              toast.success("Deleted");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                title="Previous page"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                title="Next page"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      </div>
    </Wrapper>
  );
};

export default SiteList;
