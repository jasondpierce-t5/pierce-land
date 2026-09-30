/**
 * Group-average gain from two tape-weight sessions (§5.8). Tape weights are too noisy for
 * individual ADG, which is never shown; the group estimate needs n ≥ 12 and ≥ 60 days.
 */
import { daysBetween, type IsoDate } from "./dates";
import type { VoidedAt } from "./types";

export const GROUP_GAIN_MIN_ANIMALS = 12;
export const GROUP_GAIN_MIN_DAYS = 60;
export const NOT_ENOUGH_DATA_MESSAGE = "Not enough data for a reliable estimate.";

export interface TapeSession {
  date: IsoDate;
  /** Processing events in that session, in recorded order. */
  readings: readonly { animalId: string; tapeWeightLb: number | null; voidedAt: VoidedAt }[];
}

export type GroupGain =
  | { kind: "estimate"; n: number; days: number; avgGainLb: number; avgDailyGainLb: number }
  | { kind: "insufficient"; n: number; days: number; message: typeof NOT_ENOUGH_DATA_MESSAGE };

/** Last non-voided tape weight per animal. */
function weights(s: TapeSession): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of s.readings) {
    if (r.voidedAt === null && r.tapeWeightLb !== null) m.set(r.animalId, r.tapeWeightLb);
  }
  return m;
}

export function groupGain(a: TapeSession, b: TapeSession): GroupGain {
  const [first, second] = a.date <= b.date ? [a, b] : [b, a];
  const days = daysBetween(first.date, second.date);
  const before = weights(first);
  const after = weights(second);

  const gains: number[] = [];
  for (const [animalId, w2] of after) {
    const w1 = before.get(animalId);
    if (w1 !== undefined) gains.push(w2 - w1);
  }
  const n = gains.length;

  if (n < GROUP_GAIN_MIN_ANIMALS || days < GROUP_GAIN_MIN_DAYS) {
    return { kind: "insufficient", n, days, message: NOT_ENOUGH_DATA_MESSAGE };
  }
  const avgGainLb = gains.reduce((s, g) => s + g, 0) / n;
  return { kind: "estimate", n, days, avgGainLb, avgDailyGainLb: avgGainLb / days };
}
