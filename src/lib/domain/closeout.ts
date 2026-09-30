/**
 * Lot closeout (§5.7).
 *
 * Totals are integer cents (each sale's gross and the purchase cost are rounded half away from
 * zero). Rates — per lb, per cwt, per head, per day — are unrounded numbers; the display layer
 * rounds them. Every division by zero returns null.
 */
import { daysBetween, type IsoDate } from "./dates";
import {
  formatCents,
  formatCentsPerCwt,
  formatCentsPerLb,
  formatDays,
  formatLb,
  formatLbPerDay,
  formatPct,
} from "./format";
import type { Diagnosis, VoidedAt } from "./types";

export interface CloseoutLot {
  headPurchased: number;
  payWeightTotalLb: number;
  priceCentsPerCwt: number;
  freightCents: number;
  commissionCents: number;
  otherPurchaseCents: number;
  purchaseDate: IsoDate;
}

export interface CloseoutSale {
  head: number;
  saleDate: IsoDate;
  saleWeightTotalLb: number;
  priceCentsPerCwt: number;
  commissionCents: number;
  freightCents: number;
  checkoffCents: number;
  otherCents: number;
}

export interface CloseoutInput {
  lot: CloseoutLot;
  sales: readonly CloseoutSale[];
  headDead: number;
  /** Administrations for the lot's animals. Voided and skipped rows are excluded here. */
  administrations: readonly { costCents: number; voidedAt: VoidedAt; skipped: boolean }[];
  lotCosts: readonly { amountCents: number }[];
  /** Treatments for the lot's animals. Voided rows are excluded here. */
  treatments: readonly { animalId: string; diagnosis: Diagnosis; voidedAt: VoidedAt }[];
}

export interface Closeout {
  headIn: number;
  headSold: number;
  headDead: number;
  purchaseCostCents: number;
  avgInWeightLb: number | null;
  soldInWeightLb: number | null;
  saleWeightTotalLb: number;
  lbGained: number | null;
  daysOnFeed: number | null;
  adgLb: number | null;
  drugCostCents: number;
  otherCostCents: number;
  nonPurchaseCostCents: number;
  totalCostCents: number;
  cogCentsPerLb: number | null;
  deadPurchaseCents: number | null;
  cogInclDeathCentsPerLb: number | null;
  grossSalesCents: number;
  saleExpensesCents: number;
  netProceedsCents: number;
  breakevenCentsPerCwt: number | null;
  netProfitCents: number;
  profitPerHeadInCents: number | null;
  /** Fractions 0–1. */
  deathLossPct: number | null;
  morbidityPct: number | null;
  retreatPct: number | null;
}

function div(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

/** Half away from zero, like Postgres round(numeric). */
function roundCents(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x));
}

/** lb (to 0.1) × ¢/cwt → cents, computed on integer tenths to avoid float error. */
function cwtValueCents(lb: number, centsPerCwt: number): number {
  return roundCents((Math.round(lb * 10) * centsPerCwt) / 1000);
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

export function computeCloseout(input: CloseoutInput): Closeout {
  const { lot, sales } = input;
  const headIn = lot.headPurchased;
  const headSold = sum(sales.map((s) => s.head));
  const headDead = input.headDead;

  const purchaseCostCents =
    cwtValueCents(lot.payWeightTotalLb, lot.priceCentsPerCwt) +
    lot.freightCents +
    lot.commissionCents +
    lot.otherPurchaseCents;

  const avgInWeightLb = div(lot.payWeightTotalLb, headIn);
  const soldInWeightLb = avgInWeightLb === null ? null : avgInWeightLb * headSold;
  const saleWeightTotalLb = sum(sales.map((s) => s.saleWeightTotalLb));
  const lbGained = soldInWeightLb === null ? null : saleWeightTotalLb - soldInWeightLb;

  const daysOnFeed = div(sum(sales.map((s) => s.head * daysBetween(lot.purchaseDate, s.saleDate))), headSold);
  const adgLb = div(div(lbGained, headSold), daysOnFeed);

  const drugCostCents = sum(
    input.administrations.filter((a) => a.voidedAt === null && !a.skipped).map((a) => a.costCents),
  );
  const otherCostCents = sum(input.lotCosts.map((c) => c.amountCents));
  const nonPurchaseCostCents = drugCostCents + otherCostCents;
  const totalCostCents = purchaseCostCents + nonPurchaseCostCents;

  const cogCentsPerLb = div(nonPurchaseCostCents, lbGained);
  const perHeadIn = div(purchaseCostCents, headIn);
  const deadPurchaseCents = perHeadIn === null ? null : roundCents(perHeadIn * headDead);
  const cogInclDeathCentsPerLb =
    deadPurchaseCents === null ? null : div(nonPurchaseCostCents + deadPurchaseCents, lbGained);

  const grossSalesCents = sum(sales.map((s) => cwtValueCents(s.saleWeightTotalLb, s.priceCentsPerCwt)));
  const saleExpensesCents = sum(sales.map((s) => s.commissionCents + s.freightCents + s.checkoffCents + s.otherCents));
  const netProceedsCents = grossSalesCents - saleExpensesCents;
  const breakevenCwt = div(totalCostCents + saleExpensesCents, saleWeightTotalLb);
  const netProfitCents = netProceedsCents - totalCostCents;

  const brdPulls = new Map<string, number>();
  for (const t of input.treatments) {
    if (t.voidedAt !== null || t.diagnosis !== "brd") continue;
    brdPulls.set(t.animalId, (brdPulls.get(t.animalId) ?? 0) + 1);
  }
  const treated = brdPulls.size;
  const retreated = [...brdPulls.values()].filter((n) => n >= 2).length;

  return {
    headIn,
    headSold,
    headDead,
    purchaseCostCents,
    avgInWeightLb,
    soldInWeightLb,
    saleWeightTotalLb,
    lbGained,
    daysOnFeed,
    adgLb,
    drugCostCents,
    otherCostCents,
    nonPurchaseCostCents,
    totalCostCents,
    cogCentsPerLb,
    deadPurchaseCents,
    cogInclDeathCentsPerLb,
    grossSalesCents,
    saleExpensesCents,
    netProceedsCents,
    breakevenCentsPerCwt: breakevenCwt === null ? null : breakevenCwt * 100,
    netProfitCents,
    profitPerHeadInCents: div(netProfitCents, headIn),
    deathLossPct: div(headDead, headIn),
    morbidityPct: div(treated, headIn),
    retreatPct: div(retreated, treated),
  };
}

/** Display strings keyed by the §5.7 names. */
export function formatCloseout(c: Closeout) {
  return {
    head_in: String(c.headIn),
    head_sold: String(c.headSold),
    head_dead: String(c.headDead),
    purchase_cost: formatCents(c.purchaseCostCents),
    avg_in_weight: formatLb(c.avgInWeightLb),
    sale_weight_total: formatLb(c.saleWeightTotalLb),
    lb_gained: formatLb(c.lbGained),
    days_on_feed: formatDays(c.daysOnFeed),
    adg: formatLbPerDay(c.adgLb),
    drug_cost: formatCents(c.drugCostCents),
    other_cost: formatCents(c.otherCostCents),
    total_cost: formatCents(c.totalCostCents),
    cog: formatCentsPerLb(c.cogCentsPerLb),
    dead_purchase: formatCents(c.deadPurchaseCents),
    cog_incl_death: formatCentsPerLb(c.cogInclDeathCentsPerLb),
    gross_sales: formatCents(c.grossSalesCents),
    sale_expenses: formatCents(c.saleExpensesCents),
    net_proceeds: formatCents(c.netProceedsCents),
    breakeven_cwt: formatCentsPerCwt(c.breakevenCentsPerCwt),
    net_profit: formatCents(c.netProfitCents),
    profit_per_head_in: formatCents(c.profitPerHeadInCents),
    death_loss_pct: formatPct(c.deathLossPct),
    morbidity_pct: formatPct(c.morbidityPct),
    retreat_pct: formatPct(c.retreatPct),
  };
}
