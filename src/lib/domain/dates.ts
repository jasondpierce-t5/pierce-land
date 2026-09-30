/**
 * Calendar-date helpers. Farm dates are `YYYY-MM-DD` strings in America/Chicago (§2).
 * Arithmetic runs in UTC on the date alone, so DST never shifts a day count.
 */

export type IsoDate = string;

export const FARM_TIME_ZONE = "America/Chicago";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function toUtcMs(date: IsoDate): number {
  const m = ISO_DATE.exec(date);
  if (!m) throw new RangeError(`Not an ISO date: ${date}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
    throw new RangeError(`Not a real calendar date: ${date}`);
  }
  return ms;
}

export function assertIsoDate(date: IsoDate): IsoDate {
  toUtcMs(date);
  return date;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(toUtcMs(date) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

const chicagoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: FARM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The America/Chicago calendar date of an instant (mirrors `(ts at time zone 'America/Chicago')::date`). */
export function chicagoDate(instant: Date | string): IsoDate {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(d.getTime())) throw new RangeError(`Not a timestamp: ${String(instant)}`);
  return chicagoFormatter.format(d);
}

/** ISO dates sort lexically, so the max is a string compare. */
export function maxDate(dates: readonly IsoDate[]): IsoDate | null {
  let max: IsoDate | null = null;
  for (const d of dates) if (max === null || d > max) max = d;
  return max;
}
