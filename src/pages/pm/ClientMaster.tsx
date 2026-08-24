import { ReactNode, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 8;

const ClientMaster = ({ embedded = false }: { embedded?: boolean }) => {
  const { clients, addClient, updateClient, deleteClient } = useData();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const Wrapper = ({ children }: { children: ReactNode }) => embedded ? <>{children}</> : <AppShell>{children}</AppShell>;

  const handleAdd = async () => {
    if (!name.trim()) return toast.error("Client name required");
    if (await addClient(name.trim())) { setName(""); toast.success("Client added"); }
  };
  const saveEdit = async () => {
    if (!editValue.trim()) return toast.error("Name required");
    await updateClient(editingId!, editValue.trim());
    setEditingId(null);
    toast.success("Updated");
  };

  return <Wrapper><div className={embedded ? "space-y-6" : "p-6 max-w-4xl mx-auto space-y-6"}>
    {!embedded && <h1 className="text-2xl font-bold text-foreground">Client List</h1>}
    <Card className="p-5"><label className="text-sm font-medium mb-2 block">Add Client</label>
      <div className="flex gap-2"><Input placeholder="Client Name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <Button onClick={handleAdd} className="gradient-saffron text-saffron-foreground"><Plus className="h-4 w-4 mr-2" />Add</Button></div>
    </Card>
    <Card className="overflow-hidden"><div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4"><h2 className="font-semibold">Clients ({filtered.length})</h2>
      <div className="relative w-64 max-w-full"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" /></div></div>
      <table className="w-full text-sm"><thead className="bg-secondary/50 text-left"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Client Name</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>
        {pageItems.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No clients found.</td></tr> : pageItems.map((c, i) => <tr key={c.id} className="border-t border-border"><td className="px-4 py-3 text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</td><td className="px-4 py-3">{editingId === c.id ? <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit()} /> : c.name}</td><td className="px-4 py-3 text-right">{editingId === c.id ? <><Button size="icon" variant="ghost" onClick={saveEdit}><Save className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button></> : <><Button size="icon" variant="ghost" onClick={() => { setEditingId(c.id); setEditValue(c.name); }}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => deleteClient(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></>}</td></tr>)}</tbody></table>
      <div className="flex items-center justify-between px-5 py-3 border-t border-border"><span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span><div className="space-x-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div>
    </Card>
  </div></Wrapper>;
};
export default ClientMaster;
