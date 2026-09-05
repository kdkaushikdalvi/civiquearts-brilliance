import { ReactNode, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "@/components/pm/AppShell";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Pencil, Plus, Search, Trash2, ArrowLeft, MoreHorizontal } from "lucide-react";
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
import { Project } from "@/types/pm";

const PAGE_SIZE = 8;
const MasterWrapper = ({ embedded, children }: { embedded: boolean; children: ReactNode }) =>
  embedded ? <>{children}</> : <AppShell>{children}</AppShell>;

const ProjectMaster = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const { projects, clients, addClient, addProject, updateProject, deleteProject } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo;

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Edit project modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setEditName(p.name);
    setEditClientId(p.clientId || "");
    setEditPrice(p.defaultPrice != null ? String(p.defaultPrice) : "");
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;
    const trimmed = editName.trim();
    if (!trimmed) return toast.error("Project name required");
    const price = editPrice.trim() === "" ? undefined : Number(editPrice);
    if (price !== undefined && (isNaN(price) || price < 0)) return toast.error("Enter a valid default price");

    setIsSaving(true);
    const client = clients.find((c) => c.id === editClientId);
    await updateProject(
      editingProject.id,
      trimmed,
      price,
      editClientId || undefined,
      client?.name
    );
    setIsSaving(false);
    toast.success("Project updated successfully");
    setEditingProject(null);
  };

  const handleDelete = (p: Project) => {
    if (confirm(`Delete project "${p.name}"?`)) {
      deleteProject(p.id);
      toast.success("Deleted");
    }
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Project name required");
    if (!clientId) return toast.error("Select a client");
    const price = defaultPrice.trim() === "" ? undefined : Number(defaultPrice);
    if (price !== undefined && (isNaN(price) || price < 0)) return toast.error("Enter a valid default price");
    const client = clients.find((c) => c.id === clientId);
    const p = await addProject(trimmed, clientId, client?.name, price);
    setName("");
    setDefaultPrice("");
    if (!p) return;
    toast.success("Project added");
    if (returnTo) {
      navigate(returnTo, { state: { newProjectId: p.id } });
    }
  };

  return (
    <MasterWrapper embedded={embedded}>
      <div className={embedded ? "space-y-6" : "p-6 max-w-4xl mx-auto space-y-6"}>
        <div className="relative flex items-center justify-between bg-slate-50 pb-4 before:absolute before:bottom-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-b before:border-slate-200 before:content-['']">
          <div>
            {!embedded && <h3 className="text-xl font-semibold text-sky-800">Project List</h3>}
          </div>
          {returnTo && (
            <Button variant="outline" onClick={() => navigate(returnTo)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
        </div>

        <Card className="p-5">
          <label className="mb-2 block text-sm font-semibold text-sky-800">Add Project</label>
          <div className="mb-2">
            <SearchableSelect
              value={clientId}
              onChange={setClientId}
              options={clients.map((c) => ({ id: c.id, label: c.name }))}
              placeholder="Select Client *"
              emptyActionLabel="Add Client"
              onEmptyAction={async (query) => {
                if (!query) return toast.error("Client name required");
                const c = await addClient(query);
                if (c) {
                  setClientId(c.id);
                  toast.success("Client added");
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Project Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Input
              placeholder="Default Price (e.g. 0.25)"
              type="number"
              min="0"
              step="any"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-56"
            />
            <Button onClick={handleAdd} className="bg-[#5c24ff] text-white hover:bg-[#4b1ed6]">
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between gap-4 bg-gradient-to-r from-[#24105c] via-[#5c24ff] to-[#e91e9b] text-white">
            <h2 className="font-semibold">Projects ({filtered.length})</h2>
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
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Project Name</th>
                  <th className="px-4 py-3 font-semibold">Default Price</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No projects found.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((p, i) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3 text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-4 py-3">
                        <span>
                          {p.name}
                          {p.clientName && (
                            <span className="text-muted-foreground"> — {p.clientName}</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.defaultPrice != null ? p.defaultPrice : "—"}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-900"
                              title="Actions"
                              aria-label={`Actions for ${p.name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 rounded-xl p-1.5 shadow-lg border-slate-200">
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(p)}
                              className="cursor-pointer rounded-lg text-xs font-medium"
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5 text-slate-500" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(p)}
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
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </Card>

        <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900">Edit Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Client Mapping
                </label>
                <SearchableSelect
                  value={editClientId}
                  onChange={setEditClientId}
                  options={clients.map((c) => ({ id: c.id, label: c.name }))}
                  placeholder="Select Client"
                  title="Select Client"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Project Name *
                </label>
                <Input
                  placeholder="Enter project name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Default Price
                </label>
                <Input
                  placeholder="Default Price (e.g. 0.25)"
                  type="number"
                  min="0"
                  step="any"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setEditingProject(null)}
                className="rounded-xl"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-[#5c24ff] text-white hover:bg-[#4b1ed6] rounded-xl"
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

export default ProjectMaster;
