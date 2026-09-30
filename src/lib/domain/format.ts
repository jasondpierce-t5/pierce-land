/** Display formatting for stored units (§2: convert only at the display layer). Null → "—". */

export const EMPTY = "—";
const MINUS = "−";

function fixed(n: number, digits: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

/** Formats |n| and puts a real minus sign in front of negatives (after rounding). */
function signed(n: number, body: (abs: number) => string): string {
  const text = body(Math.abs(n));
  return n < 0 && /[1-9]/.test(text) ? `${MINUS}${text}` : text;
}

export function formatCents(cents: number | null): string {
  if (cents === null) return EMPTY;
  return signed(cents, (abs) => `$${fixed(abs / 100, 2)}`);
}

/** Cost of gain, $/lb to 4 decimals. */
export function formatCentsPerLb(centsPerLb: number | null): string {
  if (centsPerLb === null) return EMPTY;
  return signed(centsPerLb, (abs) => `$${fixed(abs / 100, 4)}/lb`);
}

/** Breakeven, $/cwt to the cent. */
export function formatCentsPerCwt(centsPerCwt: number | null): string {
  return formatCents(centsPerCwt);
}

export function formatLb(lb: number | null): string {
  if (lb === null) return EMPTY;
  return signed(lb, (abs) => fixed(abs, 1));
}

export function formatDays(days: number | null): string {
  if (days === null) return EMPTY;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(days);
}

/** ADG to 3 decimals, truncated (matches the §5.7 golden table: 1.32450… → 1.324). */
export function formatLbPerDay(lbPerDay: number | null): string {
  if (lbPerDay === null) return EMPTY;
  return signed(lbPerDay, (abs) => `${fixed(Math.trunc(abs * 1000 + 1e-9) / 1000, 3)} lb/day`);
}

/** A 0–1 fraction as a percent to one decimal. */
export function formatPct(fraction: number | null): string {
  if (fraction === null) return EMPTY;
  return `${fixed(fraction * 100, 1)}%`;
}
