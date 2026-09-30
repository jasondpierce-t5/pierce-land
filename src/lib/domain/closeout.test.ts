import { describe, expect, it } from "vitest";
import golden from "../../../tests/fixtures/golden_closeout.json";
import { computeCloseout, formatCloseout, type CloseoutInput } from "./closeout";

function goldenInput(): CloseoutInput {
  const { lot, sale } = golden;
  return {
    lot: {
      headPurchased: lot.head_purchased,
      payWeightTotalLb: lot.pay_weight_total_lb,
      priceCentsPerCwt: lot.price_cents_per_cwt,
      freightCents: lot.freight_cents,
      commissionCents: lot.commission_cents,
      otherPurchaseCents: lot.other_purchase_cents,
      purchaseDate: lot.purchase_date,
    },
    sales: [
      {
        head: sale.head,
        saleDate: sale.sale_date,
        saleWeightTotalLb: sale.sale_weight_total_lb,
        priceCentsPerCwt: sale.price_cents_per_cwt,
        commissionCents: sale.commission_cents,
        freightCents: sale.freight_cents,
        checkoffCents: sale.checkoff_cents,
        otherCents: sale.other_cents,
      },
    ],
    headDead: golden.head_dead,
    // $10,000 of non-purchase cost, split between drugs and lot costs.
    administrations: [
      { costCents: 350_000, voidedAt: null, skipped: false },
      { costCents: 99_999, voidedAt: "2026-10-02T12:00:00Z", skipped: false },
      { costCents: 0, voidedAt: null, skipped: true },
    ],
    lotCosts: [{ amountCents: 400_000 }, { amountCents: 250_000 }],
    treatments: [],
  };
}

describe("computeCloseout — golden case (§5.7)", () => {
  const c = computeCloseout(goldenInput());

  it("matches every golden number to the cent", () => {
    expect(c.headIn).toBe(50);
    expect(c.headSold).toBe(49);
    expect(c.headDead).toBe(1);
    expect(c.purchaseCostCents).toBe(8_610_000);
    expect(c.avgInWeightLb).toBe(450);
    expect(c.soldInWeightLb).toBe(22_050);
    expect(c.saleWeightTotalLb).toBe(31_850);
    expect(c.lbGained).toBe(9_800);
    expect(c.daysOnFeed).toBe(151);
    expect(c.adgLb).toBeCloseTo(9_800 / 49 / 151, 12);
    expect(c.drugCostCents).toBe(350_000);
    expect(c.otherCostCents).toBe(650_000);
    expect(c.nonPurchaseCostCents).toBe(1_000_000);
    expect(c.totalCostCents).toBe(9_610_000);
    expect(c.cogCentsPerLb).toBeCloseTo(102.0408, 4);
    expect(c.deadPurchaseCents).toBe(172_200);
    expect(c.cogInclDeathCentsPerLb).toBeCloseTo(119.6122, 4);
    expect(c.grossSalesCents).toBe(10_510_500);
    expect(c.saleExpensesCents).toBe(100_000);
    expect(c.netProceedsCents).toBe(10_410_500);
    expect(c.breakevenCentsPerCwt).toBeCloseTo(30_486.66, 2);
    expect(c.netProfitCents).toBe(800_500);
    expect(c.profitPerHeadInCents).toBe(16_010);
    expect(c.deathLossPct).toBe(0.02);
    expect(c.morbidityPct).toBe(0);
    expect(c.retreatPct).toBeNull();
  });

  it("formats exactly as the golden table", () => {
    const f = formatCloseout(c);
    for (const [key, value] of Object.entries(golden.expected)) {
      expect(f[key as keyof typeof f], key).toBe(value);
    }
  });
});

describe("computeCloseout — morbidity and retreat", () => {
  it("counts animals with BRD pulls, ignoring voided and non-BRD treatments", () => {
    const input = goldenInput();
    input.treatments = [
      { animalId: "a", diagnosis: "brd", voidedAt: null },
      { animalId: "a", diagnosis: "brd", voidedAt: null },
      { animalId: "b", diagnosis: "brd", voidedAt: null },
      { animalId: "c", diagnosis: "brd", voidedAt: null },
      { animalId: "c", diagnosis: "brd", voidedAt: "2026-10-12T12:00:00Z" },
      { animalId: "d", diagnosis: "footrot", voidedAt: null },
      { animalId: "e", diagnosis: "brd", voidedAt: "2026-10-12T12:00:00Z" },
    ];
    const c = computeCloseout(input);
    expect(c.morbidityPct).toBe(3 / 50);
    expect(c.retreatPct).toBe(1 / 3);
    expect(formatCloseout(c).morbidity_pct).toBe("6.0%");
    expect(formatCloseout(c).retreat_pct).toBe("33.3%");
  });
});

describe("computeCloseout — multiple sales", () => {
  it("weights days on feed by head and rounds each sale's gross to the cent", () => {
    const input = goldenInput();
    input.sales = [
      { ...input.sales[0]!, head: 30, saleWeightTotalLb: 19_500.5, saleDate: "2027-02-19" }, // 141 d
      { ...input.sales[0]!, head: 19, saleWeightTotalLb: 12_349.5, saleDate: "2027-03-17" }, // 167 d
    ];
    const c = computeCloseout(input);
    expect(c.headSold).toBe(49);
    expect(c.daysOnFeed).toBeCloseTo((30 * 141 + 19 * 167) / 49, 10);
    // 195.005 cwt × 33,000 = 6,435,165 ; 123.495 × 33,000 = 4,075,335
    expect(c.grossSalesCents).toBe(6_435_165 + 4_075_335);
    expect(c.saleExpensesCents).toBe(200_000);
    expect(c.lbGained).toBe(9_800);
  });

  it("rounds a fractional-cent purchase cost half away from zero", () => {
    const input = goldenInput();
    // 225.005 cwt × 38,001 ¢ = 8,550,415.005 ¢ → 8,550,415 + 60,000 freight
    input.lot.payWeightTotalLb = 22_500.5;
    input.lot.priceCentsPerCwt = 38_001;
    expect(computeCloseout(input).purchaseCostCents).toBe(8_610_415);
  });
});

describe("computeCloseout — zero denominators return null", () => {
  it("a lot with no sales", () => {
    const input = goldenInput();
    input.sales = [];
    const c = computeCloseout(input);
    expect(c.headSold).toBe(0);
    expect(c.daysOnFeed).toBeNull();
    expect(c.adgLb).toBeNull();
    expect(c.breakevenCentsPerCwt).toBeNull();
    expect(c.grossSalesCents).toBe(0);
    expect(c.netProfitCents).toBe(-9_610_000);
    const f = formatCloseout(c);
    expect(f.adg).toBe("—");
    expect(f.breakeven_cwt).toBe("—");
    expect(f.days_on_feed).toBe("—");
    expect(f.net_profit).toBe("−$96,100.00");
  });

  it("a lot with zero head purchased", () => {
    const input = goldenInput();
    input.lot.headPurchased = 0;
    const c = computeCloseout(input);
    expect(c.avgInWeightLb).toBeNull();
    expect(c.soldInWeightLb).toBeNull();
    expect(c.lbGained).toBeNull();
    expect(c.cogCentsPerLb).toBeNull();
    expect(c.deadPurchaseCents).toBeNull();
    expect(c.cogInclDeathCentsPerLb).toBeNull();
    expect(c.profitPerHeadInCents).toBeNull();
    expect(c.deathLossPct).toBeNull();
    expect(c.morbidityPct).toBeNull();
    expect(formatCloseout(c).lb_gained).toBe("—");
  });

  it("zero pounds gained", () => {
    const input = goldenInput();
    input.sales = [{ ...input.sales[0]!, saleWeightTotalLb: 22_050 }];
    const c = computeCloseout(input);
    expect(c.lbGained).toBe(0);
    expect(c.cogCentsPerLb).toBeNull();
    expect(c.cogInclDeathCentsPerLb).toBeNull();
    expect(c.adgLb).toBe(0);
  });

  it("a same-day sale has zero days on feed", () => {
    const input = goldenInput();
    input.sales = [{ ...input.sales[0]!, saleDate: "2026-10-01" }];
    const c = computeCloseout(input);
    expect(c.daysOnFeed).toBe(0);
    expect(c.adgLb).toBeNull();
  });

  it("zero sale weight", () => {
    const input = goldenInput();
    input.sales = [{ ...input.sales[0]!, saleWeightTotalLb: 0 }];
    expect(computeCloseout(input).breakevenCentsPerCwt).toBeNull();
  });
});
