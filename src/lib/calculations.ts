/**
 * Core calculation engine for Pierce Land & Cattle business plans.
 *
 * All functions are pure (no mutations, no side effects).
 * All financial values are per-head unless explicitly noted.
 * Prices labeled "per cwt" are per 100 lbs — divide by 100 for per-lb rate.
 * No rounding at calculation level — consumers decide display precision.
 */

import type { PlanConfig, PlanVersion } from './types';

// =============================================================================
// Config merging
// =============================================================================

/**
 * Merges plan_config with plan_version overrides.
 * If override is null or undefined, uses config value.
 * Returns a complete config with all values resolved.
 */
export function mergeConfig(
  config: PlanConfig,
  version?: PlanVersion | null
): PlanConfig {
  if (!version) return config;

  return {
    ...config,
    loc_amount: version.override_loc_amount ?? config.loc_amount,
    interest_rate_pct: version.override_interest_rate_pct ?? config.interest_rate_pct,
    head_count: version.override_head_count ?? config.head_count,
  };
}
