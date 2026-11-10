import { Assignment } from "@/types/pm";

export interface CompletedSiteReportRow {
  projectName: string;
  siteName: string;
  incomingDate: string;
  completedDate: string;
  footCount: number;
}

/** Consolidate professional allocation rows into one combined count per site. */
export function aggregateCompletedSites(
  assignments: Assignment[],
): CompletedSiteReportRow[] {
  const sites = new Map<
    string,
    CompletedSiteReportRow & { incomingTime: number; completedTime: number }
  >();

  for (const assignment of assignments) {
    const projectName = assignment.projectName || "Other Sites";
    const siteName = assignment.siteName || "";
    const projectKey = assignment.projectId || projectName.trim().toLocaleLowerCase();
    const key = JSON.stringify([projectKey, siteName.trim().toLocaleLowerCase()]);
    const createdAt = assignment.createdAt || "";
    const completedAt = assignment.updatedAt || createdAt;
    const incomingTime = createdAt ? new Date(createdAt).getTime() : Number.NaN;
    const completedTime = completedAt ? new Date(completedAt).getTime() : Number.NaN;
    const existing = sites.get(key);

    if (!existing) {
      sites.set(key, {
        projectName,
        siteName,
        incomingDate: createdAt,
        completedDate: completedAt,
        footCount: Number(assignment.quantity) || 0,
        incomingTime,
        completedTime,
      });
      continue;
    }

    existing.footCount += Number(assignment.quantity) || 0;
    if (Number.isFinite(incomingTime) && incomingTime < existing.incomingTime) {
      existing.incomingTime = incomingTime;
      existing.incomingDate = createdAt;
    }
    if (Number.isFinite(completedTime) && completedTime > existing.completedTime) {
      existing.completedTime = completedTime;
      existing.completedDate = completedAt;
    }
  }

  return [...sites.values()].map(({ incomingTime: _incomingTime, completedTime: _completedTime, ...row }) => row);
}