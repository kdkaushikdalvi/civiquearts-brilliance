import { Assignment } from "@/types/pm";

/**
 * Checks if a site group (all assignments for a specific site under a project) is completed.
 * A site group is completed if all of its assigned entries have status === "Completed".
 */
export const isSiteGroupCompleted = (rows: Assignment[]): boolean => {
  return rows.length > 0 && rows.every((r) => r.status === "Completed");
};

/**
 * Returns a unique key for a site within a project.
 */
export const getSiteGroupKey = (a: {
  projectId?: string;
  projectName?: string;
  siteName?: string;
}): string => {
  const p = a.projectId || a.projectName || "__unknown_project__";
  const s = a.siteName || "__unknown_site__";
  return `${p}-${s}`;
};

/**
 * Returns a Set of site group keys whose assignments are ALL Completed.
 */
export const getCompletedSiteGroupKeys = (
  assignments: Assignment[]
): Set<string> => {
  const siteAssignments = new Map<string, Assignment[]>();

  assignments.forEach((a) => {
    const key = getSiteGroupKey(a);
    const list = siteAssignments.get(key) ?? [];
    list.push(a);
    siteAssignments.set(key, list);
  });

  const completedKeys = new Set<string>();

  siteAssignments.forEach((rows, key) => {
    if (isSiteGroupCompleted(rows)) {
      completedKeys.add(key);
    }
  });

  return completedKeys;
};

/**
 * Returns a Set of project keys (projectId or projectName) whose assignments are ALL Completed.
 *
 * Rule:
 * Total Project completed moves to Completed if all assignee status is completed,
 * otherwise all projects remain under In Progress.
 */
export const getCompletedProjectKeys = (assignments: Assignment[]): Set<string> => {
  const projectAssignments = new Map<string, Assignment[]>();

  assignments.forEach((a) => {
    const pKey = a.projectId || a.projectName || "__unknown__";
    const list = projectAssignments.get(pKey) ?? [];
    list.push(a);
    projectAssignments.set(pKey, list);
  });

  const completedKeys = new Set<string>();

  projectAssignments.forEach((rows, pKey) => {
    if (rows.length > 0 && rows.every((r) => r.status === "Completed")) {
      completedKeys.add(pKey);
    }
  });

  return completedKeys;
};
