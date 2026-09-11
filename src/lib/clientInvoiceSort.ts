/**
 * Helper utilities for sorting Client Invoice items by project name and site name.
 */

export interface ClientInvoiceSortableItem {
  id: string;
  name: string;
  projectName?: string;
  siteName?: string;
  code?: string;
  quantity?: number;
  unit?: string;
  price?: number;
  amount?: number;
}

/**
 * Extracts the project name from the item, falling back to parsing the parenthesized
 * suffix in standard name format: "Site Name - (Project Name)"
 */
export const extractProjectName = (item: { projectName?: string; name: string }): string => {
  if (item.projectName && item.projectName.trim()) {
    return item.projectName.trim();
  }
  const match = item.name.match(/\(([^)]+)\)$/);
  return match ? match[1].trim() : "";
};

/**
 * Extracts the site name from the item, falling back to parsing the prefix before
 * " - (Project Name)" in standard name format.
 */
export const extractSiteName = (item: { siteName?: string; name: string }): string => {
  if (item.siteName && item.siteName.trim()) {
    return item.siteName.trim();
  }
  const idx = item.name.lastIndexOf(" - (");
  return idx !== -1 ? item.name.slice(0, idx).trim() : item.name.trim();
};

/**
 * Compares two client invoice items by Project Name (A to Z) as the primary key,
 * and Site Name (A to Z) as the secondary key.
 * Uses natural alphanumeric sort (e.g., P1 before P2, Site2 before Site10).
 */
export const compareInvoiceLinesByProject = <
  T extends { projectName?: string; siteName?: string; name: string }
>(
  a: T,
  b: T,
  direction: "asc" | "desc" = "asc"
): number => {
  const pA = extractProjectName(a);
  const pB = extractProjectName(b);
  const pComp = pA.localeCompare(pB, undefined, { sensitivity: "base", numeric: true });
  if (pComp !== 0) {
    return direction === "asc" ? pComp : -pComp;
  }

  const sA = extractSiteName(a);
  const sB = extractSiteName(b);
  return sA.localeCompare(sB, undefined, { sensitivity: "base", numeric: true });
};

/**
 * Sorts an array of client invoice lines by project name then site name.
 */
export const sortClientInvoiceLinesByProject = <
  T extends { projectName?: string; siteName?: string; name: string }
>(
  lines: T[],
  direction: "asc" | "desc" = "asc"
): T[] => {
  return [...lines].sort((a, b) => compareInvoiceLinesByProject(a, b, direction));
};
