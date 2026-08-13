/**
 * Produces a stable key for matching site names from assignments and imports.
 * It intentionally ignores case, whitespace, accents, and separator punctuation
 * while keeping letters and numbers significant.
 */
export const normalizeSiteName = (siteName: string): string =>
  (siteName ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

export const getSiteCode = (
  siteCodes: Record<string, string>,
  siteName: string,
): string => siteCodes[normalizeSiteName(siteName)] ?? "";
