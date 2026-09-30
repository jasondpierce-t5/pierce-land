/**
 * Bottle math (§5.6). Volumes are handled in integer hundredths of a mL (the DB stores
 * `numeric(7,2)`) so remaining mL never drifts.
 */
import { addDays, chicagoDate, type IsoDate } from "./dates";

export type InventoryStatus = "in_stock" | "open" | "empty" | "expired" | "discarded";

export interface Bottle {
  id: string;
  productId: string;
  expirationDate: IsoDate;
  sizeMl: number;
  remainingMl: number;
  costCents: number;
  openedAt: string | null;
  status: InventoryStatus;
}

export type BottleProblem = "expired" | "discarded" | "empty" | "insufficient";

const hundredths = (ml: number) => Math.round(ml * 100);
const fromHundredths = (h: number) => h / 100;

function assertPositiveSize(sizeMl: number): void {
  if (!Number.isFinite(sizeMl) || sizeMl <= 0) throw new RangeError("Bottle size must be positive");
}

export function costPerMl(costCents: number, sizeMl: number): number {
  assertPositiveSize(sizeMl);
  return costCents / sizeMl;
}

/** `round(dose_ml × cost_cents / size_ml)`, half away from zero, like Postgres `round(numeric)`. */
export function administrationCostCents(doseMl: number, costCents: number, sizeMl: number): number {
  assertPositiveSize(sizeMl);
  // Integer numerator and denominator: n / d is never within float error of a .5 boundary
  // unless it is exactly .5, which Math.round sends up (costs are never negative).
  return Math.round((hundredths(doseMl) * costCents) / hundredths(sizeMl));
}

function isPastExpiry(b: Bottle, today: IsoDate): boolean {
  return b.status === "expired" || b.expirationDate < today;
}

function isUsable(b: Bottle, today: IsoDate): boolean {
  return !isPastExpiry(b, today) && b.status !== "discarded" && b.status !== "empty" && b.remainingMl > 0;
}

/** Why a dose can't come from this bottle, or null if it can. */
export function bottleProblem(b: Bottle, doseMl: number, today: IsoDate): BottleProblem | null {
  if (isPastExpiry(b, today)) return "expired";
  if (b.status === "discarded") return "discarded";
  if (b.status === "empty" || hundredths(b.remainingMl) <= 0) return "empty";
  if (hundredths(b.remainingMl) < hundredths(doseMl)) return "insufficient";
  return null;
}

export interface BottleAfterDose {
  remainingMl: number;
  openedAt: string;
  status: "open" | "empty";
}

/** The bottle after one dose. A dose must fit in a single bottle. Mirrors the DB trigger. */
export function applyDose(
  b: Bottle,
  doseMl: number,
  givenAt: string,
  today: IsoDate = chicagoDate(givenAt),
): BottleAfterDose {
  const problem = bottleProblem(b, doseMl, today);
  if (problem) throw new RangeError(`Can't dose from bottle ${b.id}: ${problem}`);
  const remaining = hundredths(b.remainingMl) - hundredths(doseMl);
  return {
    remainingMl: fromHundredths(remaining),
    openedAt: b.openedAt ?? givenAt,
    status: remaining === 0 ? "empty" : "open",
  };
}

/** The bottle after a voided dose is put back (§6). */
export function restoreDose(b: Bottle, doseMl: number): { remainingMl: number; status: InventoryStatus } {
  return {
    remainingMl: fromHundredths(hundredths(b.remainingMl) + hundredths(doseMl)),
    status: b.status === "empty" ? "open" : b.status,
  };
}

function byExpiry(a: Bottle, b: Bottle): number {
  return a.expirationDate.localeCompare(b.expirationDate) || a.id.localeCompare(b.id);
}

/** The session default: the open bottle, otherwise the earliest-expiring in-stock one. */
export function defaultBottle(bottles: readonly Bottle[], productId: string, today: IsoDate): Bottle | null {
  const usable = bottles.filter((b) => b.productId === productId && isUsable(b, today)).sort(byExpiry);
  return usable.find((b) => b.status === "open") ?? usable.find((b) => b.status === "in_stock") ?? null;
}

/** Bottles still in stock or open whose expiration is on or before today + days (soonest first). */
export function expiringWithin(bottles: readonly Bottle[], today: IsoDate, days: number): Bottle[] {
  const cutoff = addDays(today, days);
  return bottles
    .filter((b) => (b.status === "in_stock" || b.status === "open") && b.expirationDate <= cutoff)
    .sort(byExpiry);
}

/** Whole doses available for a product across its usable bottles. */
export function dosesOnHand(
  bottles: readonly Bottle[],
  productId: string,
  doseVolumeMl: number,
  today: IsoDate,
): number {
  const dose = hundredths(doseVolumeMl);
  if (dose <= 0) throw new RangeError("Dose volume must be positive");
  return bottles
    .filter((b) => b.productId === productId && isUsable(b, today))
    .reduce((n, b) => n + Math.floor(hundredths(b.remainingMl) / dose), 0);
}

/** Less than one lot's worth of doses on hand. */
export function isLowStock(doses: number, lotHead: number): boolean {
  return doses < lotHead;
}
