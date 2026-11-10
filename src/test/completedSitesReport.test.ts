import { describe, expect, it } from "vitest";
import { aggregateCompletedSites } from "@/lib/completedSitesReport";
import { Assignment } from "@/types/pm";

const allocation = (patch: Partial<Assignment>): Assignment => ({
  id: "allocation-1",
  projectId: "project-1",
  projectName: "Project A",
  siteName: "Site 1",
  month: 8,
  year: 2026,
  status: "Completed",
  quantity: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
  ...patch,
});

describe("aggregateCompletedSites", () => {
  it("combines professionals' foot counts into one row per site", () => {
    const sites = aggregateCompletedSites([
      allocation({ id: "allocation-1", assigneeName: "Alex", quantity: 125 }),
      allocation({ id: "allocation-2", assigneeName: "Sam", quantity: 75 }),
      allocation({ id: "allocation-3", siteName: "Site 2", quantity: 40 }),
    ]);

    expect(sites).toHaveLength(2);
    expect(sites.map((site) => [site.siteName, site.footCount])).toEqual([
      ["Site 1", 200],
      ["Site 2", 40],
    ]);
  });
});