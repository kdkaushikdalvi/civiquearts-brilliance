import { describe, it, expect } from "vitest";
import {
  extractProjectName,
  extractSiteName,
  compareInvoiceLinesByProject,
  sortClientInvoiceLinesByProject,
} from "@/lib/clientInvoiceSort";

describe("Client Invoice Sorting by Project", () => {
  it("extracts project name and site name from item name string", () => {
    const item1 = { id: "1", name: "Site-05-09 - (P2p2p2p2p2)" };
    const item2 = { id: "2", name: "ss20260113 - Reroute - (P1P1P1P1P1P1)" };

    expect(extractProjectName(item1)).toBe("P2p2p2p2p2");
    expect(extractSiteName(item1)).toBe("Site-05-09");

    expect(extractProjectName(item2)).toBe("P1P1P1P1P1P1");
    expect(extractSiteName(item2)).toBe("ss20260113 - Reroute");
  });

  it("prioritizes explicit projectName and siteName properties if present", () => {
    const item = {
      id: "1",
      name: "Custom Display Name",
      projectName: "Project Alpha",
      siteName: "Site 101",
    };
    expect(extractProjectName(item)).toBe("Project Alpha");
    expect(extractSiteName(item)).toBe("Site 101");
  });

  it("correctly sorts the user's exact invoice items by project", () => {
    // Unsorted as in user's screenshot:
    // 1: Site-05-09 - (P2p2p2p2p2)
    // 2: Site2 - (P1P1P1P1P1P1)
    // 3: Site3 - (P1P1P1P1P1P1)
    // 4: ss20260113 - Reroute - (P1P1P1P1P1P1)
    const items = [
      { id: "1", name: "Site-05-09 - (P2p2p2p2p2)" },
      { id: "2", name: "Site2 - (P1P1P1P1P1P1)" },
      { id: "3", name: "Site3 - (P1P1P1P1P1P1)" },
      { id: "4", name: "ss20260113 - Reroute - (P1P1P1P1P1P1)" },
    ];

    const sorted = sortClientInvoiceLinesByProject(items);

    expect(sorted.map((i) => i.name)).toEqual([
      "Site2 - (P1P1P1P1P1P1)",
      "Site3 - (P1P1P1P1P1P1)",
      "ss20260113 - Reroute - (P1P1P1P1P1P1)",
      "Site-05-09 - (P2p2p2p2p2)",
    ]);
  });

  it("uses natural alphanumeric sorting for projects and sites", () => {
    const items = [
      { id: "1", name: "Site 10 - (Project 2)" },
      { id: "2", name: "Site 2 - (Project 2)" },
      { id: "3", name: "Site 1 - (Project 10)" },
      { id: "4", name: "Site 1 - (Project 1)" },
    ];

    const sorted = sortClientInvoiceLinesByProject(items);

    expect(sorted.map((i) => i.name)).toEqual([
      "Site 1 - (Project 1)",
      "Site 2 - (Project 2)",
      "Site 10 - (Project 2)",
      "Site 1 - (Project 10)",
    ]);
  });

  it("supports descending sort by project when requested", () => {
    const items = [
      { id: "1", name: "Site 1 - (Project Alpha)" },
      { id: "2", name: "Site 1 - (Project Omega)" },
    ];

    const sorted = sortClientInvoiceLinesByProject(items, "desc");

    expect(sorted.map((i) => i.name)).toEqual([
      "Site 1 - (Project Omega)",
      "Site 1 - (Project Alpha)",
    ]);
  });
});
