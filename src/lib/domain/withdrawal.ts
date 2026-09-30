/** Slaughter withdrawal (§5.5). A clear date is the first day the animal may be sold. */
import { addDays, maxDate, toFarmDate, type IsoDate } from "./dates";
import type { VoidedAt } from "./types";

export type AnimalStatus = "active" | "sold" | "dead" | "removed";

/** `given_at` (farm date) + `slaughter_withdrawal_days`. Mirrors the DB snapshot trigger. */
export function withdrawalClearDate(givenAt: Date | string, slaughterWithdrawalDays: number): IsoDate {
  if (!Number.isInteger(slaughterWithdrawalDays) || slaughterWithdrawalDays < 0) {
    throw new RangeError("Withdrawal days must be a whole number ≥ 0");
  }
  return addDays(toFarmDate(givenAt), slaughterWithdrawalDays);
}

export interface WithdrawalAdministration {
  withdrawalClearDate: IsoDate;
  voidedAt: VoidedAt;
  skipped: boolean;
}

/** Max over non-voided, non-skipped administrations; null if none. */
export function animalClearDate(administrations: readonly WithdrawalAdministration[]): IsoDate | null {
  return maxDate(
    administrations.filter((a) => a.voidedAt === null && !a.skipped).map((a) => a.withdrawalClearDate),
  );
}

/** Max over the lot's active animals; null if none are in withdrawal history. */
export function lotClearDate(animals: readonly { status: AnimalStatus; clearDate: IsoDate | null }[]): IsoDate | null {
  return maxDate(
    animals
      .filter((a) => a.status === "active")
      .map((a) => a.clearDate)
      .filter((d): d is IsoDate => d !== null),
  );
}

export function inWithdrawal(clearDate: IsoDate | null, today: IsoDate): boolean {
  return clearDate !== null && clearDate > today;
}

/** Animals not clear by the sale date. The sale can still be saved; the UI shows the flag. */
export function saleWithdrawalFlags<A extends { clearDate: IsoDate | null }>(
  animals: readonly A[],
  saleDate: IsoDate,
): A[] {
  return animals.filter((a) => inWithdrawal(a.clearDate, saleDate));
}
