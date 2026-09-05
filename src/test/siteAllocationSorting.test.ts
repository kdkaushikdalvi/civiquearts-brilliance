import { describe, it, expect } from "vitest";
import { Assignment } from "@/types/pm";
import { getStatusRank } from "@/lib/statusSort";

const sortAssignments = (
  list: Partial<Assignment>[],
  sortField: "project" | "status",
  sortDirection: "asc" | "desc"
) => {
  return [...list].sort((a, b) => {
    const nameA = a.projectName || "";
    const nameB = b.projectName || "";

    if (sortField === "project") {
      const cmp = nameA.localeCompare(nameB, undefined, { sensitivity: "base", numeric: true });
      if (cmp !== 0) return sortDirection === "asc" ? cmp : -cmp;
      const siteA = a.siteName || "";
      const siteB = b.siteName || "";
      return siteA.localeCompare(siteB, undefined, { sensitivity: "base", numeric: true });
    }

    // Status sort: "The sorting should apply within each project group without changing the order of the projects themselves."
    const pCmp = nameA.localeCompare(nameB, undefined, { sensitivity: "base", numeric: true });
    if (pCmp !== 0) return pCmp;

    const rankA = getStatusRank(a.status, sortDirection);
    const rankB = getStatusRank(b.status, sortDirection);
    if (rankA !== rankB) return rankA - rankB;

    const siteA = a.siteName || "";
    const siteB = b.siteName || "";
    return siteA.localeCompare(siteB, undefined, { sensitivity: "base", numeric: true });
  });
};

describe("Site Allocation Sorting", () => {
  const multiProjectAssignments: Partial<Assignment>[] = [
    { id: "1", projectName: "Alpha Hub", siteName: "Alpha Site 1", status: "Completed" },
    { id: "2", projectName: "Alpha Hub", siteName: "Alpha Site 2", status: "In Progress" },
    { id: "3", projectName: "Alpha Hub", siteName: "Alpha Site 3", status: "Not Started Yet" },
    { id: "4", projectName: "Beta Bridge", siteName: "Beta Site 1", status: "Completed" },
    { id: "5", projectName: "Beta Bridge", siteName: "Beta Site 2", status: "Not Yet Started" },
    { id: "6", projectName: "Beta Bridge", siteName: "Beta Site 3", status: "In Progress 25%" },
  ];

  it("sorts by project ascending (A to Z)", () => {
    const sorted = sortAssignments(multiProjectAssignments, "project", "asc");
    expect(sorted.map((s) => s.projectName)).toEqual([
      "Alpha Hub",
      "Alpha Hub",
      "Alpha Hub",
      "Beta Bridge",
      "Beta Bridge",
      "Beta Bridge",
    ]);
  });

  it("sorts by project descending (Z to A)", () => {
    const sorted = sortAssignments(multiProjectAssignments, "project", "desc");
    expect(sorted.map((s) => s.projectName)).toEqual([
      "Beta Bridge",
      "Beta Bridge",
      "Beta Bridge",
      "Alpha Hub",
      "Alpha Hub",
      "Alpha Hub",
    ]);
  });

  it("sorts by status ascending within each project group: 1. In Progress 2. Not Yet Started 3. Completed (always last)", () => {
    const sorted = sortAssignments(multiProjectAssignments, "status", "asc");
    
    // Project order does NOT change
    expect(sorted.map((s) => `${s.projectName} - ${s.status}`)).toEqual([
      "Alpha Hub - In Progress",
      "Alpha Hub - Not Started Yet",
      "Alpha Hub - Completed",
      "Beta Bridge - In Progress 25%",
      "Beta Bridge - Not Yet Started",
      "Beta Bridge - Completed",
    ]);
  });

  it("sorts by status descending within each project group: 1. Completed 2. Not Yet Started 3. In Progress", () => {
    const sorted = sortAssignments(multiProjectAssignments, "status", "desc");

    // Project order does NOT change
    expect(sorted.map((s) => `${s.projectName} - ${s.status}`)).toEqual([
      "Alpha Hub - Completed",
      "Alpha Hub - Not Started Yet",
      "Alpha Hub - In Progress",
      "Beta Bridge - Completed",
      "Beta Bridge - Not Yet Started",
      "Beta Bridge - In Progress 25%",
    ]);
  });

  it("applies status rank correctly for various status stages", () => {
    expect(getStatusRank("In Progress", "asc")).toBeLessThan(getStatusRank("Not Started Yet", "asc"));
    expect(getStatusRank("Not Started Yet", "asc")).toBeLessThan(getStatusRank("Completed", "asc"));

    expect(getStatusRank("Completed", "desc")).toBeLessThan(getStatusRank("Not Started Yet", "desc"));
    expect(getStatusRank("Not Started Yet", "desc")).toBeLessThan(getStatusRank("In Progress", "desc"));
  });
});
