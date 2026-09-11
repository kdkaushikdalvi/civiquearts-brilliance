import { Assignment } from "@/types/pm";
import { cleanUnit } from "@/lib/unitFormat";

export interface EmployeeProjectItem {
  siteName: string;
  unitType?: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface EmployeeProjectPayment {
  employeeId: string;
  employeeName: string;
  sitesCount: number;
  totalQuantity: number;
  totalAmount: number;
  items: EmployeeProjectItem[];
}

export interface ProjectWisePaymentSummary {
  projectId: string;
  projectName: string;
  clientName?: string;
  totalAmount: number;
  totalSites: number;
  employees: EmployeeProjectPayment[];
}

/**
 * Aggregates completed assignments by project and calculates the employee payments per project.
 */
export function calculateProjectWisePayments(
  assignments: Assignment[]
): ProjectWisePaymentSummary[] {
  // Only process completed assignments with valid data
  const completed = assignments.filter((a) => a.status === "Completed");

  const projectMap = new Map<string, ProjectWisePaymentSummary>();

  for (const a of completed) {
    const pKey = a.projectId || a.projectName || "unnamed";
    if (!projectMap.has(pKey)) {
      projectMap.set(pKey, {
        projectId: a.projectId || "",
        projectName: a.projectName || "Unnamed Project",
        clientName: a.clientName || "",
        totalAmount: 0,
        totalSites: 0,
        employees: [],
      });
    }

    const pSummary = projectMap.get(pKey)!;
    const amount = Number(a.amount) || 0;
    pSummary.totalAmount += amount;
    pSummary.totalSites += 1;

    // Find or create employee entry
    let emp = pSummary.employees.find(
      (e) =>
        (a.assigneeId && e.employeeId === a.assigneeId) ||
        (a.assigneeName && e.employeeName === a.assigneeName)
    );

    if (!emp) {
      emp = {
        employeeId: a.assigneeId || "",
        employeeName: a.assigneeName || "Unknown Employee",
        sitesCount: 0,
        totalQuantity: 0,
        totalAmount: 0,
        items: [],
      };
      pSummary.employees.push(emp);
    }

    emp.sitesCount += 1;
    emp.totalQuantity += Number(a.quantity) || 0;
    emp.totalAmount += amount;
    emp.items.push({
      siteName: a.siteName,
      unitType: cleanUnit(a.unitType),
      quantity: Number(a.quantity) || 0,
      rate: Number(a.rate) || 0,
      amount,
    });
  }

  // Sort projects by totalAmount descending
  const result = Array.from(projectMap.values()).sort(
    (a, b) => b.totalAmount - a.totalAmount
  );

  // Sort employees inside each project by totalAmount descending
  for (const p of result) {
    p.employees.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  return result;
}
