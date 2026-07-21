import { describe, expect, it } from "vitest";
import { buildCapProjectsListRows } from "@/lib/capProjectsListExcel";
import { Assignment } from "@/types/pm";

const baseAssignment = (patch: Partial<Assignment>): Assignment => ({
  id: "1",
  projectId: "p1",
  projectName: "CSPIRE Construction Drawings",
  siteName: "Site 1",
  assigneeId: "e1",
  assigneeName: "Test",
  month: 6,
  year: 2026,
  status: "Completed",
  createdAt: "",
  ...patch,
});

describe("capProjectsListExcel", () => {
  it("groups by project name and resets serial numbers per project", () => {
    const rows = buildCapProjectsListRows([
      baseAssignment({ id: "a", projectName: "Uniti Construction Dwg", siteName: "Site B" }),
      baseAssignment({ id: "b", projectName: "CSPIRE Construction Drawings", siteName: "Site 2" }),
      baseAssignment({ id: "c", projectName: "CSPIRE Construction Drawings", siteName: "Site 1" }),
    ]);

    const headers = rows.filter((r) => r.kind === "project").map((r) => (r.kind === "project" ? r.projectName : ""));
    expect(headers).toEqual(["CSPIRE Construction Drawings", "Uniti Construction Dwg"]);

    const cspireSites = rows.filter(
      (r) => r.kind === "site",
    ) as Extract<(typeof rows)[number], { kind: "site" }>[];
    const firstProjectSites = cspireSites.slice(0, 2);
    expect(firstProjectSites.map((r) => r.siteName)).toEqual(["Site 1", "Site 2"]);
    expect(firstProjectSites.map((r) => r.srNo)).toEqual([1, 2]);
  });
});
