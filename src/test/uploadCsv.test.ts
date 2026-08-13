import { describe, expect, it } from "vitest";
import { extractCodePairs } from "@/pages/pm/UploadCsv";

describe("CSV accounting-code extraction", () => {
  it("finds named site and accounting-code columns in any order", () => {
    expect(extractCodePairs([
      ["Accounting Code", "Notes", "Site Name"],
      ["ACC-102", "", "Metro Park"],
    ])).toEqual([{ siteName: "Metro Park", code: "ACC-102" }]);
  });

  it("continues to support the CAP Projects and Accounting Code template", () => {
    expect(extractCodePairs([
      ["Sr No.", "Projects", "Accounting Code"],
      ["1", "Metro Park", "ACC-102"],
    ])).toEqual([{ siteName: "Metro Park", code: "ACC-102" }]);
  });
});
