import { describe, it, expect } from "vitest";
import { cleanUnit } from "@/lib/unitFormat";

describe("cleanUnit", () => {
  it("removes 'Per ' prefix from unit names", () => {
    expect(cleanUnit("Per Address")).toBe("Address");
    expect(cleanUnit("Per Page")).toBe("Page");
    expect(cleanUnit("per address")).toBe("address");
    expect(cleanUnit("Per Feet")).toBe("Feet");
  });

  it("leaves units without 'Per' unchanged", () => {
    expect(cleanUnit("Feet")).toBe("Feet");
    expect(cleanUnit("Address")).toBe("Address");
    expect(cleanUnit("Page")).toBe("Page");
    expect(cleanUnit("Nos")).toBe("Nos");
    expect(cleanUnit("Meter")).toBe("Meter");
  });

  it("handles empty, null, or undefined values gracefully", () => {
    expect(cleanUnit("")).toBe("");
    expect(cleanUnit(null)).toBe("");
    expect(cleanUnit(undefined)).toBe("");
  });
});
