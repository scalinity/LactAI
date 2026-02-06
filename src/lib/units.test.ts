import { describe, it, expect } from "vitest";
import {
  mlToOz,
  ozToMl,
  convertAmount,
  formatAmount,
  parseAmountInput,
  toMl,
} from "./units";

describe("mlToOz", () => {
  it("converts 0 ml to 0 oz", () => {
    expect(mlToOz(0)).toBe(0);
  });

  it("converts 29.5735 ml to approximately 1 oz", () => {
    expect(mlToOz(29.5735)).toBeCloseTo(1, 1);
  });

  it("converts 100 ml correctly", () => {
    expect(mlToOz(100)).toBeCloseTo(3.38, 1);
  });
});

describe("ozToMl", () => {
  it("converts 0 oz to 0 ml", () => {
    expect(ozToMl(0)).toBe(0);
  });

  it("converts 1 oz to approximately 29.5735 ml", () => {
    expect(ozToMl(1)).toBeCloseTo(29.5735, 0);
  });
});

describe("ml <-> oz reversibility", () => {
  it("round-trips ml -> oz -> ml within 2ml tolerance (rounding at each step)", () => {
    const testValues = [0, 50, 100, 150, 200, 250, 300];
    for (const ml of testValues) {
      const roundTripped = ozToMl(mlToOz(ml));
      expect(Math.abs(roundTripped - ml)).toBeLessThanOrEqual(1);
    }
  });

  it("round-trips oz -> ml -> oz within 0.02oz tolerance", () => {
    const testValues = [0, 1, 2, 3, 4, 5, 8, 10];
    for (const oz of testValues) {
      const roundTripped = mlToOz(ozToMl(oz));
      expect(Math.abs(roundTripped - oz)).toBeLessThan(0.02);
    }
  });
});

describe("convertAmount", () => {
  it("returns same value when from and to are the same", () => {
    expect(convertAmount(100, "ml", "ml")).toBe(100);
    expect(convertAmount(5, "oz", "oz")).toBe(5);
  });

  it("converts ml to oz", () => {
    expect(convertAmount(100, "ml", "oz")).toBeCloseTo(3.38, 1);
  });

  it("converts oz to ml", () => {
    expect(convertAmount(1, "oz", "ml")).toBeCloseTo(29.57, 0);
  });
});

describe("formatAmount", () => {
  it("formats ml values as whole numbers with ml suffix", () => {
    expect(formatAmount(120, "ml")).toBe("120 ml");
  });

  it("formats oz values with 1 decimal place", () => {
    expect(formatAmount(3.381, "oz")).toBe("3.4 oz");
  });

  it("handles zero", () => {
    expect(formatAmount(0, "ml")).toBe("0 ml");
  });
});

describe("parseAmountInput", () => {
  it("parses integer strings", () => {
    expect(parseAmountInput("120")).toBe(120);
  });

  it("parses decimal strings", () => {
    expect(parseAmountInput("3.5")).toBeCloseTo(3.5);
  });

  it("returns null for empty string", () => {
    expect(parseAmountInput("")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(parseAmountInput("abc")).toBeNull();
  });

  it("returns null for zero", () => {
    expect(parseAmountInput("0")).toBeNull();
  });

  it("returns null for negative values", () => {
    expect(parseAmountInput("-5")).toBeNull();
  });
});

describe("toMl", () => {
  it("returns same value for ml input", () => {
    expect(toMl(100, "ml")).toBe(100);
  });

  it("converts oz to ml", () => {
    expect(toMl(1, "oz")).toBeCloseTo(29.57, 0);
  });
});
