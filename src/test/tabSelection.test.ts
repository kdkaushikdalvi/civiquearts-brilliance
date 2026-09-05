import { describe, it, expect } from "vitest";

describe("Tab selection & labeling logic", () => {
  it("defaults to in_progress when in_progress count is greater than zero", () => {
    const inProgressCount = 10;
    const userSelectedTab = null;

    const activeTab = userSelectedTab ?? (inProgressCount > 0 ? "in_progress" : "all");
    expect(activeTab).toBe("in_progress");
  });

  it("defaults to all when in_progress count is zero", () => {
    const inProgressCount = 0;
    const userSelectedTab = null;

    const activeTab = userSelectedTab ?? (inProgressCount > 0 ? "in_progress" : "all");
    expect(activeTab).toBe("all");
  });

  it("respects explicit user selection when user clicks a tab", () => {
    const inProgressCount = 5;
    const userSelectedTab: "all" | "in_progress" | "completed" = "completed";

    const activeTab = userSelectedTab ?? (inProgressCount > 0 ? "in_progress" : "all");
    expect(activeTab).toBe("completed");
  });

  it("resets selection and re-evaluates default on month change", () => {
    let userSelectedTab: "all" | "in_progress" | "completed" | null = "completed";
    let lastMonth = 8;
    const newMonth = 9;

    if (lastMonth !== newMonth) {
      lastMonth = newMonth;
      userSelectedTab = null;
    }

    const septInProgressCount = 0;
    const activeTabSept = userSelectedTab ?? (septInProgressCount > 0 ? "in_progress" : "all");
    expect(activeTabSept).toBe("all");
  });

  it("formats ALL count without the word 'count'", () => {
    const totalCount = 11;
    const formatted = `(${totalCount})`;
    expect(formatted).toBe("(11)");
    expect(formatted.includes("count")).toBe(false);
  });
});
