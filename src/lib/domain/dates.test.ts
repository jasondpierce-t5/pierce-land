import { describe, expect, it } from "vitest";
import { addDays, assertIsoDate, chicagoDate, daysBetween, maxDate } from "./dates";

describe("dates", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-01", 18)).toBe("2026-10-19");
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
    expect(addDays("2027-03-01", 0)).toBe("2027-03-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
  });

  it("counts days between dates, ignoring DST", () => {
    expect(daysBetween("2026-10-01", "2027-03-01")).toBe(151);
    expect(daysBetween("2026-11-01", "2026-11-02")).toBe(1); // DST ends
    expect(daysBetween("2026-10-08", "2026-10-01")).toBe(-7);
  });

  it("converts timestamps to the America/Chicago calendar date", () => {
    // 03:30 UTC on Oct 2 is 22:30 CDT on Oct 1.
    expect(chicagoDate("2026-10-02T03:30:00Z")).toBe("2026-10-01");
    expect(chicagoDate(new Date("2026-10-02T06:00:00Z"))).toBe("2026-10-02");
    // Winter (CST, UTC−6)
    expect(chicagoDate("2027-01-15T05:59:00Z")).toBe("2027-01-14");
  });

  it("returns the latest date or null", () => {
    expect(maxDate(["2026-10-19", "2026-11-05", "2026-10-30"])).toBe("2026-11-05");
    expect(maxDate([])).toBeNull();
  });

  it("rejects malformed dates", () => {
    expect(() => assertIsoDate("2026-13-01")).toThrow(RangeError);
    expect(() => assertIsoDate("2026-02-30")).toThrow(RangeError);
    expect(() => assertIsoDate("10/01/2026")).toThrow(RangeError);
    expect(() => chicagoDate("not a date")).toThrow(RangeError);
  });
});
