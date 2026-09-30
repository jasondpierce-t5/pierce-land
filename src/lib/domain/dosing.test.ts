import { describe, expect, it } from "vitest";
import {
  bracketWeight,
  computeDose,
  doseVolumeMl,
  formatDose,
  resolveDoseWeight,
  siteCount,
} from "./dosing";

describe("bracketWeight (§5.1.2)", () => {
  it.each([
    [400, 400],
    [401, 450],
    [449.9, 450],
    [450, 450],
    [451, 500],
    [452, 500],
    [0.1, 50],
    [50, 50],
  ])("%d lb → %d lb", (w, expected) => {
    expect(bracketWeight(w)).toBe(expected);
  });

  it.each([0, -10, Number.NaN, Number.POSITIVE_INFINITY])("rejects %d", (w) => {
    expect(() => bracketWeight(w)).toThrow(RangeError);
  });
});

describe("resolveDoseWeight (§5.1.1)", () => {
  const lot = { payWeightTotalLb: 22_500, headPurchased: 50 };
  const asOf = "2026-10-20";

  it("prefers the tape weight entered at this event", () => {
    expect(
      resolveDoseWeight({
        eventTapeLb: 488,
        recentTapes: [{ weightLb: 470, measuredOn: "2026-10-19" }],
        asOf,
        lot,
      }),
    ).toEqual({ weightLb: 488, bracketLb: 500, source: "event_tape" });
  });

  it("falls back to the most recent tape within 30 days", () => {
    expect(
      resolveDoseWeight({
        eventTapeLb: null,
        recentTapes: [
          { weightLb: 440, measuredOn: "2026-10-01" },
          { weightLb: 470, measuredOn: "2026-10-15" },
          { weightLb: 455, measuredOn: "2026-10-10" },
        ],
        asOf,
        lot,
      }),
    ).toEqual({ weightLb: 470, bracketLb: 500, source: "recent_tape" });
  });

  it("counts a tape taken exactly 30 days ago", () => {
    expect(
      resolveDoseWeight({
        eventTapeLb: null,
        recentTapes: [{ weightLb: 430, measuredOn: "2026-09-20" }],
        asOf,
        lot,
      })?.source,
    ).toBe("recent_tape");
  });

  it("ignores tapes older than 30 days or dated after the event", () => {
    expect(
      resolveDoseWeight({
        eventTapeLb: null,
        recentTapes: [
          { weightLb: 430, measuredOn: "2026-09-19" },
          { weightLb: 520, measuredOn: "2026-10-21" },
        ],
        asOf,
        lot,
      }),
    ).toEqual({ weightLb: 450, bracketLb: 450, source: "lot_average" });
  });

  it("falls back to the lot's average pay weight", () => {
    expect(
      resolveDoseWeight({ eventTapeLb: undefined, recentTapes: [], asOf, lot }),
    ).toEqual({ weightLb: 450, bracketLb: 450, source: "lot_average" });
  });

  it("returns null when there is no usable weight", () => {
    expect(
      resolveDoseWeight({
        eventTapeLb: null,
        recentTapes: [],
        asOf,
        lot: { payWeightTotalLb: null, headPurchased: 50 },
      }),
    ).toBeNull();
    expect(
      resolveDoseWeight({
        eventTapeLb: null,
        recentTapes: [],
        asOf,
        lot: { payWeightTotalLb: 22_500, headPurchased: 0 },
      }),
    ).toBeNull();
  });

  it("rejects a non-positive event tape weight", () => {
    expect(() =>
      resolveDoseWeight({ eventTapeLb: 0, recentTapes: [], asOf, lot }),
    ).toThrow(RangeError);
  });
});

describe("doseVolumeMl (§5.2)", () => {
  it("per_head returns the label dose unchanged", () => {
    expect(doseVolumeMl({ doseBasis: "per_head", doseMl: 2 }, 500)).toBe(2);
    expect(doseVolumeMl({ doseBasis: "per_head", doseMl: 5 }, 450)).toBe(5);
  });

  it("per_100lb scales by the bracket", () => {
    // 6 mL/100 lb × 500 lb = 30 mL
    expect(doseVolumeMl({ doseBasis: "per_100lb", doseMl: 6 }, 500)).toBe(30);
  });

  it("does not over-round exact half-mL results despite float error", () => {
    // 1.1 × 500 / 100 is 5.500000000000001 in naive float math.
    expect(doseVolumeMl({ doseBasis: "per_100lb", doseMl: 1.1 }, 500)).toBe(5.5);
  });

  it.each([
    // [dose mL/100 lb, bracket, expected]
    [0.91, 450, 4.5], // 4.095 → 4.5
    [0.91, 500, 5], // 4.55 → 5.0
    [2.3, 450, 10.5], // 10.35 → 10.5
    [2.3, 400, 9.5], // 9.2 → 9.5
    [3.4, 450, 15.5], // 15.3 → 15.5
    [2, 450, 9], // 9.0 exactly
    [1.1, 450, 5], // 4.95 → 5.0
    [1.1, 400, 4.5], // 4.4 → 4.5
  ])("%d mL/cwt at %d lb → %d mL (round up to 0.5)", (doseMl, bracket, expected) => {
    expect(doseVolumeMl({ doseBasis: "per_100lb", doseMl }, bracket)).toBe(expected);
  });

  it("rejects a non-positive label dose", () => {
    expect(() => doseVolumeMl({ doseBasis: "per_head", doseMl: 0 }, 500)).toThrow(RangeError);
  });
});

describe("siteCount (§5.2)", () => {
  it("is 1 when no per-site max is set", () => {
    expect(siteCount(30, null)).toBe(1);
    expect(siteCount(30, undefined)).toBe(1);
  });

  it.each([
    [10, 10, 1],
    [10.5, 10, 2],
    [12, 10, 2],
    [20, 10, 2],
    [30, 10, 3],
    [30.5, 10, 4],
    [15.5, 20, 1],
  ])("%d mL with max %d/site → %d sites", (volume, max, expected) => {
    expect(siteCount(volume, max)).toBe(expected);
  });

  it("rejects a non-positive per-site max", () => {
    expect(() => siteCount(10, 0)).toThrow(RangeError);
  });
});

describe("computeDose / formatDose", () => {
  it("computes volume and sites together", () => {
    // Florfenicol 6 mL/cwt at 500 lb = 30 mL, max 10/site
    expect(
      computeDose({ doseBasis: "per_100lb", doseMl: 6, maxMlPerSite: 10, unit: "mL" }, 500),
    ).toEqual({ volume: 30, sites: 3 });
  });

  it("formats the on-screen split", () => {
    expect(formatDose({ volume: 12, sites: 2 }, "mL")).toBe("12.0 mL — 2 sites");
    expect(formatDose({ volume: 5.5, sites: 1 }, "mL")).toBe("5.5 mL — 1 site");
    expect(formatDose({ volume: 1, sites: 1 }, "each")).toBe("1 each");
  });
});
