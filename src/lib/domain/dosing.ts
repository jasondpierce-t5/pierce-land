/**
 * Dosing without scales (§5.1–5.2).
 *
 * Volumes are computed in integer hundredths of a mL so label doses like 1.1 mL/cwt don't pick
 * up float error and get rounded up an extra half mL.
 */
import { daysBetween, type IsoDate } from "./dates";

export type DoseBasis = "per_100lb" | "per_head";
export type ProductUnit = "mL" | "each";
export type DoseWeightSource = "event_tape" | "recent_tape" | "lot_average";

/** A tape reading older than this many days is not used for dosing. */
export const RECENT_TAPE_MAX_AGE_DAYS = 30;
export const BRACKET_LB = 50;

export interface DoseWeight {
  /** The weight the bracket was taken from. */
  weightLb: number;
  /** `dose_weight_lb`: the bracket weight actually used for dosing. */
  bracketLb: number;
  source: DoseWeightSource;
}

export interface TapeReading {
  weightLb: number;
  measuredOn: IsoDate;
}

export interface DoseWeightInput {
  eventTapeLb: number | null | undefined;
  /** The animal's earlier tape readings (non-voided); any order. */
  recentTapes: readonly TapeReading[];
  /** The event date. */
  asOf: IsoDate;
  lot: { payWeightTotalLb: number | null; headPurchased: number | null };
}

function assertPositive(n: number, what: string): void {
  if (!Number.isFinite(n) || n <= 0) throw new RangeError(`${what} must be a positive number`);
}

const hundredths = (n: number) => Math.round(n * 100);

/** Round up to the next 50 lb: 450 → 450, 451 → 500. */
export function bracketWeight(weightLb: number): number {
  assertPositive(weightLb, "Weight");
  // Weights are stored to 0.1 lb; work in tenths to keep the ceil exact.
  const tenths = Math.round(weightLb * 10);
  return Math.ceil(tenths / (BRACKET_LB * 10)) * BRACKET_LB;
}

export function resolveDoseWeight(input: DoseWeightInput): DoseWeight | null {
  const { eventTapeLb, recentTapes, asOf, lot } = input;

  if (eventTapeLb !== null && eventTapeLb !== undefined) {
    return { weightLb: eventTapeLb, bracketLb: bracketWeight(eventTapeLb), source: "event_tape" };
  }

  let latest: TapeReading | null = null;
  for (const t of recentTapes) {
    const age = daysBetween(t.measuredOn, asOf);
    if (age < 0 || age > RECENT_TAPE_MAX_AGE_DAYS) continue;
    if (latest === null || t.measuredOn > latest.measuredOn) latest = t;
  }
  if (latest) {
    return { weightLb: latest.weightLb, bracketLb: bracketWeight(latest.weightLb), source: "recent_tape" };
  }

  const { payWeightTotalLb, headPurchased } = lot;
  if (payWeightTotalLb && headPurchased && payWeightTotalLb > 0 && headPurchased > 0) {
    const avg = payWeightTotalLb / headPurchased;
    return { weightLb: avg, bracketLb: bracketWeight(avg), source: "lot_average" };
  }
  return null;
}

export interface DoseProduct {
  doseBasis: DoseBasis;
  /** Label dose: mL per head, or mL per 100 lb. */
  doseMl: number;
}

/** per_head → the label dose; per_100lb → label × bracket / 100, rounded up to 0.5 mL. */
export function doseVolumeMl(product: DoseProduct, bracketLb: number): number {
  assertPositive(product.doseMl, "Label dose");
  if (product.doseBasis === "per_head") return product.doseMl;
  assertPositive(bracketLb, "Bracket weight");
  // hundredths-of-mL × lb / 100 = hundredths of mL; round up to a multiple of 50 hundredths.
  const numerator = hundredths(product.doseMl) * bracketLb;
  const halfMlSteps = Math.ceil(numerator / (100 * 50));
  return halfMlSteps / 2;
}

/** Injection sites needed so no site exceeds the label max. */
export function siteCount(volumeMl: number, maxMlPerSite: number | null | undefined): number {
  if (maxMlPerSite === null || maxMlPerSite === undefined) return 1;
  assertPositive(maxMlPerSite, "Max mL per site");
  return Math.max(1, Math.ceil(hundredths(volumeMl) / hundredths(maxMlPerSite)));
}

export interface ComputedDose {
  volume: number;
  sites: number;
}

export function computeDose(
  product: DoseProduct & { maxMlPerSite: number | null; unit: ProductUnit },
  bracketLb: number,
): ComputedDose {
  const volume = doseVolumeMl(product, bracketLb);
  const sites = product.unit === "each" ? 1 : siteCount(volume, product.maxMlPerSite);
  return { volume, sites };
}

/** "12.0 mL — 2 sites" */
export function formatDose(dose: ComputedDose, unit: ProductUnit): string {
  if (unit === "each") return `${dose.volume} each`;
  return `${dose.volume.toFixed(1)} mL — ${dose.sites} ${dose.sites === 1 ? "site" : "sites"}`;
}
