import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Assignment, Project, Employee, InvoiceRecord, Client, Site, BillTo } from "@/types/pm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { normalizeSiteName } from "@/lib/siteCodeMatching";

interface DataContextValue {
  clients: Client[];
  projects: Project[];
  sites: Site[];
  employees: Employee[];
  assignments: Assignment[];
  invoices: InvoiceRecord[];
  loading: boolean;
  addClient: (name: string) => Promise<Client | null>;
  updateClient: (id: string, name: string) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  billTos: BillTo[];
  addBillTo: (data: Omit<BillTo, "id">) => Promise<BillTo | null>;
  updateBillTo: (id: string, data: Omit<BillTo, "id">) => Promise<void>;
  deleteBillTo: (id: string) => Promise<void>;
  addProject: (name: string, clientId?: string, clientName?: string) => Promise<Project | null>;
  updateProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addSite: (projectId: string, name: string) => Promise<Site | null>;
  deleteSite: (id: string) => Promise<void>;
  addEmployee: (data: Omit<Employee, "id">) => Promise<Employee | null>;
  updateEmployee: (id: string, data: Omit<Employee, "id">) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addAssignments: (records: Omit<Assignment, "id" | "createdAt">[]) => Promise<void>;
  updateAssignment: (id: string, patch: Partial<Assignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  addInvoice: (rec: Omit<InvoiceRecord, "id">) => Promise<void>;
  siteCodes: Record<string, string>;
  saveSiteCodes: (pairs: { siteName: string; code: string }[]) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

// Mapping helpers
const mapAssignment = (r: any): Assignment => ({
  id: r.id,
  clientId: r.client_id ?? "",
  clientName: r.client_name ?? "",
  projectId: r.project_id ?? "",
  projectName: r.project_name,
  siteId: r.site_id ?? undefined,
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
  const { isAuthenticated, supaUser } = useAuth();
  const userId = supaUser?.id ?? "";
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [siteCodes, setSiteCodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const requireUser = () => {
    if (!userId) {
      toast.error("You must be signed in");
      return false;
    }
    return true;
  };

  const loadAll = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setClients([]); setProjects([]); setSites([]);
      setEmployees([]); setAssignments([]); setInvoices([]); setSiteCodes({});
      return;
    }
    setLoading(true);
    const [cRes, pRes, sRes, eRes, aRes, iRes, scRes] = await Promise.all([
      supabase.from("clients").select("*").eq("user_id", userId).order("name"),
      supabase.from("projects").select("*").eq("user_id", userId).order("name"),
      supabase.from("sites").select("*").eq("user_id", userId).order("name"),
      supabase.from("employees").select("*").eq("user_id", userId).order("name"),
      supabase.from("assignments").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("user_id", userId).order("generated_date", { ascending: false }),
      supabase.from("site_codes").select("*").eq("user_id", userId),
    ]);
    if (cRes.data) setClients(cRes.data.map((r: any) => ({ id: r.id, name: r.name })));
    if (pRes.data)
      setProjects(
        pRes.data.map((r: any) => ({
          id: r.id,
          name: r.name,
          clientId: r.client_id ?? undefined,
          clientName: r.client_name ?? undefined,
        }))
      );
    if (sRes.data) setSites(sRes.data.map((r: any) => ({ id: r.id, projectId: r.project_id, name: r.name })));
    if (eRes.data) setEmployees(eRes.data.map((r: any) => ({ id: r.id, name: r.name, mobile: r.mobile ?? undefined })));
    if (aRes.data) setAssignments(aRes.data.map(mapAssignment));
    if (iRes.data) setInvoices(iRes.data.map(mapInvoice));
    if (scRes.data) {
      const map: Record<string, string> = {};
      scRes.data.forEach((r: any) => { map[normalizeSiteName(r.site_name)] = r.accounting_code; });
      setSiteCodes(map);
    }
    setLoading(false);
  }, [isAuthenticated, userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addClient = async (name: string) => {
    if (!requireUser()) return null;
    const { data, error } = await supabase
      .from("clients")
      .insert({ name: name.trim(), user_id: userId })
      .select().single();
    if (error || !data) { toast.error(error?.message || "Failed to add client"); return null; }
    const c = { id: data.id, name: data.name };
    setClients((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
    return c;
  };
  const updateClient = async (id: string, name: string) => {
    const { error } = await supabase.from("clients").update({ name: name.trim() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)));
  };
  const deleteClient = async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const addProject = async (name: string, clientId?: string, clientName?: string) => {
    if (!requireUser()) return null;
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: name.trim(), user_id: userId, client_id: clientId ?? null, client_name: clientName ?? null })
      .select().single();
    if (error || !data) { toast.error(error?.message || "Failed to add project"); return null; }
    const p = {
      id: data.id,
      name: data.name,
      clientId: data.client_id ?? undefined,
      clientName: data.client_name ?? undefined,
    };
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
    setSites((prev) => prev.filter((s) => s.projectId !== id));
  };

  const addSite = async (projectId: string, name: string) => {
    if (!requireUser()) return null;
    const trimmed = name.trim();
    const existing = sites.find(
      (s) => s.projectId === projectId && s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;
    const { data, error } = await supabase
      .from("sites")
      .insert({ project_id: projectId, name: trimmed, user_id: userId })
      .select().single();
    if (error || !data) { toast.error(error?.message || "Failed to add site"); return null; }
    const s = { id: data.id, projectId: data.project_id, name: data.name };
    setSites((prev) => [...prev, s]);
    return s;
  };
  const deleteSite = async (id: string) => {
    const { error } = await supabase.from("sites").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSites((prev) => prev.filter((s) => s.id !== id));
  };

  const addEmployee = async (data: Omit<Employee, "id">) => {
    if (!requireUser()) return null;
    const { data: row, error } = await supabase
      .from("employees")
      .insert({ name: data.name.trim(), mobile: data.mobile ?? null, user_id: userId })
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
    if (!requireUser()) return;
    const rows = records.map((r) => ({
      user_id: userId,
      client_id: r.clientId || null,
      client_name: r.clientName || null,
      project_id: r.projectId || null,
      project_name: r.projectName,
      site_id: r.siteId || null,
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
    if (patch.siteId !== undefined) row.site_id = patch.siteId || null;
    if (patch.projectName !== undefined) row.project_name = patch.projectName;
    if (patch.clientName !== undefined) row.client_name = patch.clientName;
    if (patch.clientId !== undefined) row.client_id = patch.clientId || null;
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
    if (!requireUser()) return;
    const { data, error } = await supabase.from("invoices").insert({
      user_id: userId,
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

  const saveSiteCodes = async (pairs: { siteName: string; code: string }[]) => {
    if (!requireUser()) return;
    const seen = new Set<string>();
    const rows = pairs
      .map((p) => ({ site_name: p.siteName.trim(), accounting_code: p.code.trim(), user_id: userId }))
      .filter((r) => {
        const k = normalizeSiteName(r.site_name);
        if (!r.site_name || !r.accounting_code || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    if (rows.length === 0) return;
    const { error } = await supabase
      .from("site_codes")
      .upsert(rows, { onConflict: "user_id,site_name", ignoreDuplicates: false });
    if (error) {
      // fall back to delete + insert when the unique index is expression-based
      await supabase.from("site_codes").delete().eq("user_id", userId).in("site_name", rows.map((r) => r.site_name));
      const { error: e2 } = await supabase.from("site_codes").insert(rows);
      if (e2) { toast.error(e2.message); return; }
    }
    setSiteCodes((prev) => {
      const next = { ...prev };
      rows.forEach((r) => { next[normalizeSiteName(r.site_name)] = r.accounting_code; });
      return next;
    });
  };

  return (
    <DataContext.Provider
      value={{
        clients, projects, sites, employees, assignments, invoices, loading,
        addClient, updateClient, deleteClient,
        addProject, updateProject, deleteProject,
        addSite, deleteSite,
        addEmployee, updateEmployee, deleteEmployee,
        addAssignments, updateAssignment, deleteAssignment,
        addInvoice,
        siteCodes, saveSiteCodes,
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
