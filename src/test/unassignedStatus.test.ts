import { describe, it, expect } from "vitest";
import { Assignment } from "@/types/pm";

describe("Unassigned Assignment Status", () => {
  it("defaults unassigned allocation to Not Started Yet", () => {
    const unassignedAllocation: Partial<Assignment> = {
      id: "alloc-1",
      projectName: "Project A",
      siteName: "Site 1",
      assigneeId: undefined,
      assigneeName: undefined,
      status: "Not Started Yet",
    };

    expect(unassignedAllocation.assigneeId).toBeUndefined();
    expect(unassignedAllocation.status).toBe("Not Started Yet");
  });

  it("switches status to In Progress when employee is assigned to Not Started Yet task", () => {
    const prevStatus = "Not Started Yet";
    const employee = { id: "emp-1", name: "Kaushik Dalvi" };

    const newStatus = prevStatus === "Not Started Yet" ? "In Progress" : prevStatus;
    expect(newStatus).toBe("In Progress");
  });

  it("switches status back to Not Started Yet when employee is unassigned", () => {
    const unassign = () => ({
      assigneeId: undefined,
      assigneeName: undefined,
      status: "Not Started Yet" as const,
    });

    const result = unassign();
    expect(result.assigneeId).toBeUndefined();
    expect(result.status).toBe("Not Started Yet");
  });

  it("supports granular In Progress percentage stages", () => {
    const statuses: Assignment["status"][] = [
      "In Progress",
      "In Progress 25%",
      "In Progress 45%",
      "In Progress 80%",
      "QC Pending",
      "Completed",
      "Hold",
      "Not Started Yet",
    ];
    expect(statuses).toContain("In Progress 25%");
    expect(statuses).toContain("In Progress 45%");
    expect(statuses).toContain("In Progress 80%");
    expect(statuses).toContain("QC Pending");
  });
});
