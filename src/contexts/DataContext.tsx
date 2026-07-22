import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Assignment, Project, Employee, InvoiceRecord } from "@/types/pm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface DataContextValue {
  projects: Project[];
  employees: Employee[];
  assignments: Assignment[];
  invoices: InvoiceRecord[];
  loading: boolean;
  addProject: (name: string) => Promise<Project | null>;
  updateProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addEmployee: (data: Omit<Employee, "id">) => Promise<Employee | null>;
  updateEmployee: (id: string, data: Omit<Employee, "id">) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addAssignments: (records: Omit<Assignment, "id" | "createdAt">[]) => Promise<void>;
  updateAssignment: (id: string, patch: Partial<Assignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  addInvoice: (rec: Omit<InvoiceRecord, "id">) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

// Mapping helpers
const mapAssignment = (r: any): Assignment => ({
  id: r.id,
  projectId: r.project_id ?? "",
  projectName: r.project_name,
  siteName: r.site_name,
  assigneeId: r.assignee_id ?? "",
  assigneeName: r.assignee_name,
  month: r.month,
  year: r.year,
  status: r.status,
  unitType: r.unit_type ?? undefined,
  quantity: r.quantity ?? undefined,
  rate: r.rate ?? undefined,
  amount: r.amount ?? undefined,
  createdAt: r.created_at,
});

const mapInvoice = (r: any): InvoiceRecord => ({
  id: r.id,
  invoiceNumber: r.invoice_number,
  assigneeId: r.assignee_id ?? "",
  assigneeName: r.assignee_name,
  month: r.month,
  year: r.year,
  generatedDate: r.generated_date,
  generatedBy: r.generated_by ?? "",
  total: Number(r.total ?? 0),
});

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    if (!isAuthenticated) {
      setProjects([]); setEmployees([]); setAssignments([]); setInvoices([]);
      return;
    }
    setLoading(true);
    const [pRes, eRes, aRes, iRes] = await Promise.all([
      supabase.from("projects").select("*").order("name"),
      supabase.from("employees").select("*").order("name"),
      supabase.from("assignments").select("*").order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").order("generated_date", { ascending: false }),
    ]);
    if (pRes.data) setProjects(pRes.data.map((r: any) => ({ id: r.id, name: r.name })));
    if (eRes.data) setEmployees(eRes.data.map((r: any) => ({ id: r.id, name: r.name, mobile: r.mobile ?? undefined })));
    if (aRes.data) setAssignments(aRes.data.map(mapAssignment));
    if (iRes.data) setInvoices(iRes.data.map(mapInvoice));
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addProject = async (name: string) => {
    const { data, error } = await supabase.from("projects").insert({ name: name.trim() }).select().single();
    if (error || !data) { toast.error(error?.message || "Failed to add project"); return null; }
    const p = { id: data.id, name: data.name };
    setProjects((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
    return p;
  };
  const updateProject = async (id: string, name: string) => {
    const { error } = await supabase.from("projects").update({ name: name.trim() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)));
  };
  const deleteProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const addEmployee = async (data: Omit<Employee, "id">) => {
    const { data: row, error } = await supabase
      .from("employees")
      .insert({ name: data.name.trim(), mobile: data.mobile ?? null })
      .select().single();
    if (error || !row) { toast.error(error?.message || "Failed to add employee"); return null; }
    const e = { id: row.id, name: row.name, mobile: row.mobile ?? undefined };
    setEmployees((prev) => [...prev, e].sort((a, b) => a.name.localeCompare(b.name)));
    return e;
  };
  const updateEmployee = async (id: string, data: Omit<Employee, "id">) => {
    const { error } = await supabase
      .from("employees")
      .update({ name: data.name.trim(), mobile: data.mobile ?? null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
  };
  const deleteEmployee = async (id: string) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const addAssignments = async (records: Omit<Assignment, "id" | "createdAt">[]) => {
    const rows = records.map((r) => ({
      project_id: r.projectId || null,
      project_name: r.projectName,
      site_name: r.siteName,
      assignee_id: r.assigneeId || null,
      assignee_name: r.assigneeName,
      month: r.month,
      year: r.year,
      status: r.status,
      unit_type: r.unitType ?? null,
      quantity: r.quantity ?? null,
      rate: r.rate ?? null,
      amount: r.amount ?? null,
    }));
    const { data, error } = await supabase.from("assignments").insert(rows).select();
    if (error) { toast.error(error.message); return; }
    if (data) setAssignments((prev) => [...data.map(mapAssignment), ...prev]);
  };

  const updateAssignment = async (id: string, patch: Partial<Assignment>) => {
    const row: any = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.unitType !== undefined) row.unit_type = patch.unitType;
    if (patch.quantity !== undefined) row.quantity = patch.quantity;
    if (patch.rate !== undefined) row.rate = patch.rate;
    if (patch.amount !== undefined) row.amount = patch.amount;
    if (patch.siteName !== undefined) row.site_name = patch.siteName;
    if (patch.projectName !== undefined) row.project_name = patch.projectName;
    if (patch.assigneeName !== undefined) row.assignee_name = patch.assigneeName;
    if (patch.projectId !== undefined) row.project_id = patch.projectId || null;
    if (patch.assigneeId !== undefined) row.assignee_id = patch.assigneeId || null;
    if (patch.month !== undefined) row.month = patch.month;
    if (patch.year !== undefined) row.year = patch.year;
    const { error } = await supabase.from("assignments").update(row).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const deleteAssignment = async (id: string) => {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const addInvoice = async (rec: Omit<InvoiceRecord, "id">) => {
    const { data, error } = await supabase.from("invoices").insert({
      invoice_number: rec.invoiceNumber,
      assignee_id: rec.assigneeId || null,
      assignee_name: rec.assigneeName,
      month: rec.month,
      year: rec.year,
      generated_date: rec.generatedDate,
      generated_by: rec.generatedBy,
      total: rec.total,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) setInvoices((prev) => [mapInvoice(data), ...prev]);
  };

  return (
    <DataContext.Provider
      value={{
        projects, employees, assignments, invoices, loading,
        addProject, updateProject, deleteProject,
        addEmployee, updateEmployee, deleteEmployee,
        addAssignments, updateAssignment, deleteAssignment,
        addInvoice,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};
