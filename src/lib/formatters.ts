/**
 * Number formatting utilities for Pierce Land & Cattle business plan display.
 *
 * All formatters handle NaN, Infinity, and undefined gracefully by returning "N/A".
 * No rounding happens at the calculation level — these formatters decide display precision.
 */

/**
 * Guard: returns true if the value is a finite number safe for formatting.
 */
function isValid(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Format as USD currency with commas and 2 decimal places.
 * Negative values use accounting format: "($1,234.56)".
 *
 * @example formatCurrency(1234.56)  → "$1,234.56"
 * @example formatCurrency(-1234.56) → "($1,234.56)"
 */
export function formatCurrency(value: number): string {
  if (!isValid(value)) return 'N/A';

  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return value < 0 ? `($${formatted})` : `$${formatted}`;
}

/**
 * Format as USD currency with commas and no decimal places.
 * Negative values use accounting format: "($1,235)".
 *
 * @example formatCurrencyWhole(1234.56)  → "$1,235"
 * @example formatCurrencyWhole(-1234.56) → "($1,235)"
 */
export function formatCurrencyWhole(value: number): string {
  if (!isValid(value)) return 'N/A';

  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return value < 0 ? `($${formatted})` : `$${formatted}`;
}

/**
 * Format as percentage with specified decimal places.
 * Input is already in percentage form (not decimal).
 *
 * @example formatPercent(4.5)    → "4.5%"
 * @example formatPercent(4.567, 2) → "4.57%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  if (!isValid(value)) return 'N/A';

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${formatted}%`;
}

/**
 * Format a number with commas and specified decimal places.
 *
 * @example formatNumber(1250)     → "1,250"
 * @example formatNumber(1250.5, 1) → "1,250.5"
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (!isValid(value)) return 'N/A';

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format as weight in pounds with commas.
 *
 * @example formatWeight(1250) → "1,250 lbs"
 */
export function formatWeight(value: number): string {
  if (!isValid(value)) return 'N/A';

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `${formatted} lbs`;
}

/**
 * Format as price per hundredweight (cwt) with 2 decimals.
 *
 * @example formatCwt(185) → "$185.00/cwt"
 */
export function formatCwt(value: number): string {
  if (!isValid(value)) return 'N/A';

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `$${formatted}/cwt`;
}
