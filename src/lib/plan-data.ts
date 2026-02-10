/**
 * Public data fetching for Pierce Land & Cattle plan pages.
 *
 * Fetches plan version + base config from Supabase, merges overrides,
 * runs the full calculation pipeline, and returns typed results.
 *
 * Called directly from server components — no API route needed.
 */

import { supabase } from './supabase';
import {
  mergeConfig,
  calculateSpringTurn,
  calculateWinterTurn,
  calculateAnnualProjections,
  calculateScenarios,
  calculateHaySensitivity,
  calculatePurchaseSensitivity,
  calculateWorstCase,
  getBreakevenPrices,
} from './calculations';
import type {
  PlanConfig,
  PlanVersion,
  TurnResult,
  WinterTurnResult,
  AnnualProjection,
  ScenarioAnalysis,
  HaySensitivityTable,
  PurchaseSensitivityTable,
  WorstCaseScenario,
} from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Complete data payload for rendering a public plan page.
 * Contains the version metadata, merged config, and all calculation results.
 */
export interface PlanPageData {
  version: PlanVersion;
  config: PlanConfig;
  spring: TurnResult;
  winter: WinterTurnResult;
  annual: AnnualProjection;
  scenarios: ScenarioAnalysis;
  haySensitivity: HaySensitivityTable;
  purchaseSensitivity: PurchaseSensitivityTable;
  worstCase: WorstCaseScenario;
  breakeven: { springBreakeven: number; winterBreakeven: number };
}

// =============================================================================
// Data fetching
// =============================================================================

/**
 * Fetch plan data by slug and run the full calculation pipeline.
 *
 * @param slug - The plan version slug (e.g., "first-national-bank")
 * @returns PlanPageData with all calculation results, or null if slug not found / inactive
 */
export async function fetchPlanData(slug: string): Promise<PlanPageData | null> {
  // 1. Fetch the active plan version by slug
  const { data: version, error: versionError } = await supabase
    .from('plan_versions')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  // If version not found or error, return null (caller handles 404)
  if (versionError || !version) {
    return null;
  }

  // 2. Fetch the base plan config (singleton row)
  const { data: config, error: configError } = await supabase
    .from('plan_config')
    .select('*')
    .single();

  if (configError || !config) {
    throw new Error(
      `Failed to load plan configuration: ${configError?.message ?? 'No config row found'}`
    );
  }

  // 3. Merge version overrides into base config
  const merged = mergeConfig(config as PlanConfig, version as PlanVersion);

  // 4. Run full calculation pipeline
  const spring = calculateSpringTurn(merged);
  const winter = calculateWinterTurn(merged);
  const annual = calculateAnnualProjections(spring, winter, merged);
  const scenarios = calculateScenarios(merged);
  const haySensitivity = calculateHaySensitivity(merged);
  const purchaseSensitivity = calculatePurchaseSensitivity(merged);
  const worstCase = calculateWorstCase(merged);
  const breakeven = getBreakevenPrices(spring, winter, merged);

  // 5. Return typed result object
  return {
    version: version as PlanVersion,
    config: merged,
    spring,
    winter,
    annual,
    scenarios,
    haySensitivity,
    purchaseSensitivity,
    worstCase,
    breakeven,
  };
}
