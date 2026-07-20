import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Assignment, Project, Employee, InvoiceRecord } from "@/types/pm";

interface DataContextValue {
  projects: Project[];
  employees: Employee[];
  assignments: Assignment[];
  invoices: InvoiceRecord[];
  addProject: (name: string) => Project;
  updateProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  addEmployee: (data: Omit<Employee, "id">) => Employee;
  updateEmployee: (id: string, data: Omit<Employee, "id">) => void;
  deleteEmployee: (id: string) => void;
  addAssignments: (records: Omit<Assignment, "id" | "createdAt">[]) => void;
  updateAssignment: (id: string, patch: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  addInvoice: (rec: Omit<InvoiceRecord, "id">) => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useLocalState<Project[]>("pm_projects", []);
  const [employees, setEmployees] = useLocalState<Employee[]>("pm_employees", []);
  const [assignments, setAssignments] = useLocalState<Assignment[]>("pm_assignments", []);
  const [invoices, setInvoices] = useLocalState<InvoiceRecord[]>("pm_invoices", []);

  const addProject = (name: string) => {
    const p: Project = { id: uid(), name: name.trim() };
    setProjects((prev) => [...prev, p]);
    return p;
  };
  const updateProject = (id: string, name: string) =>
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)));
  const deleteProject = (id: string) => setProjects((prev) => prev.filter((p) => p.id !== id));

  const addEmployee = (data: Omit<Employee, "id">) => {
    const e: Employee = { id: uid(), ...data, name: data.name.trim() };
    setEmployees((prev) => [...prev, e]);
    return e;
  };
  const updateEmployee = (id: string, data: Omit<Employee, "id">) =>
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
  const deleteEmployee = (id: string) => setEmployees((prev) => prev.filter((e) => e.id !== id));

  const addAssignments = (records: Omit<Assignment, "id" | "createdAt">[]) => {
    const now = new Date().toISOString();
    const list = records.map((r) => ({ ...r, id: uid(), createdAt: now }));
    setAssignments((prev) => [...prev, ...list]);
  };
  const updateAssignment = (id: string, patch: Partial<Assignment>) =>
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const deleteAssignment = (id: string) =>
    setAssignments((prev) => prev.filter((a) => a.id !== id));

  const addInvoice = (rec: Omit<InvoiceRecord, "id">) =>
    setInvoices((prev) => [...prev, { ...rec, id: uid() }]);

  return (
    <DataContext.Provider
      value={{
        projects,
        employees,
        assignments,
        invoices,
        addProject,
        updateProject,
        deleteProject,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addAssignments,
        updateAssignment,
        deleteAssignment,
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
