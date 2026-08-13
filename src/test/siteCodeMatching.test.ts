import { describe, expect, it } from "vitest";
import { getSiteCode, normalizeSiteName } from "@/lib/siteCodeMatching";

describe("site accounting-code matching", () => {
  it("normalizes case, whitespace, accents, and formatting separators", () => {
    expect(normalizeSiteName("  M\u00e9tro\u00a0Park - Block_A  ")).toBe("metroparkblocka");
  });

  it("finds a CSV accounting code for a differently formatted invoice site name", () => {
    const csvCodes = { [normalizeSiteName("Metro Park - Block A")]: "ACC-102" };

    expect(getSiteCode(csvCodes, " metro  PARK_block-a ")).toBe("ACC-102");
  });
});
