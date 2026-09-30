/** Fever flags (§5.3). Temperatures are °F to 0.1; comparisons run in tenths. */

export interface FeverThresholds {
  /** Amber "Fever" badge at or above this. */
  feverF: number;
  /** Red "Sick on arrival" badge (and the day-0 treatment prompt) at or above this. */
  sickOnArrivalF: number;
}

export const DEFAULT_FEVER_THRESHOLDS: Readonly<FeverThresholds> = Object.freeze({
  feverF: 104.0,
  sickOnArrivalF: 105.0,
});

export type ProcessingFeverFlag = "none" | "fever" | "sick_on_arrival";

const tenths = (f: number) => Math.round(f * 10);

function atOrAbove(tempF: number | null | undefined, thresholdF: number): boolean {
  return tempF !== null && tempF !== undefined && tenths(tempF) >= tenths(thresholdF);
}

export function processingFeverFlag(
  tempF: number | null | undefined,
  thresholds: FeverThresholds = DEFAULT_FEVER_THRESHOLDS,
): ProcessingFeverFlag {
  if (atOrAbove(tempF, thresholds.sickOnArrivalF)) return "sick_on_arrival";
  if (atOrAbove(tempF, thresholds.feverF)) return "fever";
  return "none";
}

/** A `temp_gte_threshold` step (the NSAID) is included when temp ≥ the protocol's threshold. */
export function nsaidIndicated(tempF: number | null | undefined, thresholdF: number): boolean {
  return atOrAbove(tempF, thresholdF);
}
