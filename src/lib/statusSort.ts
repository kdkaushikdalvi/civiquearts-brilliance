export const getStatusRank = (
  status?: string,
  direction: "asc" | "desc" = "asc"
): number => {
  if (!status) return 99;
  const s = status.trim();

  if (direction === "asc") {
    // Ascending: 1. In Progress 2. Not Yet Started 3. Completed (always last)
    if (s === "In Progress") return 10;
    if (s.startsWith("In Progress") || s === "QC Pending") {
      if (s.includes("0%")) return 11;
      if (s.includes("25%")) return 12;
      if (s.includes("45%")) return 13;
      if (s.includes("80%")) return 14;
      if (s === "QC Pending") return 15;
      return 10;
    }
    if (s === "Not Started Yet" || s === "Not Yet Started") return 20;
    if (s === "Hold" || s === "On Hold") return 21;
    if (s === "Completed") return 30;
    return 99;
  } else {
    // Descending: Reverse the order: 1. Completed 2. Not Yet Started 3. In Progress
    if (s === "Completed") return 10;
    if (s === "Not Started Yet" || s === "Not Yet Started") return 20;
    if (s === "Hold" || s === "On Hold") return 21;
    if (s === "QC Pending") return 30;
    if (s.startsWith("In Progress")) {
      if (s.includes("80%")) return 31;
      if (s.includes("45%")) return 32;
      if (s.includes("25%")) return 33;
      if (s.includes("0%")) return 34;
      return 35;
    }
    return 99;
  }
};
