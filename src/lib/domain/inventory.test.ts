import { describe, expect, it } from "vitest";
import fixtures from "../../../tests/fixtures/administration_cost.json";
import {
  administrationCostCents,
  applyDose,
  bottleProblem,
  costPerMl,
  defaultBottle,
  dosesOnHand,
  expiringWithin,
  isLowStock,
  restoreDose,
  type Bottle,
} from "./inventory";

const TODAY = "2026-10-01";

function bottle(p: Partial<Bottle> = {}): Bottle {
  return {
    id: "b1",
    productId: "tula",
    expirationDate: "2027-06-30",
    sizeMl: 500,
    remainingMl: 500,
    costCents: 32_000,
    openedAt: null,
    status: "in_stock",
    ...p,
  };
}

describe("cost (§5.6) — shared fixtures", () => {
  it.each(fixtures.cases)(
    "$dose_ml mL of a $size_ml mL bottle costing $cost_cents¢ → $expected_cost_cents¢",
    ({ dose_ml, cost_cents, size_ml, expected_cost_cents }) => {
      expect(administrationCostCents(dose_ml, cost_cents, size_ml)).toBe(expected_cost_cents);
    },
  );

  it("cost per mL is cost / size", () => {
    expect(costPerMl(32_000, 500)).toBe(64);
    expect(costPerMl(100, 3)).toBeCloseTo(33.333, 3);
  });

  it("rejects a zero-size bottle", () => {
    expect(() => costPerMl(100, 0)).toThrow(RangeError);
    expect(() => administrationCostCents(1, 100, 0)).toThrow(RangeError);
  });
});

describe("bottleProblem (§5.6)", () => {
  it("accepts a good bottle", () => {
    expect(bottleProblem(bottle(), 5.5, TODAY)).toBeNull();
  });

  it("blocks a bottle past its expiration date, but allows the expiration day itself", () => {
    expect(bottleProblem(bottle({ expirationDate: "2026-09-30" }), 5.5, TODAY)).toBe("expired");
    expect(bottleProblem(bottle({ expirationDate: TODAY }), 5.5, TODAY)).toBeNull();
    expect(bottleProblem(bottle({ status: "expired" }), 5.5, TODAY)).toBe("expired");
  });

  it("blocks discarded and empty bottles", () => {
    expect(bottleProblem(bottle({ status: "discarded" }), 5.5, TODAY)).toBe("discarded");
    expect(bottleProblem(bottle({ status: "empty", remainingMl: 0 }), 5.5, TODAY)).toBe("empty");
    expect(bottleProblem(bottle({ status: "open", remainingMl: 0 }), 5.5, TODAY)).toBe("empty");
  });

  it("flags a bottle with less than the dose left, so the UI can prompt a switch", () => {
    expect(bottleProblem(bottle({ status: "open", remainingMl: 5 }), 5.5, TODAY)).toBe("insufficient");
    expect(bottleProblem(bottle({ status: "open", remainingMl: 5.5 }), 5.5, TODAY)).toBeNull();
  });
});

describe("applyDose / restoreDose (§5.6, §6)", () => {
  const at = "2026-10-01T15:00:00Z";

  it("the first dose opens the bottle", () => {
    expect(applyDose(bottle(), 5.5, at)).toEqual({ remainingMl: 494.5, openedAt: at, status: "open" });
  });

  it("keeps the original opened_at", () => {
    const b = bottle({ status: "open", remainingMl: 100, openedAt: "2026-09-20T15:00:00Z" });
    expect(applyDose(b, 5.5, at).openedAt).toBe("2026-09-20T15:00:00Z");
  });

  it("hitting 0 mL empties the bottle, without float drift", () => {
    const b = bottle({ status: "open", remainingMl: 0.3, sizeMl: 100 });
    expect(applyDose({ ...b, remainingMl: 1.1 }, 1.1, at)).toEqual({
      remainingMl: 0,
      openedAt: at,
      status: "empty",
    });
    // 0.3 - 0.1 is 0.19999999999999998 in naive float math
    expect(applyDose(b, 0.1, at).remainingMl).toBe(0.2);
  });

  it("refuses a dose the bottle can't cover", () => {
    expect(() => applyDose(bottle({ status: "open", remainingMl: 2 }), 5.5, at)).toThrow(/insufficient/);
    expect(() => applyDose(bottle({ expirationDate: "2026-01-01" }), 5.5, at, TODAY)).toThrow(/expired/);
  });

  it("restoring a voided dose adds it back and re-opens an empty bottle", () => {
    expect(restoreDose(bottle({ status: "empty", remainingMl: 0 }), 5.5)).toEqual({
      remainingMl: 5.5,
      status: "open",
    });
    expect(restoreDose(bottle({ status: "open", remainingMl: 100.2 }), 0.1)).toEqual({
      remainingMl: 100.3,
      status: "open",
    });
  });

  it("restoring leaves a discarded or expired bottle's status alone", () => {
    expect(restoreDose(bottle({ status: "discarded", remainingMl: 10 }), 5).status).toBe("discarded");
    expect(restoreDose(bottle({ status: "expired", remainingMl: 10 }), 5).status).toBe("expired");
  });
});

describe("defaultBottle (§8.3.1)", () => {
  const bottles = [
    bottle({ id: "stock-late", expirationDate: "2027-08-01" }),
    bottle({ id: "stock-early", expirationDate: "2027-02-01" }),
    bottle({ id: "expired", expirationDate: "2026-09-01" }),
    bottle({ id: "other-product", productId: "flor", expirationDate: "2026-12-01" }),
  ];

  it("prefers the open bottle", () => {
    const withOpen = [...bottles, bottle({ id: "open", status: "open", remainingMl: 50, expirationDate: "2027-09-01" })];
    expect(defaultBottle(withOpen, "tula", TODAY)?.id).toBe("open");
  });

  it("otherwise picks the earliest-expiring in-stock bottle", () => {
    expect(defaultBottle(bottles, "tula", TODAY)?.id).toBe("stock-early");
  });

  it("skips expired, empty, and discarded bottles", () => {
    const b = [
      bottle({ id: "empty", status: "open", remainingMl: 0 }),
      bottle({ id: "gone", status: "discarded" }),
      bottle({ id: "old", expirationDate: "2026-09-30" }),
    ];
    expect(defaultBottle(b, "tula", TODAY)).toBeNull();
  });

  it("with two open bottles, picks the earlier-expiring one", () => {
    const b = [
      bottle({ id: "open-late", status: "open", remainingMl: 50, expirationDate: "2027-09-01" }),
      bottle({ id: "open-early", status: "open", remainingMl: 50, expirationDate: "2027-03-01" }),
    ];
    expect(defaultBottle(b, "tula", TODAY)?.id).toBe("open-early");
  });
});

describe("stock queries (§8.1)", () => {
  it("lists usable bottles expiring within 30 days, including already-expired ones", () => {
    const b = [
      bottle({ id: "in-30", expirationDate: "2026-10-31" }),
      bottle({ id: "in-31", expirationDate: "2026-11-01" }),
      bottle({ id: "past", status: "open", remainingMl: 20, expirationDate: "2026-09-15" }),
      bottle({ id: "discarded", status: "discarded", expirationDate: "2026-10-05" }),
      bottle({ id: "empty", status: "empty", remainingMl: 0, expirationDate: "2026-10-05" }),
    ];
    expect(expiringWithin(b, TODAY, 30).map((x) => x.id)).toEqual(["past", "in-30"]);
  });

  it("counts whole doses per usable bottle (a dose can't span bottles)", () => {
    const b = [
      bottle({ id: "x", status: "open", remainingMl: 12 }),
      bottle({ id: "y", remainingMl: 500 }),
      bottle({ id: "z", productId: "flor", remainingMl: 500 }),
      bottle({ id: "old", expirationDate: "2026-09-01" }),
    ];
    // 12 / 5.5 = 2 doses; 500 / 5.5 = 90 doses
    expect(dosesOnHand(b, "tula", 5.5, TODAY)).toBe(92);
  });

  it("is low stock when doses on hand are fewer than the lot's head", () => {
    expect(isLowStock(49, 50)).toBe(true);
    expect(isLowStock(50, 50)).toBe(false);
  });
});
