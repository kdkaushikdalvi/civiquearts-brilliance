import { describe, it, expect } from "vitest";
import { Assignment } from "@/types/pm";

const filterAssignmentsBySearch = (
  list: Partial<Assignment>[],
  searchQuery: string
) => {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return list;
  return list.filter((a) => {
    const siteMatch = a.siteName && a.siteName.toLowerCase().includes(query);
    const projectMatch =
      a.projectName && a.projectName.toLowerCase().includes(query);
    return siteMatch || projectMatch;
  });
};

describe("Site Search functionality in Assignments", () => {
  const sampleAssignments: Partial<Assignment>[] = [
    {
      id: "1",
      projectName: "Apex Towers",
      siteName: "Tower A Ground Floor",
      status: "In Progress",
    },
    {
      id: "2",
      projectName: "Apex Towers",
      siteName: "Tower B Roof",
      status: "Completed",
    },
    {
      id: "3",
      projectName: "Metro Rail Corridor",
      siteName: "Station 04 Concourse",
      status: "Not Yet Started",
    },
    {
      id: "4",
      projectName: "Metro Rail Corridor",
      siteName: "Station 09 Platform",
      status: "Completed",
    },
    {
      id: "5",
      projectName: "Greenfield Solar",
      siteName: "Inverter Block 2",
      status: "In Progress",
    },
  ];

  it("returns all assignments when search query is empty or whitespace", () => {
    expect(filterAssignmentsBySearch(sampleAssignments, "")).toHaveLength(5);
    expect(filterAssignmentsBySearch(sampleAssignments, "   ")).toHaveLength(5);
  });

  it("filters by site name case-insensitively", () => {
    const results = filterAssignmentsBySearch(sampleAssignments, "tower a");
    expect(results).toHaveLength(1);
    expect(results[0].siteName).toBe("Tower A Ground Floor");

    const roofResults = filterAssignmentsBySearch(sampleAssignments, "ROOF");
    expect(roofResults).toHaveLength(1);
    expect(roofResults[0].siteName).toBe("Tower B Roof");
  });

  it("filters by partial site name substring", () => {
    const stationResults = filterAssignmentsBySearch(sampleAssignments, "Station");
    expect(stationResults).toHaveLength(2);
    expect(stationResults.map((s) => s.siteName)).toEqual([
      "Station 04 Concourse",
      "Station 09 Platform",
    ]);
  });

  it("filters by project name", () => {
    const results = filterAssignmentsBySearch(sampleAssignments, "Apex");
    expect(results).toHaveLength(2);
    expect(results.map((s) => s.siteName)).toEqual([
      "Tower A Ground Floor",
      "Tower B Roof",
    ]);
  });

  it("handles leading and trailing whitespace in search query", () => {
    const results = filterAssignmentsBySearch(sampleAssignments, "   Inverter   ");
    expect(results).toHaveLength(1);
    expect(results[0].siteName).toBe("Inverter Block 2");
  });

  it("returns an empty array when no sites or projects match", () => {
    const results = filterAssignmentsBySearch(sampleAssignments, "NonExistentSite999");
    expect(results).toHaveLength(0);
  });
});
