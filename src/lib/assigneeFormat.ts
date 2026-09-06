export const compactAssigneeName = (
  name?: string,
  assigneeId?: string,
  employees?: { id: string; name: string }[]
): string => {
  let raw = name?.trim();
  if ((!raw || !raw.includes(" ")) && assigneeId && employees) {
    const emp = employees.find((e) => e.id === assigneeId);
    if (emp?.name?.trim()) {
      raw = emp.name.trim();
    }
  }

  if (!raw) return "";

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";

  const toTitleCase = (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  if (parts.length === 1) {
    const single = parts[0].toLowerCase();
    const knownSingle: Record<string, string> = {
      kaushik: "Kaushik D",
      vijay: "Vijay C",
      yogesh: "Yogesh C",
    };
    if (knownSingle[single]) {
      return knownSingle[single];
    }
    return toTitleCase(parts[0]);
  }

  // Two or more words: First Name and Last Name Initial only
  const firstName = toTitleCase(parts[0]);
  const lastToken = parts[parts.length - 1].replace(/[^a-zA-Z]/g, "");
  const lastInitial = lastToken ? lastToken.charAt(0).toUpperCase() : "";

  return lastInitial ? `${firstName} ${lastInitial}` : firstName;
};
