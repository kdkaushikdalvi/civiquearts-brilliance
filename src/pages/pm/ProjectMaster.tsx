import { ReactNode, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "@/components/pm/AppShell";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Pencil, Plus, Save, Search, Trash2, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import SearchableSelect from "@/components/pm/SearchableSelect";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Project name required");
    if (!clientId) return toast.error("Select a client");
    const client = clients.find((c) => c.id === clientId);
    const p = await addProject(trimmed, clientId, client?.name);
    setName("");
    if (!p) return;
    toast.success("Project added");
    if (returnTo) {
      navigate(returnTo, { state: { newProjectId: p.id } });
    }
  };

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditValue(current);
  };
  const saveEdit = () => {
    if (!editValue.trim()) return toast.error("Name required");
    updateProject(editingId!, editValue.trim());
    setEditingId(null);
    toast.success("Updated");
  };

  return (
    <MasterWrapper embedded={embedded}>
      <div className={embedded ? "space-y-6" : "p-6 max-w-4xl mx-auto space-y-6"}>
        <div className="flex items-center justify-between">
          <div>
            {!embedded && <h1 className="text-2xl font-bold text-foreground">Project List</h1>}
          </div>
          {returnTo && (
            <Button variant="outline" onClick={() => navigate(returnTo)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
        </div>

        <Card className="p-5">
          <label className="text-sm font-medium mb-2 block">Add Project</label>
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
            <Button onClick={handleAdd} className="gradient-saffron text-saffron-foreground">
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
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
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      No projects found.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((p, i) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3 text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-4 py-3">
                        {editingId === p.id ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveEdit();
                              }
                            }}
                          />
                        ) : (
                          <span>
                            {p.name}
                            {p.clientName && (
                              <span className="text-muted-foreground"> — {p.clientName}</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {editingId === p.id ? (
                          <>
                            <Button size="icon" variant="ghost" onClick={saveEdit}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => startEdit(p.id, p.name)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm(`Delete "${p.name}"?`)) {
                                  deleteProject(p.id);
                                  toast.success("Deleted");
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
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
      </div>
    </MasterWrapper>
  );
};

export default ProjectMaster;
