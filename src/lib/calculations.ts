/**
 * Core calculation engine for Pierce Land & Cattle business plans.
 *
 * All functions are pure (no mutations, no side effects).
 * All financial values are per-head unless explicitly noted.
 * Prices labeled "per cwt" are per 100 lbs — divide by 100 for per-lb rate.
 * No rounding at calculation level — consumers decide display precision.
 */

import type {
  PlanConfig,
  PlanVersion,
  TurnResult,
  WinterTurnResult,
  AnnualProjection,
  ScenarioAnalysis,
  HaySensitivityTable,
} from './types';

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

// =============================================================================
// Spring turn calculation
// =============================================================================

/**
 * Calculate per-head financials for the spring turn.
 *
 * Formula summary:
 *   purchaseCost    = purchase_weight_lbs x (market_price_500lb / 100)
 *   weightGain      = spring_sale_weight_lbs - purchase_weight_lbs
 *   interestCost    = purchaseCost x (interest_rate_pct / 100) x (daysOnFeed / 365)
 *   deathLoss       = purchaseCost x (spring_death_loss_pct / 100)
 *   carryingCosts   = sum of all per-head costs + interest + death loss
 *   totalInvestment = purchaseCost + carryingCosts
 *   grossRevenue    = spring_sale_weight_lbs x (market_price_850lb / 100)
 *   netIncome       = grossRevenue - totalInvestment
 *   costOfGain      = carryingCosts / weightGain  (guarded against division by zero)
 */
export function calculateSpringTurn(config: PlanConfig): TurnResult {
  // Purchase cost (price is per cwt, so divide by 100 to get per-lb rate)
  const purchaseCost = config.purchase_weight_lbs * (config.market_price_500lb / 100);

  // Weight gain
  const weightGain = config.spring_sale_weight_lbs - config.purchase_weight_lbs;

  // Days on feed
  const daysOnFeed = config.spring_days_on_feed;

  // Interest cost (annualized)
  const interestCost =
    purchaseCost * (config.interest_rate_pct / 100) * (daysOnFeed / 365);

  // Death loss
  const deathLoss = purchaseCost * (config.spring_death_loss_pct / 100);

  // Sum all carrying costs
  const carryingCosts =
    config.spring_health_cost_per_head +
    config.spring_freight_in_per_head +
    config.spring_mineral_cost_per_head +
    config.spring_lrp_premium_per_head +
    config.spring_marketing_commission_per_head +
    config.spring_freight_out_per_head +
    interestCost +
    deathLoss +
    config.spring_misc_per_head;

  // Total investment per head
  const totalInvestment = purchaseCost + carryingCosts;

  // Gross revenue per head (sale weight x mid price per cwt)
  const grossRevenue = config.spring_sale_weight_lbs * (config.market_price_850lb / 100);

  // Net income per head
  const netIncome = grossRevenue - totalInvestment;

  // Cost of gain (division-by-zero guard)
  const costOfGain = weightGain > 0 ? carryingCosts / weightGain : 0;

  return {
    purchaseCost,
    weightGain,
    daysOnFeed,
    interestCost,
    deathLoss,
    carryingCosts,
    totalInvestment,
    grossRevenue,
    netIncome,
    costOfGain,
  };
}

// =============================================================================
// Winter turn calculation
// =============================================================================

/**
 * Calculate per-head financials for the winter turn.
 * Same base structure as spring but adds feed cost breakdown:
 *   hayPricePerLb  = hay_price_per_bale / hay_bale_weight_lbs
 *   hayConsumed    = hay_daily_intake_lbs x winter_days_on_feed
 *   hayCost        = hayConsumed x hayPricePerLb
 *   hayWaste       = hayCost x (hay_waste_pct / 100)
 *   commodityCost  = commodity_daily_intake_lbs x days x (commodity_price_per_ton / 2000)
 *   totalFeedCost  = hayCost + hayWaste + commodityCost
 *   carryingCosts  = winter ops costs + totalFeedCost
 */
export function calculateWinterTurn(config: PlanConfig): WinterTurnResult {
  // Purchase cost (same as spring — same purchase weight and price)
  const purchaseCost = config.purchase_weight_lbs * (config.market_price_500lb / 100);

  // Weight gain (winter uses winter_sale_weight_lbs)
  const weightGain = config.winter_sale_weight_lbs - config.purchase_weight_lbs;

  // Days on feed (winter)
  const daysOnFeed = config.winter_days_on_feed;

  // Interest cost
  const interestCost =
    purchaseCost * (config.interest_rate_pct / 100) * (daysOnFeed / 365);

  // Death loss (winter rate)
  const deathLoss = purchaseCost * (config.winter_death_loss_pct / 100);

  // Feed costs (winter-specific)
  const hayPricePerLb =
    config.hay_bale_weight_lbs > 0
      ? config.hay_price_per_bale / config.hay_bale_weight_lbs
      : 0;
  const hayConsumed = config.hay_daily_intake_lbs * daysOnFeed;
  const hayCost = hayConsumed * hayPricePerLb;
  const hayWaste = hayCost * (config.hay_waste_pct / 100);
  const commodityCost =
    config.commodity_daily_intake_lbs * daysOnFeed * (config.commodity_price_per_ton / 2000);
  const totalFeedCost = hayCost + hayWaste + commodityCost;

  // Sum all carrying costs (winter operations + feed)
  const carryingCosts =
    config.winter_health_cost_per_head +
    config.winter_freight_in_per_head +
    config.winter_mineral_cost_per_head +
    config.winter_lrp_premium_per_head +
    config.winter_marketing_commission_per_head +
    config.winter_freight_out_per_head +
    interestCost +
    deathLoss +
    config.winter_misc_per_head +
    totalFeedCost;

  // Total investment per head
  const totalInvestment = purchaseCost + carryingCosts;

  // Gross revenue per head (winter sale weight x mid price per cwt)
  const grossRevenue = config.winter_sale_weight_lbs * (config.market_price_850lb / 100);

  // Net income per head
  const netIncome = grossRevenue - totalInvestment;

  // Cost of gain (division-by-zero guard)
  const costOfGain = weightGain > 0 ? carryingCosts / weightGain : 0;

  return {
    purchaseCost,
    weightGain,
    daysOnFeed,
    interestCost,
    deathLoss,
    carryingCosts,
    totalInvestment,
    grossRevenue,
    netIncome,
    costOfGain,
    // Winter-specific feed breakdown
    hayPricePerLb,
    hayConsumed,
    hayCost,
    hayWaste,
    commodityCost,
    totalFeedCost,
  };
}

// =============================================================================
// Annual projections
// =============================================================================

/**
 * Combine spring and winter per-head results into annual totals.
 * Multiplies per-head values by head_count for herd-level numbers.
 * Tracks LOC utilization against the configured line of credit.
 */
export function calculateAnnualProjections(
  spring: TurnResult,
  winter: WinterTurnResult,
  config: PlanConfig
): AnnualProjection {
  const headCount = config.head_count;

  // Total net income (spring + winter) x head count
  const springTotal = spring.netIncome * headCount;
  const winterTotal = winter.netIncome * headCount;
  const annualNetIncome = springTotal + winterTotal;

  // Total revenue
  const totalRevenue =
    spring.grossRevenue * headCount + winter.grossRevenue * headCount;

  // Total investment
  const totalInvestment =
    spring.totalInvestment * headCount + winter.totalInvestment * headCount;

  // LOC utilization (percentage of line of credit used)
  const locUtilization =
    config.loc_amount > 0 ? (totalInvestment / config.loc_amount) * 100 : 0;
  const locCapacityRemaining = config.loc_amount - totalInvestment;

  return {
    springTotal,
    winterTotal,
    annualNetIncome,
    totalRevenue,
    totalInvestment,
    locUtilization,
    locCapacityRemaining,
  };
}

// =============================================================================
// Breakeven calculations
// =============================================================================

/**
 * Calculate breakeven sale price per cwt for a turn.
 * Breakeven is the price at which netIncome = 0:
 *   breakeven_per_cwt = (totalInvestment / saleWeightLbs) * 100
 *
 * Division-by-zero guard: returns 0 if saleWeight is 0.
 */
export function calculateBreakeven(
  totalInvestment: number,
  saleWeightLbs: number
): number {
  return saleWeightLbs > 0 ? (totalInvestment / saleWeightLbs) * 100 : 0;
}

/**
 * Get breakeven sale prices for both spring and winter turns.
 * Returns per-cwt prices that would yield zero net income.
 */
export function getBreakevenPrices(
  spring: TurnResult,
  winter: WinterTurnResult,
  config: PlanConfig
): { springBreakeven: number; winterBreakeven: number } {
  return {
    springBreakeven: calculateBreakeven(
      spring.totalInvestment,
      config.spring_sale_weight_lbs
    ),
    winterBreakeven: calculateBreakeven(
      winter.totalInvestment,
      config.winter_sale_weight_lbs
    ),
  };
}

// =============================================================================
// Scenario analysis
// =============================================================================

/**
 * Calculate turn results at a specific sale price.
 * Creates modified config with custom sale price, then runs calculations.
 */
function calculateTurnAtPrice(
  config: PlanConfig,
  salePriceCwt: number,
  turnType: 'spring' | 'winter'
): TurnResult | WinterTurnResult {
  // Create modified config with custom sale price
  const modifiedConfig = {
    ...config,
    market_price_850lb: salePriceCwt, // Override mid price with scenario price
  };

  return turnType === 'spring'
    ? calculateSpringTurn(modifiedConfig)
    : calculateWinterTurn(modifiedConfig);
}

/**
 * Calculate financial projections across low/mid/high price scenarios.
 */
export function calculateScenarios(config: PlanConfig): ScenarioAnalysis {
  const headCount = config.head_count;

  // Low scenario
  const springLow = calculateTurnAtPrice(config, config.sale_price_low_per_cwt, 'spring') as TurnResult;
  const winterLow = calculateTurnAtPrice(config, config.sale_price_low_per_cwt, 'winter') as WinterTurnResult;
  const lowAnnual = (springLow.netIncome * headCount) + (winterLow.netIncome * headCount);

  // Mid scenario (base case — uses market_price_850lb)
  const springMid = calculateSpringTurn(config);
  const winterMid = calculateWinterTurn(config);
  const midAnnual = (springMid.netIncome * headCount) + (winterMid.netIncome * headCount);

  // High scenario
  const springHigh = calculateTurnAtPrice(config, config.sale_price_high_per_cwt, 'spring') as TurnResult;
  const winterHigh = calculateTurnAtPrice(config, config.sale_price_high_per_cwt, 'winter') as WinterTurnResult;
  const highAnnual = (springHigh.netIncome * headCount) + (winterHigh.netIncome * headCount);

  return {
    low: {
      scenario: 'low',
      salePriceCwt: config.sale_price_low_per_cwt,
      springNet: springLow.netIncome,
      winterNet: winterLow.netIncome,
      annualNet: lowAnnual,
    },
    mid: {
      scenario: 'mid',
      salePriceCwt: config.market_price_850lb,
      springNet: springMid.netIncome,
      winterNet: winterMid.netIncome,
      annualNet: midAnnual,
    },
    high: {
      scenario: 'high',
      salePriceCwt: config.sale_price_high_per_cwt,
      springNet: springHigh.netIncome,
      winterNet: winterHigh.netIncome,
      annualNet: highAnnual,
    },
  };
}

// =============================================================================
// Hay price sensitivity
// =============================================================================

/**
 * Calculate hay price sensitivity for winter turn.
 * Shows how winter profitability changes across hay price range.
 * Default range: $40 to $80 per bale in $10 increments (from project.md).
 */
export function calculateHaySensitivity(
  config: PlanConfig,
  minPrice: number = 40,
  maxPrice: number = 80,
  increment: number = 10
): HaySensitivityTable {
  const results: HaySensitivityTable = [];
  const headCount = config.head_count;

  for (let hayPrice = minPrice; hayPrice <= maxPrice; hayPrice += increment) {
    // Create modified config with custom hay price
    const modifiedConfig = {
      ...config,
      hay_price_per_bale: hayPrice,
    };

    // Recalculate winter turn with modified hay price
    const winterResult = calculateWinterTurn(modifiedConfig);

    results.push({
      hayPricePerBale: hayPrice,
      totalFeedCost: winterResult.totalFeedCost,
      winterNetPerHead: winterResult.netIncome,
      winterNetTotal: winterResult.netIncome * headCount,
    });
  }

  return results;
}
