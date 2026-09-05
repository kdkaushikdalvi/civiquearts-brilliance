import { ReactNode, useMemo, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Search, Trash2, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";
import SearchableSelect from "@/components/pm/SearchableSelect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Site } from "@/types/pm";

const PAGE_SIZE = 8;
const MasterWrapper = ({ embedded, children }: { embedded: boolean; children: ReactNode }) =>
  embedded ? <>{children}</> : <AppShell>{children}</AppShell>;

const SiteList = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const { sites, projects, addSite, updateSite, deleteSite } = useData();
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Edit site modal state
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editName, setEditName] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEdit = (s: Site) => {
    setEditingSite(s);
    setEditName(s.name);
    setEditProjectId(s.projectId);
  };

  const handleSaveEdit = async () => {
    if (!editingSite) return;
    if (!editProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (!editName.trim()) {
      toast.error("Site name is required");
      return;
    }
    setIsSaving(true);
    const updated = await updateSite(editingSite.id, {
      name: editName.trim(),
      projectId: editProjectId,
    });
    setIsSaving(false);
    if (updated) {
      toast.success("Site updated successfully");
      setEditingSite(null);
    }
  };

  const handleDelete = (s: { id: string; name: string }) => {
    if (confirm(`Delete site "${s.name}"?`)) {
      deleteSite(s.id);
      toast.success("Site deleted");
    }
  };

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

  return (
    <MasterWrapper embedded={embedded}>
      <div className={embedded ? "space-y-6" : "p-6 max-w-5xl mx-auto space-y-6"}>
        {!embedded && <div className="relative bg-slate-50 pb-4 before:absolute before:bottom-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-b before:border-slate-200 before:content-['']"><h3 className="text-xl font-semibold text-lime-800">Site List</h3></div>}

        <Card className="p-5 space-y-3">
          <label className="block text-sm font-semibold text-lime-800">Add Site</label>
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
          <div className="px-5 py-3 flex items-center justify-between gap-4 bg-gradient-to-r from-[#24105c] via-[#5c24ff] to-[#e91e9b] text-white">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-900"
                              title="Actions"
                              aria-label={`Actions for ${s.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 rounded-xl p-1.5 shadow-lg border-slate-200">
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(s)}
                              className="cursor-pointer rounded-lg text-xs font-medium"
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5 text-slate-500" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(s)}
                              className="cursor-pointer rounded-lg text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

        <Dialog open={!!editingSite} onOpenChange={(open) => !open && setEditingSite(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900">Edit Site</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Project *
                </label>
                <SearchableSelect
                  value={editProjectId}
                  onChange={setEditProjectId}
                  options={projects.map((p) => ({ id: p.id, label: p.name }))}
                  placeholder="Select Project *"
                  title="Select Project *"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Site Name *
                </label>
                <Input
                  placeholder="Enter site name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setEditingSite(null)}
                className="rounded-xl"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="gradient-saffron text-saffron-foreground rounded-xl"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MasterWrapper>
  );
};

export default SiteList;
