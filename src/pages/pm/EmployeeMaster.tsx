import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "@/components/pm/AppShell";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 8;

const EmployeeMaster = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo;
  const forSiteId = (location.state as any)?.forSiteId;

  const [form, setForm] = useState({ name: "", email: "", mobile: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState({ name: "", email: "", mobile: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = () => {
    if (!form.name.trim()) return toast.error("Employee name required");
    const e = addEmployee({ name: form.name, email: form.email || undefined, mobile: form.mobile || undefined });
    setForm({ name: "", email: "", mobile: "" });
    toast.success("Employee added");
    if (returnTo) navigate(returnTo, { state: { newEmployeeId: e.id, forSiteId } });
  };

  const startEdit = (id: string, e: typeof editValue) => {
    setEditingId(id);
    setEditValue({ name: e.name, email: e.email || "", mobile: e.mobile || "" });
  };
  const saveEdit = () => {
    if (!editValue.name.trim()) return toast.error("Name required");
    updateEmployee(editingId!, {
      name: editValue.name.trim(),
      email: editValue.email || undefined,
      mobile: editValue.mobile || undefined,
    });
    setEditingId(null);
    toast.success("Updated");
  };

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employee Master</h1>
            <p className="text-muted-foreground">Manage team members used as assignees</p>
          </div>
          {returnTo && (
            <Button variant="outline" onClick={() => navigate(returnTo)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
        </div>

        <Card className="p-5 space-y-3">
          <label className="text-sm font-medium block">Add Employee</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="Employee Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Email (optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Mobile (optional)" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAdd} className="gradient-saffron text-saffron-foreground">
              <Plus className="h-4 w-4 mr-2" /> Add Employee
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
            <h2 className="font-semibold">Employees ({filtered.length})</h2>
            <div className="relative w-64 max-w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Mobile</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((e, i) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-3 text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      {editingId === e.id ? (
                        <>
                          <td className="px-4 py-3"><Input value={editValue.name} onChange={(ev) => setEditValue({ ...editValue, name: ev.target.value })} /></td>
                          <td className="px-4 py-3"><Input value={editValue.email} onChange={(ev) => setEditValue({ ...editValue, email: ev.target.value })} /></td>
                          <td className="px-4 py-3"><Input value={editValue.mobile} onChange={(ev) => setEditValue({ ...editValue, mobile: ev.target.value })} /></td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <Button size="icon" variant="ghost" onClick={saveEdit}><Save className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">{e.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{e.email || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{e.mobile || "-"}</td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <Button size="icon" variant="ghost" onClick={() => startEdit(e.id, { name: e.name, email: e.email || "", mobile: e.mobile || "" })}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => {
                              if (confirm(`Delete "${e.name}"?`)) { deleteEmployee(e.id); toast.success("Deleted"); }
                            }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
};

export default EmployeeMaster;
