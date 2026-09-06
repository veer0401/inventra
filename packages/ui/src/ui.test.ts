import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("@inventra/ui Foundations", () => {
  it("merges tailwind class names correctly without duplicates", () => {
    const result = cn("bg-primary p-4", "bg-primary-hover text-white", false && "hidden");
    expect(result).toBe("p-4 bg-primary-hover text-white");
  });

  it("handles conditional class objects", () => {
    const result = cn("flex items-center", {
      "opacity-50": true,
      "pointer-events-none": false,
    });
    expect(result).toBe("flex items-center opacity-50");
  });

  it("handles semantic token class composition", () => {
    const result = cn("bg-surface text-primary border-subtle", "hover:border-strong");
    expect(result).toContain("bg-surface");
    expect(result).toContain("text-primary");
    expect(result).toContain("hover:border-strong");
  });
});
