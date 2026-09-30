/** Pull numbering, suggested treatment, metaphylaxis interval, same-class warning (§5.4). */
import { daysBetween, type IsoDate } from "./dates";
import { nsaidIndicated } from "./fever";
import type { Diagnosis, DrugClass, VoidedAt } from "./types";

export const BEYOND_PROTOCOL_MESSAGE = "Beyond protocol — call vet";
export const SAME_CLASS_LOOKBACK_DAYS = 14;

export interface PriorTreatment {
  diagnosis: Diagnosis;
  voidedAt: VoidedAt;
}

/** Count of the animal's prior non-voided treatments with the same diagnosis, plus 1. */
export function pullNumber(prior: readonly PriorTreatment[], diagnosis: Diagnosis): number {
  return prior.filter((t) => t.voidedAt === null && t.diagnosis === diagnosis).length + 1;
}

export interface TreatmentStep {
  id: string;
  sequence: number;
  productId: string;
  pullNumber: number | null;
  conditional: "none" | "temp_gte_threshold";
}

export type TreatmentSuggestion<S extends TreatmentStep> =
  | {
      kind: "protocol";
      pullNumber: number;
      /** Steps to give, in sequence order. */
      steps: S[];
      /** Conditional steps for this pull whose condition isn't met (e.g., NSAID below threshold). */
      notIndicated: S[];
    }
  | {
      kind: "beyond_protocol";
      pullNumber: number;
      maxPullNumber: number | null;
      message: typeof BEYOND_PROTOCOL_MESSAGE;
    };

export function suggestTreatment<S extends TreatmentStep>(
  protocolSteps: readonly S[],
  pull: number,
  tempF: number | null | undefined,
  nsaidTempThresholdF: number,
): TreatmentSuggestion<S> {
  const pulls = protocolSteps.map((s) => s.pullNumber).filter((n): n is number => n !== null);
  const maxPullNumber = pulls.length > 0 ? Math.max(...pulls) : null;
  if (maxPullNumber === null || pull > maxPullNumber) {
    return { kind: "beyond_protocol", pullNumber: pull, maxPullNumber, message: BEYOND_PROTOCOL_MESSAGE };
  }

  const forPull = protocolSteps
    .filter((s) => s.pullNumber === pull)
    .sort((a, b) => a.sequence - b.sequence);
  const indicated = (s: S) =>
    s.conditional === "none" || nsaidIndicated(tempF, nsaidTempThresholdF);

  return {
    kind: "protocol",
    pullNumber: pull,
    steps: forPull.filter(indicated),
    notIndicated: forPull.filter((s) => !indicated(s)),
  };
}

/** One dose from the animal's history, joined to its product. */
export interface AdministrationHistoryItem {
  productId: string;
  productName: string;
  drugClass: DrugClass;
  isAntimicrobial: boolean;
  postMetaphylaxisIntervalDays: number | null;
  givenOn: IsoDate;
  voidedAt: VoidedAt;
  skipped: boolean;
}

export interface MetaphylaxisStatus {
  productName: string;
  givenOn: IsoDate;
  intervalDays: number;
  /** Days since the metaphylaxis dose (0 on the day given). */
  day: number;
  /** True when `asOf` is before givenOn + intervalDays: pulling now needs acknowledgement. */
  withinInterval: boolean;
}

const counts = (a: AdministrationHistoryItem) => a.voidedAt === null && !a.skipped;

/**
 * The metaphylaxis dose relevant on `asOf`: the one whose interval still covers it (latest end
 * wins), otherwise the most recent one, for the side panel's day counter. Null if none.
 */
export function metaphylaxisStatus(
  history: readonly AdministrationHistoryItem[],
  asOf: IsoDate,
): MetaphylaxisStatus | null {
  const candidates: MetaphylaxisStatus[] = [];
  for (const a of history) {
    if (!counts(a) || a.postMetaphylaxisIntervalDays === null) continue;
    const day = daysBetween(a.givenOn, asOf);
    if (day < 0) continue;
    candidates.push({
      productName: a.productName,
      givenOn: a.givenOn,
      intervalDays: a.postMetaphylaxisIntervalDays,
      day,
      withinInterval: day < a.postMetaphylaxisIntervalDays,
    });
  }
  if (candidates.length === 0) return null;

  const within = candidates.filter((c) => c.withinInterval);
  const endDay = (c: MetaphylaxisStatus) => c.intervalDays - c.day;
  if (within.length > 0) return within.reduce((best, c) => (endDay(c) > endDay(best) ? c : best));
  return candidates.reduce((best, c) => (c.givenOn > best.givenOn ? c : best));
}

export function metaphylaxisMessage(s: MetaphylaxisStatus): string {
  return `Within post-metaphylaxis interval (day ${s.day} of ${s.intervalDays}). Per protocol, this may not be a treatment failure.`;
}

export interface SuggestedProduct {
  productId: string;
  productName: string;
  drugClass: DrugClass;
  isAntimicrobial: boolean;
}

export interface SameClassWarning {
  productId: string;
  drugClass: DrugClass;
  priorProductName: string;
  priorGivenOn: IsoDate;
}

/** Non-blocking: a suggested antimicrobial shares a class with one given in the last 14 days. */
export function sameClassWarnings(
  suggested: readonly SuggestedProduct[],
  history: readonly AdministrationHistoryItem[],
  asOf: IsoDate,
): SameClassWarning[] {
  const recent = history.filter((a) => {
    if (!counts(a) || !a.isAntimicrobial) return false;
    const age = daysBetween(a.givenOn, asOf);
    return age >= 0 && age <= SAME_CLASS_LOOKBACK_DAYS;
  });

  const warnings: SameClassWarning[] = [];
  for (const p of suggested) {
    if (!p.isAntimicrobial) continue;
    const prior = recent
      .filter((a) => a.drugClass === p.drugClass)
      .reduce<AdministrationHistoryItem | null>((best, a) => (!best || a.givenOn > best.givenOn ? a : best), null);
    if (prior) {
      warnings.push({
        productId: p.productId,
        drugClass: p.drugClass,
        priorProductName: prior.productName,
        priorGivenOn: prior.givenOn,
      });
    }
  }
  return warnings;
}
