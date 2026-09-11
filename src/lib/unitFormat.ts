/**
 * Utility to format unit strings and remove the word "Per"
 * (e.g., "Per Address" -> "Address", "Per Page" -> "Page", "Per Feet" -> "Feet").
 */
export function cleanUnit(unit?: string | null): string {
  if (!unit) return "";
  return unit.replace(/^Per\s+/i, "").replace(/\bPer\s+/gi, "").trim();
}
