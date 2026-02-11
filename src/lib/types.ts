/**
 * Type definitions for Pierce Land & Cattle business plan application.
 * Matches the expanded database schema (plan_config + plan_versions).
 */

// =============================================================================
// Database entity types
// =============================================================================

/**
 * Shared operational and financial configuration (singleton row).
 * All fields match the plan_config table columns exactly.
 */
export interface PlanConfig {
  id: string;
  created_at: string;
  updated_at: string;

  // Operator Info (4 fields)
  operator_name: string;
  operation_location: string;
  acres: number;
  years_experience: number;

  // Market Prices (4 fields — 2 original + 2 sale scenarios)
  market_price_500lb: number;   // per cwt (purchase price)
  market_price_850lb: number;   // per cwt (sale price, mid scenario)
  sale_price_low_per_cwt: number;
  sale_price_high_per_cwt: number;

  // Feed Costs (2 original fields)
  hay_price_per_ton: number;
  feed_cost_per_day: number;

  // Operational Parameters (4 original fields)
  purchase_weight_lbs: number;
  sale_weight_lbs: number;
  avg_daily_gain_lbs: number;
  mortality_rate_pct: number;

  // Spring Turn Operations (10 fields)
  spring_sale_weight_lbs: number;
  spring_days_on_feed: number;
  spring_health_cost_per_head: number;
  spring_freight_in_per_head: number;
  spring_mineral_cost_per_head: number;
  spring_lrp_premium_per_head: number;
  spring_marketing_commission_per_head: number;
  spring_freight_out_per_head: number;
  spring_death_loss_pct: number;
  spring_misc_per_head: number;

  // Winter Turn Operations (10 fields)
  winter_sale_weight_lbs: number;
  winter_days_on_feed: number;
  winter_health_cost_per_head: number;
  winter_freight_in_per_head: number;
  winter_mineral_cost_per_head: number;
  winter_lrp_premium_per_head: number;
  winter_marketing_commission_per_head: number;
  winter_freight_out_per_head: number;
  winter_death_loss_pct: number;
  winter_misc_per_head: number;

  // Feed Details — shared pricing, per-turn intake rates
  hay_price_per_bale: number;
  hay_bale_weight_lbs: number;
  hay_waste_pct: number;
  commodity_price_per_ton: number;
  spring_hay_daily_intake_lbs: number;
  spring_commodity_daily_intake_lbs: number;
  hay_daily_intake_lbs: number;         // winter hay intake
  commodity_daily_intake_lbs: number;   // winter commodity intake

  // Financial Defaults (3 original fields)
  interest_rate_pct: number;
  loc_amount: number;
  head_count: number;

  // Sell/Buy Marketing
  sell_buy_margin_pct: number;
}

/**
 * Bank-specific plan version with optional overrides.
 * Null override values mean "use the plan_config default".
 */
export interface PlanVersion {
  id: string;
  created_at: string;
  updated_at: string;
  slug: string;
  bank_name: string;
  is_active: boolean;
  override_loc_amount: number | null;
  override_interest_rate_pct: number | null;
  override_head_count: number | null;
}

// =============================================================================
// Calculation result types
// =============================================================================

/**
 * Per-head result for a single turn (spring or winter).
 * All values are per-head unless otherwise noted.
 * Both turns include feed cost breakdown.
 */
export interface TurnResult {
  purchaseCost: number;
  weightGain: number;
  daysOnFeed: number;
  interestCost: number;
  deathLoss: number;
  carryingCosts: number;
  totalInvestment: number;
  grossRevenue: number;
  netIncome: number;
  costOfGain: number;
  // Feed breakdown
  hayPricePerLb: number;
  hayConsumed: number;
  hayCost: number;
  hayWaste: number;
  commodityCost: number;
  totalFeedCost: number;
}

/**
 * Result of a sell/buy marketing cycle after a turn completes.
 * Operator keeps margin_pct% as protected margin, reinvests the rest.
 */
export interface SellBuyResult {
  headCount: number;
  totalGrossRevenue: number;
  protectedMargin: number;
  reinvestmentPool: number;
  purchaseCostPerHead: number;
  nextHeadCount: number;
}

/**
 * Annual projection combining sequential spring → sell/buy → winter turns.
 */
export interface AnnualProjection {
  springHeadCount: number;
  springTotal: number;
  springSellBuy: SellBuyResult;
  winterHeadCount: number;
  winterTotal: number;
  winterSellBuy: SellBuyResult;
  annualNetIncome: number;
  totalRevenue: number;
  totalProtectedMargin: number;
  totalInvestment: number;
  locUtilization: number;
  locCapacityRemaining: number;
}

// =============================================================================
// Scenario analysis types
// =============================================================================

/**
 * Result for a single price scenario (low, mid, or high).
 */
export interface ScenarioResult {
  scenario: 'low' | 'mid' | 'high';
  salePriceCwt: number;
  springNet: number;
  winterNet: number;
  springHeadCount: number;
  winterHeadCount: number;
  annualNet: number;
  totalProtectedMargin: number;
}

/**
 * Complete scenario analysis with all three price scenarios.
 */
export interface ScenarioAnalysis {
  low: ScenarioResult;
  mid: ScenarioResult;
  high: ScenarioResult;
}

// =============================================================================
// Hay sensitivity types
// =============================================================================

/**
 * Single data point in the hay price sensitivity analysis.
 */
export interface HaySensitivityPoint {
  hayPricePerBale: number;
  totalFeedCost: number;
  winterNetPerHead: number;
  winterNetTotal: number;
}

/**
 * Array of hay sensitivity data points for chart generation.
 */
export type HaySensitivityTable = HaySensitivityPoint[];

// =============================================================================
// Purchase sensitivity and worst-case types
// =============================================================================

/**
 * Single data point in the purchase price sensitivity analysis.
 */
export interface PurchaseSensitivityPoint {
  purchasePriceCwt: number;
  springNetPerHead: number;
  winterNetPerHead: number;
  annualNetTotal: number;
}

/**
 * Array of purchase sensitivity data points for chart generation.
 */
export type PurchaseSensitivityTable = PurchaseSensitivityPoint[];

/**
 * Worst-case scenario: highest purchase price + lowest sale price.
 */
export interface WorstCaseScenario {
  purchasePriceCwt: number;
  salePriceCwt: number;
  springNet: number;
  winterNet: number;
  annualNet: number;
  description: string;
}
