import { ReactNode, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Pencil, Plus, Search, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
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
import { Client } from "@/types/pm";

const PAGE_SIZE = 8;
const MasterWrapper = ({ embedded, children }: { embedded: boolean; children: ReactNode }) =>
  embedded ? <>{children}</> : <AppShell>{children}</AppShell>;

const ClientMaster = ({ embedded = false }: { embedded?: boolean }) => {
  const { clients, addClient, updateClient, deleteClient } = useData();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Edit client modal state
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async () => {
    if (!name.trim()) return toast.error("Client name required");
    if (await addClient(name.trim())) {
      setName("");
      toast.success("Client added");
    }
  };

  const handleOpenEdit = (c: Client) => {
    setEditingClient(c);
    setEditName(c.name);
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    const trimmed = editName.trim();
    if (!trimmed) return toast.error("Client name required");
    setIsSaving(true);
    await updateClient(editingClient.id, trimmed);
    setIsSaving(false);
    setEditingClient(null);
    toast.success("Client updated successfully");
  };

  const handleDelete = (c: Client) => {
    if (confirm(`Delete client "${c.name}"?`)) {
      deleteClient(c.id);
      toast.success("Deleted");
    }
  };

  return (
    <MasterWrapper embedded={embedded}>
      <div className={embedded ? "space-y-6" : "p-6 max-w-4xl mx-auto space-y-6"}>
        {!embedded && (
          <div className="relative bg-slate-50 pb-4 before:absolute before:bottom-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-b before:border-slate-200 before:content-['']">
            <h3 className="text-xl font-semibold text-orange-800">Client List</h3>
          </div>
        )}
        <Card className="p-5">
          <label className="mb-2 block text-sm font-semibold text-orange-800">Add Client</label>
          <div className="flex gap-2">
            <Input
              placeholder="Client Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} className="gradient-saffron text-saffron-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between gap-4 bg-gradient-to-r from-[#24105c] via-[#5c24ff] to-[#e91e9b] text-white">
            <h2 className="font-semibold">Clients ({filtered.length})</h2>
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
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Client Name</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No clients found.
                  </td>
                </tr>
              ) : (
                pageItems.map((c, i) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3 text-muted-foreground">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-900"
                            title="Actions"
                            aria-label={`Actions for ${c.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32 rounded-xl p-1.5 shadow-lg border-slate-200">
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(c)}
                            className="cursor-pointer rounded-lg text-xs font-medium"
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5 text-slate-500" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(c)}
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </Card>

        <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900">Edit Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Client Name *
                </label>
                <Input
                  placeholder="Enter client name"
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
                onClick={() => setEditingClient(null)}
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
export default ClientMaster;
