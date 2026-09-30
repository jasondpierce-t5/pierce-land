import { describe, expect, it } from "vitest";
import {
  formatCents,
  formatCentsPerCwt,
  formatCentsPerLb,
  formatLb,
  formatLbPerDay,
  formatPct,
} from "./format";

describe("format", () => {
  it("money in dollars with separators and a real minus sign", () => {
    expect(formatCents(8_610_000)).toBe("$86,100.00");
    expect(formatCents(5)).toBe("$0.05");
    expect(formatCents(-800_500)).toBe("−$8,005.00");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(16_010.4)).toBe("$160.10");
    expect(formatCents(null)).toBe("—");
  });

  it("$/lb to 4 decimals", () => {
    expect(formatCentsPerLb(102.0408163)).toBe("$1.0204/lb");
    expect(formatCentsPerLb(119.6122449)).toBe("$1.1961/lb");
    expect(formatCentsPerLb(null)).toBe("—");
  });

  it("$/cwt to the cent", () => {
    expect(formatCentsPerCwt(30_486.6562)).toBe("$304.87");
    expect(formatCentsPerCwt(null)).toBe("—");
  });

  it("pounds to one decimal", () => {
    expect(formatLb(9_800)).toBe("9,800.0");
    expect(formatLb(-12.25)).toBe("−12.3");
    expect(formatLb(null)).toBe("—");
  });

  it("ADG truncated to 3 decimals", () => {
    expect(formatLbPerDay(1.3245033)).toBe("1.324 lb/day");
    expect(formatLbPerDay(2)).toBe("2.000 lb/day");
    expect(formatLbPerDay(-0.1234)).toBe("−0.123 lb/day");
    expect(formatLbPerDay(null)).toBe("—");
  });

  it("percent to one decimal", () => {
    expect(formatPct(0.02)).toBe("2.0%");
    expect(formatPct(1 / 3)).toBe("33.3%");
    expect(formatPct(null)).toBe("—");
  });
});
