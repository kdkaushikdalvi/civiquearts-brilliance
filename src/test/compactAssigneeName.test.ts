import { describe, it, expect } from "vitest";
import { compactAssigneeName } from "@/lib/assigneeFormat";

describe("compactAssigneeName", () => {
  it("formats standard first and last names with last name initial", () => {
    expect(compactAssigneeName("Kaushik Dalvi")).toBe("Kaushik D");
    expect(compactAssigneeName("Vijay Choudhari")).toBe("Vijay C");
    expect(compactAssigneeName("Yogesh Choudhari")).toBe("Yogesh C");
  });

  it("handles irregular casing like KaushiK Dalvi properly", () => {
    expect(compactAssigneeName("KaushiK Dalvi")).toBe("Kaushik D");
    expect(compactAssigneeName("VIJAY CHOUDHARI")).toBe("Vijay C");
    expect(compactAssigneeName("yogesh choudhari")).toBe("Yogesh C");
  });

  it("preserves already formatted first name and last initial", () => {
    expect(compactAssigneeName("Kaushik D")).toBe("Kaushik D");
    expect(compactAssigneeName("Vijay C")).toBe("Vijay C");
    expect(compactAssigneeName("Yogesh C")).toBe("Yogesh C");
  });

  it("formats single names using known mapping or title case", () => {
    expect(compactAssigneeName("Kaushik")).toBe("Kaushik D");
    expect(compactAssigneeName("Vijay")).toBe("Vijay C");
    expect(compactAssigneeName("Yogesh")).toBe("Yogesh C");
    expect(compactAssigneeName("Rahul")).toBe("Rahul");
  });

  it("formats arbitrary two-word or multi-word names", () => {
    expect(compactAssigneeName("John Doe")).toBe("John D");
    expect(compactAssigneeName("Mary Jane Watson")).toBe("Mary W");
  });

  it("resolves full name from employees list when assigneeId is provided", () => {
    const employees = [
      { id: "emp-1", name: "KaushiK Dalvi" },
      { id: "emp-2", name: "Vijay Choudhari" },
    ];
    expect(compactAssigneeName(undefined, "emp-1", employees)).toBe("Kaushik D");
    expect(compactAssigneeName("", "emp-2", employees)).toBe("Vijay C");
    expect(compactAssigneeName("Kaushik", "emp-1", employees)).toBe("Kaushik D");
  });

  it("handles empty or undefined gracefully", () => {
    expect(compactAssigneeName(undefined)).toBe("");
    expect(compactAssigneeName("")).toBe("");
    expect(compactAssigneeName("   ")).toBe("");
  });
});
