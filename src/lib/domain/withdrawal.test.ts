import { describe, expect, it } from "vitest";
import fixtures from "../../../tests/fixtures/withdrawal.json";
import {
  animalClearDate,
  inWithdrawal,
  lotClearDate,
  saleWithdrawalFlags,
  withdrawalClearDate,
} from "./withdrawal";

describe("withdrawalClearDate (§5.5) — shared fixtures", () => {
  it.each(fixtures.cases)(
    "$given_at + $slaughter_withdrawal_days d → $expected_clear_date",
    ({ given_at, slaughter_withdrawal_days, expected_clear_date }) => {
      expect(withdrawalClearDate(given_at, slaughter_withdrawal_days)).toBe(expected_clear_date);
    },
  );

  it("accepts a plain farm date", () => {
    expect(withdrawalClearDate("2026-10-01", 21)).toBe("2026-10-22");
  });

  it("rejects negative or fractional withdrawal days", () => {
    expect(() => withdrawalClearDate("2026-10-01", -1)).toThrow(RangeError);
    expect(() => withdrawalClearDate("2026-10-01", 1.5)).toThrow(RangeError);
  });
});

describe("animalClearDate (§5.5)", () => {
  const a = (clear: string, extra: { voidedAt?: string | null; skipped?: boolean } = {}) => ({
    withdrawalClearDate: clear,
    voidedAt: extra.voidedAt ?? null,
    skipped: extra.skipped ?? false,
  });

  it("is the max clear date over the animal's administrations", () => {
    expect(animalClearDate([a("2026-10-19"), a("2026-11-08"), a("2026-10-22")])).toBe("2026-11-08");
  });

  it("excludes voided and skipped administrations", () => {
    expect(
      animalClearDate([
        a("2026-10-19"),
        a("2026-12-01", { voidedAt: "2026-10-05T12:00:00Z" }),
        a("2026-12-15", { skipped: true }),
      ]),
    ).toBe("2026-10-19");
  });

  it("is null with no counted administrations", () => {
    expect(animalClearDate([])).toBeNull();
    expect(animalClearDate([a("2026-12-01", { voidedAt: "2026-10-05T12:00:00Z" })])).toBeNull();
  });
});

describe("lotClearDate (§5.5)", () => {
  it("is the max over active animals only", () => {
    expect(
      lotClearDate([
        { status: "active", clearDate: "2026-10-19" },
        { status: "active", clearDate: "2026-11-08" },
        { status: "active", clearDate: null },
        { status: "dead", clearDate: "2026-12-30" },
        { status: "sold", clearDate: "2026-12-31" },
      ]),
    ).toBe("2026-11-08");
  });

  it("is null when no active animal has a clear date", () => {
    expect(lotClearDate([{ status: "active", clearDate: null }])).toBeNull();
    expect(lotClearDate([])).toBeNull();
  });
});

describe("inWithdrawal / saleWithdrawalFlags (§5.5)", () => {
  it("an animal is in withdrawal until its clear date", () => {
    expect(inWithdrawal("2026-10-19", "2026-10-18")).toBe(true);
    expect(inWithdrawal("2026-10-19", "2026-10-19")).toBe(false);
    expect(inWithdrawal(null, "2026-10-19")).toBe(false);
  });

  it("flags animals whose clear date is after the proposed sale date", () => {
    const animals = [
      { id: "a", clearDate: "2027-03-02" },
      { id: "b", clearDate: "2027-03-01" },
      { id: "c", clearDate: null },
      { id: "d", clearDate: "2027-04-10" },
    ];
    expect(saleWithdrawalFlags(animals, "2027-03-01").map((x) => x.id)).toEqual(["a", "d"]);
  });
});
