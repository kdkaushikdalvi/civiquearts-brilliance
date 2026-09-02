import { ReactNode, useState } from "react";
import AppShell from "@/components/pm/AppShell";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 8;
const MasterWrapper = ({ embedded, children }: { embedded: boolean; children: ReactNode }) =>
  embedded ? <>{children}</> : <AppShell>{children}</AppShell>;

const emptyForm = { name: "", details: "", gstin: "" };

const BillToMaster = ({ embedded = false }: { embedded?: boolean }) => {
  const { billTos, addBillTo, updateBillTo, deleteBillTo } = useData();
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const filtered = billTos.filter(
    (b) =>
      (b.name ?? "").trim() !== "" &&
      ((b.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (b.details ?? "").toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    if (!form.details.trim()) return toast.error("Address details required");
    if (await addBillTo(form)) {
      setForm(emptyForm);
      toast.success("Bill To added");
    }
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) return toast.error("Name required");
    if (!editForm.details.trim()) return toast.error("Address details required");
    await updateBillTo(editingId!, editForm);
    setEditingId(null);
    toast.success("Updated");
  };

  return (
    <MasterWrapper embedded={embedded}>
      <div className={embedded ? "space-y-6" : "p-6 max-w-4xl mx-auto space-y-6"}>
        {!embedded && (
          <div className="relative bg-slate-50 pb-4 before:absolute before:bottom-0 before:left-1/2 before:w-screen before:-translate-x-1/2 before:border-b before:border-slate-200 before:content-['']">
            <h3 className="text-xl font-semibold text-teal-800">Bill To List</h3>
          </div>
        )}

        <Card className="p-5 space-y-3">
          <label className="block text-sm font-semibold text-teal-800">Add Bill To</label>
          <Input
            placeholder="Company / Client Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Textarea
            placeholder="Address details (one per line)"
            value={form.details}
            onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
            rows={3}
          />
          <Button onClick={handleAdd} className="gradient-saffron text-saffron-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between gap-4 bg-gradient-to-r from-[#24105c] via-[#5c24ff] to-[#e91e9b] text-white">
            <h2 className="font-semibold">Bill To ({filtered.length})</h2>
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
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No Bill To entries found.
                  </td>
                </tr>
              ) : (
                pageItems.map((b, i) => (
                  <tr key={b.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 text-muted-foreground">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === b.id ? (
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        />
                      ) : (
                        <span className="font-medium">{b.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-pre-line">
                      {editingId === b.id ? (
                        <Textarea
                          value={editForm.details}
                          onChange={(e) => setEditForm((f) => ({ ...f, details: e.target.value }))}
                          rows={3}
                        />
                      ) : (
                        b.details
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === b.id ? (
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
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(b.id);
                              setEditForm({ name: b.name, details: b.details, gstin: b.gstin ?? "" });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteBillTo(b.id)}>
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="space-x-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </MasterWrapper>
  );
};

export default BillToMaster;
