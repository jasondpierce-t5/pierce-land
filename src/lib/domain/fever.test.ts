import { describe, expect, it } from "vitest";
import { DEFAULT_FEVER_THRESHOLDS, nsaidIndicated, processingFeverFlag } from "./fever";

describe("processingFeverFlag (§5.3)", () => {
  it("defaults to 104.0 fever / 105.0 sick on arrival", () => {
    expect(DEFAULT_FEVER_THRESHOLDS).toEqual({ feverF: 104, sickOnArrivalF: 105 });
  });

  it.each([
    [null, "none"],
    [undefined, "none"],
    [101.5, "none"],
    [103.9, "none"],
    [104.0, "fever"],
    [104.9, "fever"],
    [105.0, "sick_on_arrival"],
    [106.2, "sick_on_arrival"],
  ] as const)("%s °F → %s", (temp, flag) => {
    expect(processingFeverFlag(temp)).toBe(flag);
  });

  it("uses thresholds from settings", () => {
    const t = { feverF: 103.5, sickOnArrivalF: 104.5 };
    expect(processingFeverFlag(103.5, t)).toBe("fever");
    expect(processingFeverFlag(104.5, t)).toBe("sick_on_arrival");
  });

  it("is not fooled by float noise at the threshold", () => {
    expect(processingFeverFlag(103.9 + 0.1)).toBe("fever");
  });
});

describe("nsaidIndicated (§5.3)", () => {
  it.each([
    [103.9, false],
    [104.0, true],
    [105.5, true],
    [null, false],
  ] as const)("%s °F vs 104.0 → %s", (temp, expected) => {
    expect(nsaidIndicated(temp, 104.0)).toBe(expected);
  });
});
