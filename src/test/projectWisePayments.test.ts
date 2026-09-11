import { describe, it, expect } from "vitest";
import { calculateProjectWisePayments } from "@/lib/projectWisePayments";
import { Assignment } from "@/types/pm";

describe("calculateProjectWisePayments", () => {
  it("calculates payments to employees grouped by project", () => {
    const mockAssignments: Assignment[] = [
      {
        id: "1",
        projectName: "Project A",
        siteName: "Site 1",
        assigneeId: "emp1",
        assigneeName: "Alice",
        month: 8,
        year: 2026,
        status: "Completed",
        quantity: 10,
        rate: 100,
        amount: 1000,
      },
      {
        id: "2",
        projectName: "Project A",
        siteName: "Site 2",
        assigneeId: "emp2",
        assigneeName: "Bob",
        month: 8,
        year: 2026,
        status: "Completed",
        quantity: 5,
        rate: 200,
        amount: 1000,
      },
      {
        id: "3",
        projectName: "Project B",
        siteName: "Site 3",
        assigneeId: "emp1",
        assigneeName: "Alice",
        month: 8,
        year: 2026,
        status: "Completed",
        quantity: 20,
        rate: 150,
        amount: 3000,
      },
      {
        id: "4",
        projectName: "Project A",
        siteName: "Site 4",
        assigneeId: "emp1",
        assigneeName: "Alice",
        month: 8,
        year: 2026,
        status: "In Progress", // Should be ignored
        quantity: 10,
        rate: 100,
        amount: 1000,
      },
    ];

    const result = calculateProjectWisePayments(mockAssignments);

    expect(result).toHaveLength(2);
    // Project B has 3000, Project A has 2000
    expect(result[0].projectName).toBe("Project B");
    expect(result[0].totalAmount).toBe(3000);
    expect(result[0].totalSites).toBe(1);
    expect(result[0].employees).toHaveLength(1);
    expect(result[0].employees[0].employeeName).toBe("Alice");
    expect(result[0].employees[0].totalAmount).toBe(3000);

    expect(result[1].projectName).toBe("Project A");
    expect(result[1].totalAmount).toBe(2000);
    expect(result[1].totalSites).toBe(2);
    expect(result[1].employees).toHaveLength(2);
  });

  it("returns empty array when no completed assignments exist", () => {
    const result = calculateProjectWisePayments([]);
    expect(result).toEqual([]);
  });
});
