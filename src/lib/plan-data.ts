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
  AnnualProjection,
  ScenarioAnalysis,
  HaySensitivityTable,
  PurchaseSensitivityTable,
  WorstCaseScenario,
} from './types';

// Explicit column list bypasses PostgREST schema cache issues with SELECT *
const PLAN_CONFIG_COLUMNS = [
  'id', 'created_at', 'updated_at',
  'operator_name', 'operation_location', 'acres', 'years_experience',
  'market_price_500lb', 'market_price_850lb',
  'sale_price_low_per_cwt', 'sale_price_high_per_cwt',
  'hay_price_per_ton', 'feed_cost_per_day',
  'purchase_weight_lbs', 'sale_weight_lbs', 'avg_daily_gain_lbs', 'mortality_rate_pct',
  'spring_sale_weight_lbs', 'spring_days_on_feed',
  'spring_health_cost_per_head', 'spring_freight_in_per_head',
  'spring_mineral_cost_per_head', 'spring_lrp_premium_per_head',
  'spring_marketing_commission_per_head', 'spring_freight_out_per_head',
  'spring_death_loss_pct', 'spring_misc_per_head',
  'winter_sale_weight_lbs', 'winter_days_on_feed',
  'winter_health_cost_per_head', 'winter_freight_in_per_head',
  'winter_mineral_cost_per_head', 'winter_lrp_premium_per_head',
  'winter_marketing_commission_per_head', 'winter_freight_out_per_head',
  'winter_death_loss_pct', 'winter_misc_per_head',
  'hay_price_per_bale', 'hay_bale_weight_lbs', 'hay_waste_pct', 'commodity_price_per_ton',
  'spring_hay_daily_intake_lbs', 'spring_commodity_daily_intake_lbs',
  'hay_daily_intake_lbs', 'commodity_daily_intake_lbs',
  'interest_rate_pct', 'loc_amount', 'head_count',
  'sell_buy_margin_pct',
].join(', ');

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
  winter: TurnResult;
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
    .select(PLAN_CONFIG_COLUMNS)
    .single();

  if (configError || !config) {
    throw new Error(
      `Failed to load plan configuration: ${configError?.message ?? 'No config row found'}`
    );
  }

  // 3. Merge version overrides into base config
  const merged = mergeConfig(config as unknown as PlanConfig, version as unknown as PlanVersion);

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
    version: version as unknown as PlanVersion,
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
