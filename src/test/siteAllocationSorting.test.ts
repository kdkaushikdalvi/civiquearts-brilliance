import { describe, it, expect } from "vitest";
import { Assignment } from "@/types/pm";

const STATUS_SORT_ORDER: Record<string, number> = {
  "In Progress": 0,
  "In Progress 25%": 1,
  "In Progress – 25%": 1,
  "In Progress 45%": 2,
  "In Progress – 45%": 2,
  "In Progress 80%": 3,
  "In Progress – 80%": 3,
  "QC Pending": 4,
  "Completed": 5,
  "Hold": 6,
  "On Hold": 6,
  "Not Started Yet": 7,
};

const getStatusRank = (status?: string): number => {
  if (!status) return 99;
  return STATUS_SORT_ORDER[status] ?? 99;
};

const sortAssignments = (
  list: Partial<Assignment>[],
  sortField: "project" | "status",
  sortDirection: "asc" | "desc"
) => {
  return [...list].sort((a, b) => {
    if (sortField === "project") {
      const nameA = a.projectName || "";
      const nameB = b.projectName || "";
      const cmp = nameA.localeCompare(nameB, undefined, { sensitivity: "base", numeric: true });
      if (cmp !== 0) return sortDirection === "asc" ? cmp : -cmp;
      const siteA = a.siteName || "";
      const siteB = b.siteName || "";
      return siteA.localeCompare(siteB, undefined, { sensitivity: "base", numeric: true });
    }

    // Status sort
    const idxA = getStatusRank(a.status);
    const idxB = getStatusRank(b.status);
    const cmp = idxA - idxB;
    if (cmp !== 0) return sortDirection === "asc" ? cmp : -cmp;
    const nameA = a.projectName || "";
    const nameB = b.projectName || "";
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base", numeric: true });
  });
};

describe("Site Allocation Sorting", () => {
  const sampleAssignments: Partial<Assignment>[] = [
    { id: "1", projectName: "Zeta Towers", siteName: "Site 1", status: "Hold" },
    { id: "2", projectName: "Alpha Hub", siteName: "Site 2", status: "Completed" },
    { id: "3", projectName: "Beta Bridge", siteName: "Site 3", status: "In Progress" },
    { id: "4", projectName: "Alpha Hub", siteName: "Site 1", status: "Not Started Yet" },
  ];

  it("sorts by project ascending (A to Z)", () => {
    const sorted = sortAssignments(sampleAssignments, "project", "asc");
    expect(sorted.map((s) => s.projectName)).toEqual([
      "Alpha Hub",
      "Alpha Hub",
      "Beta Bridge",
      "Zeta Towers",
    ]);
    // Secondary sort by siteName for Alpha Hub
    expect(sorted[0].siteName).toBe("Site 1");
    expect(sorted[1].siteName).toBe("Site 2");
  });

  it("sorts by project descending (Z to A)", () => {
    const sorted = sortAssignments(sampleAssignments, "project", "desc");
    expect(sorted.map((s) => s.projectName)).toEqual([
      "Zeta Towers",
      "Beta Bridge",
      "Alpha Hub",
      "Alpha Hub",
    ]);
  });

  it("sorts by status ascending (workflow priority order)", () => {
    const sorted = sortAssignments(sampleAssignments, "status", "asc");
    expect(sorted.map((s) => s.status)).toEqual([
      "In Progress",
      "Completed",
      "Hold",
      "Not Started Yet",
    ]);
  });

  it("sorts by status descending (reverse priority order)", () => {
    const sorted = sortAssignments(sampleAssignments, "status", "desc");
    expect(sorted.map((s) => s.status)).toEqual([
      "Not Started Yet",
      "Hold",
      "Completed",
      "In Progress",
    ]);
  });

  it("resolves multi-assignee group status rank to highest priority status", () => {
    const groupRows: Partial<Assignment>[] = [
      { id: "g1", status: "Not Started Yet" },
      { id: "g2", status: "In Progress 45%" },
      { id: "g3", status: "Completed" },
    ];
    const ranks = groupRows.map((r) => getStatusRank(r.status));
    const bestRank = Math.min(...ranks);
    expect(bestRank).toBe(STATUS_SORT_ORDER["In Progress 45%"]);
  });
});
