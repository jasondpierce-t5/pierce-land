import { describe, expect, it } from "vitest";
import { groupGain, NOT_ENOUGH_DATA_MESSAGE, type TapeSession } from "./groupGain";

function session(date: string, n: number, weight: (i: number) => number | null): TapeSession {
  return {
    date,
    readings: Array.from({ length: n }, (_, i) => ({
      animalId: `a${i}`,
      tapeWeightLb: weight(i),
      voidedAt: null,
    })),
  };
}

describe("groupGain (§5.8)", () => {
  const first = session("2026-10-01", 12, (i) => 450 + i);
  const second = session("2026-11-30", 12, (i) => 540 + i); // 60 days later, +90 lb each

  it("estimates the group average with 12 animals 60 days apart", () => {
    expect(groupGain(first, second)).toEqual({
      kind: "estimate",
      n: 12,
      days: 60,
      avgGainLb: 90,
      avgDailyGainLb: 1.5,
    });
  });

  it("accepts the sessions in either order", () => {
    expect(groupGain(second, first)).toMatchObject({ kind: "estimate", days: 60, avgGainLb: 90 });
  });

  it("refuses with 11 animals measured in both", () => {
    const eleven = session("2026-11-30", 11, (i) => 540 + i);
    expect(groupGain(first, eleven)).toEqual({
      kind: "insufficient",
      n: 11,
      days: 60,
      message: NOT_ENOUGH_DATA_MESSAGE,
    });
    expect(NOT_ENOUGH_DATA_MESSAGE).toBe("Not enough data for a reliable estimate.");
  });

  it("refuses when sessions are 59 days apart", () => {
    const early = session("2026-11-29", 12, (i) => 540 + i);
    expect(groupGain(first, early)).toMatchObject({ kind: "insufficient", n: 12, days: 59 });
  });

  it("only pairs animals measured in both sessions, ignoring voided and blank readings", () => {
    const later = session("2026-12-10", 14, (i) => (i === 13 ? null : 560 + i));
    later.readings[12]!.voidedAt = "2026-12-10T15:00:00Z";
    const earlier = session("2026-10-01", 16, (i) => 450 + i);
    // Pairs: a0–a11 (12). a12 voided, a13 blank, a14–a15 not in the later session.
    expect(groupGain(earlier, later)).toEqual({
      kind: "estimate",
      n: 12,
      days: 70,
      avgGainLb: 110,
      avgDailyGainLb: 110 / 70,
    });
  });

  it("uses the last non-voided reading when an animal was re-run in a session", () => {
    const base = session("2026-11-30", 12, (i) => 540 + i);
    const later = { ...base, readings: [...base.readings, { animalId: "a0", tapeWeightLb: 600, voidedAt: null }] };
    const r = groupGain(first, later);
    expect(r.kind === "estimate" && r.avgGainLb).toBe(90 + (600 - 540) / 12);
  });
});
