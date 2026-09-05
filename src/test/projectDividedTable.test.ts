import { describe, it, expect } from "vitest";
import { Assignment } from "@/types/pm";
import {
  getCompletedProjectKeys,
  isSiteGroupCompleted,
  getCompletedSiteGroupKeys,
} from "@/lib/projectCompletion";

describe("Project Completion & Divided Table Logic", () => {
  it("moves a site to Completed when all its assignees are Completed, even if other sites in the project are In Progress", () => {
    // Exact user scenario: Project "P1P1P1P1P1P1P1" has 3 sites
    // Site2: 3 assignees in progress
    // Site3: 4 assignees, some in progress / hold
    // ss20260113 - Reroute: 3 assignees, ALL 3 completed!
    const site2Rows: Assignment[] = [
      {
        id: "s2-1",
        clientId: "c1",
        projectId: "P1P1P1P1P1P1P1",
        projectName: "P1P1P1P1P1P1P1",
        siteName: "Site2",
        assigneeName: "Kaushik",
        status: "In Progress",
        month: 8,
        year: 2026,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "s2-2",
        clientId: "c1",
        projectId: "P1P1P1P1P1P1P1",
        projectName: "P1P1P1P1P1P1P1",
        siteName: "Site2",
        assigneeName: "Vijay",
        status: "In Progress",
        month: 8,
        year: 2026,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "s2-3",
        clientId: "c1",
        projectId: "P1P1P1P1P1P1P1",
        projectName: "P1P1P1P1P1P1P1",
        siteName: "Site2",
        assigneeName: "Yogesh",
        status: "In Progress",
        month: 8,
        year: 2026,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    ];

    const site3Rows: Assignment[] = [
      {
        id: "s3-1",
        clientId: "c1",
        projectId: "P1P1P1P1P1P1P1",
        projectName: "P1P1P1P1P1P1P1",
        siteName: "Site3",
        assigneeName: "Vijay",
        status: "In Progress 45%",
        month: 8,
        year: 2026,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "s3-2",
        clientId: "c1",
        projectId: "P1P1P1P1P1P1P1",
        projectName: "P1P1P1P1P1P1P1",
        siteName: "Site3",
        status: "Not Started Yet",
        month: 8,
        year: 2026,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "s3-3",
        clientId: "c1",
        projectId: "P1P1P1P1P1P1P1",
        projectName: "P1P1P1P1P1P1P1",
        siteName: "Site3",
        assigneeName: "Kaushik",
        status: "Hold",
        month: 8,
        year: 2026,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "s3-4",
        clientId: "c1",
        projectId: "P1P1P1P1P1P1P1",
        projectName: "P1P1P1P1P1P1P1",
        siteName: "Site3",
        assigneeName: "Yogesh",
        status: "Completed",
        month: 8,
        year: 2026,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    ];

    const rerouteSiteRows: Assignment[] = [
      {
        id: "rr-1",
        clientId: "c1",
        projectId: "P1P1P1P1P1P1P1",
        projectName: "P1P1P1P1P1P1P1",
        siteName: "ss20260113 - Reroute",
        assigneeName: "Vijay",
        status: "Completed",
        month: 8,
        year: 2026,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "rr-2",
        clientId: "c1",
        projectId: "P1P1P1P1P1P1P1",
        projectName: "P1P1P1P1P1P1P1",
        siteName: "ss20260113 - Reroute",
        assigneeName: "Kaushik",
        status: "Completed",
        month: 8,
        year: 2026,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "rr-3",
        clientId: "c1",
        projectId: "P1P1P1P1P1P1P1",
        projectName: "P1P1P1P1P1P1P1",
        siteName: "ss20260113 - Reroute",
        assigneeName: "Kaushik",
        status: "Completed",
        month: 8,
        year: 2026,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    ];

    // Check individual site group completions
    expect(isSiteGroupCompleted(site2Rows)).toBe(false);
    expect(isSiteGroupCompleted(site3Rows)).toBe(false);
    expect(isSiteGroupCompleted(rerouteSiteRows)).toBe(true);

    const allAssignments = [...site2Rows, ...site3Rows, ...rerouteSiteRows];
    const completedSiteKeys = getCompletedSiteGroupKeys(allAssignments);

    expect(completedSiteKeys.has("P1P1P1P1P1P1P1-Site2")).toBe(false);
    expect(completedSiteKeys.has("P1P1P1P1P1P1P1-Site3")).toBe(false);
    expect(completedSiteKeys.has("P1P1P1P1P1P1P1-ss20260113 - Reroute")).toBe(true);

    // Grouping simulation
    const grouped = [site2Rows, site3Rows, rerouteSiteRows];
    const inProgressGrouped = grouped.filter((rows) => !isSiteGroupCompleted(rows));
    const completedGrouped = grouped.filter((rows) => isSiteGroupCompleted(rows));

    expect(inProgressGrouped).toHaveLength(2);
    expect(completedGrouped).toHaveLength(1);
    expect(completedGrouped[0][0].siteName).toBe("ss20260113 - Reroute");

    const inProgressAssignmentsCount = inProgressGrouped.reduce((sum, r) => sum + r.length, 0);
    const completedAssignmentsCount = completedGrouped.reduce((sum, r) => sum + r.length, 0);

    expect(inProgressAssignmentsCount).toBe(7); // 3 (Site2) + 4 (Site3)
    expect(completedAssignmentsCount).toBe(3); // 3 (ss20260113 - Reroute)
  });

  it("moves project to Completed only if ALL assignee statuses are Completed", () => {
    const assignments: Assignment[] = [
      // Project 1: All completed -> should be in Completed
      {
        id: "1",
        clientId: "c1",
        clientName: "Client A",
        projectId: "p1",
        projectName: "Project Alpha",
        siteName: "Site 1",
        month: 8,
        year: 2026,
        status: "Completed",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "2",
        clientId: "c1",
        clientName: "Client A",
        projectId: "p1",
        projectName: "Project Alpha",
        siteName: "Site 2",
        month: 8,
        year: 2026,
        status: "Completed",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      // Project 2: Partial completed -> should remain under In Progress
      {
        id: "3",
        clientId: "c1",
        clientName: "Client A",
        projectId: "p2",
        projectName: "Project Beta",
        siteName: "Site B1",
        month: 8,
        year: 2026,
        status: "Completed",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "4",
        clientId: "c1",
        clientName: "Client A",
        projectId: "p2",
        projectName: "Project Beta",
        siteName: "Site B2",
        month: 8,
        year: 2026,
        status: "In Progress 45%",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      // Project 3: None completed -> should remain under In Progress
      {
        id: "5",
        clientId: "c2",
        clientName: "Client B",
        projectId: "p3",
        projectName: "Project Gamma",
        siteName: "Site G1",
        month: 8,
        year: 2026,
        status: "Not Started Yet",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    ];

    const completedKeys = getCompletedProjectKeys(assignments);
    expect(completedKeys.has("p1")).toBe(true);
    expect(completedKeys.has("p2")).toBe(false);
    expect(completedKeys.has("p3")).toBe(false);
  });

  it("handles multi-assignee rows on the same site correctly", () => {
    const assignments: Assignment[] = [
      // Project Delta: 1 site with 2 assignees, one is Completed, one is In Progress
      {
        id: "d1",
        clientId: "c1",
        clientName: "Client A",
        projectId: "p4",
        projectName: "Project Delta",
        siteName: "Site D1",
        assigneeId: "emp1",
        assigneeName: "John",
        month: 8,
        year: 2026,
        status: "Completed",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
      {
        id: "d2",
        clientId: "c1",
        clientName: "Client A",
        projectId: "p4",
        projectName: "Project Delta",
        siteName: "Site D1",
        assigneeId: "emp2",
        assigneeName: "Jane",
        month: 8,
        year: 2026,
        status: "In Progress",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      },
    ];

    const completedKeys = getCompletedProjectKeys(assignments);
    expect(completedKeys.has("p4")).toBe(false);

    // If Jane also completes:
    const allCompletedAssignments = assignments.map((a) =>
      a.id === "d2" ? { ...a, status: "Completed" as const } : a
    );
    const updatedCompletedKeys = getCompletedProjectKeys(allCompletedAssignments);
    expect(updatedCompletedKeys.has("p4")).toBe(true);
  });
});
