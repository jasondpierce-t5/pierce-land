/**
 * Core calculation engine for Pierce Land & Cattle business plans.
 *
 * All functions are pure (no mutations, no side effects).
 * All financial values are per-head unless explicitly noted.
 * Prices labeled "per cwt" are per 100 lbs — divide by 100 for per-lb rate.
 * No rounding at calculation level — consumers decide display precision.
 *
 * Sell/buy marketing model: after each turn, operator keeps margin_pct% of
 * gross revenue and reinvests the rest into lighter replacement cattle.
 * Winter head count is derived from spring sell/buy proceeds.
 */

import type {
  PlanConfig,
  PlanVersion,
  TurnResult,
  SellBuyResult,
  AnnualProjection,
  ScenarioAnalysis,
  HaySensitivityTable,
  PurchaseSensitivityTable,
  WorstCaseScenario,
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
 * Includes feed cost breakdown (hay + commodity) using shared pricing
 * with spring-specific daily intake rates.
 */
export function calculateSpringTurn(config: PlanConfig): TurnResult {
  const purchaseCost = config.purchase_weight_lbs * (config.market_price_500lb / 100);
  const weightGain = config.spring_sale_weight_lbs - config.purchase_weight_lbs;
  const daysOnFeed = config.spring_days_on_feed;

  const interestCost =
    purchaseCost * (config.interest_rate_pct / 100) * (daysOnFeed / 365);
  const deathLoss = purchaseCost * (config.spring_death_loss_pct / 100);

  // Feed costs (shared prices, spring-specific intake rates)
  const hayPricePerLb =
    config.hay_bale_weight_lbs > 0
      ? config.hay_price_per_bale / config.hay_bale_weight_lbs
      : 0;
  const hayConsumed = config.spring_hay_daily_intake_lbs * daysOnFeed;
  const hayCost = hayConsumed * hayPricePerLb;
  const hayWaste = hayCost * (config.hay_waste_pct / 100);
  const commodityCost =
    config.spring_commodity_daily_intake_lbs * daysOnFeed * (config.commodity_price_per_ton / 2000);
  const totalFeedCost = hayCost + hayWaste + commodityCost;

  const carryingCosts =
    config.spring_health_cost_per_head +
    config.spring_freight_in_per_head +
    config.spring_mineral_cost_per_head +
    config.spring_lrp_premium_per_head +
    config.spring_marketing_commission_per_head +
    config.spring_freight_out_per_head +
    interestCost +
    deathLoss +
    config.spring_misc_per_head +
    totalFeedCost;

  const totalInvestment = purchaseCost + carryingCosts;
  const grossRevenue = config.spring_sale_weight_lbs * (config.market_price_850lb / 100);
  const netIncome = grossRevenue - totalInvestment;
  const costOfGain = weightGain > 0 ? carryingCosts / weightGain : 0;

  return {
    purchaseCost, weightGain, daysOnFeed, interestCost, deathLoss,
    carryingCosts, totalInvestment, grossRevenue, netIncome, costOfGain,
    hayPricePerLb, hayConsumed, hayCost, hayWaste, commodityCost, totalFeedCost,
  };
}

// =============================================================================
// Winter turn calculation
// =============================================================================

/**
 * Calculate per-head financials for the winter turn.
 * Uses shared hay/commodity pricing with winter-specific intake rates.
 */
export function calculateWinterTurn(config: PlanConfig): TurnResult {
  const purchaseCost = config.purchase_weight_lbs * (config.market_price_500lb / 100);
  const weightGain = config.winter_sale_weight_lbs - config.purchase_weight_lbs;
  const daysOnFeed = config.winter_days_on_feed;

  const interestCost =
    purchaseCost * (config.interest_rate_pct / 100) * (daysOnFeed / 365);
  const deathLoss = purchaseCost * (config.winter_death_loss_pct / 100);

  // Feed costs (shared prices, winter-specific intake rates)
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

  const totalInvestment = purchaseCost + carryingCosts;
  const grossRevenue = config.winter_sale_weight_lbs * (config.market_price_850lb / 100);
  const netIncome = grossRevenue - totalInvestment;
  const costOfGain = weightGain > 0 ? carryingCosts / weightGain : 0;

  return {
    purchaseCost, weightGain, daysOnFeed, interestCost, deathLoss,
    carryingCosts, totalInvestment, grossRevenue, netIncome, costOfGain,
    hayPricePerLb, hayConsumed, hayCost, hayWaste, commodityCost, totalFeedCost,
  };
}

// =============================================================================
// Sell/buy marketing
// =============================================================================

/**
 * Calculate sell/buy marketing cycle after a turn completes.
 * Operator keeps margin_pct% as protected margin and reinvests the rest
 * into lighter replacement cattle at the current purchase price.
 */
export function calculateSellBuy(
  turnResult: TurnResult,
  headCount: number,
  config: PlanConfig
): SellBuyResult {
  const totalGrossRevenue = turnResult.grossRevenue * headCount;
  const marginPct = config.sell_buy_margin_pct / 100;
  const protectedMargin = totalGrossRevenue * marginPct;
  const reinvestmentPool = totalGrossRevenue - protectedMargin;
  const purchaseCostPerHead =
    config.purchase_weight_lbs * (config.market_price_500lb / 100);
  const nextHeadCount = purchaseCostPerHead > 0
    ? Math.floor(reinvestmentPool / purchaseCostPerHead)
    : 0;

  return {
    headCount,
    totalGrossRevenue,
    protectedMargin,
    reinvestmentPool,
    purchaseCostPerHead,
    nextHeadCount,
  };
}

// =============================================================================
// Annual projections (sequential sell/buy model)
// =============================================================================

/**
 * Combine spring and winter turns with sell/buy marketing.
 * Spring uses config head_count (funded by LOC).
 * Winter head count is derived from spring sell/buy proceeds.
 * LOC only funds the initial spring purchase.
 */
export function calculateAnnualProjections(
  spring: TurnResult,
  winter: TurnResult,
  config: PlanConfig
): AnnualProjection {
  // Spring turn uses config head_count (funded by LOC)
  const springHeadCount = config.head_count;
  const springTotal = spring.netIncome * springHeadCount;

  // Sell/buy after spring → derives winter head count
  const springSellBuy = calculateSellBuy(spring, springHeadCount, config);
  const winterHeadCount = springSellBuy.nextHeadCount;

  // Winter turn uses derived head count
  const winterTotal = winter.netIncome * winterHeadCount;

  // Sell/buy after winter → shows next-year potential
  const winterSellBuy = calculateSellBuy(winter, winterHeadCount, config);

  // Annual totals
  const annualNetIncome = springTotal + winterTotal;
  const totalRevenue =
    spring.grossRevenue * springHeadCount + winter.grossRevenue * winterHeadCount;
  const totalProtectedMargin =
    springSellBuy.protectedMargin + winterSellBuy.protectedMargin;

  // LOC funds ONLY the initial spring purchase (sell/buy self-funds winter)
  const totalInvestment = spring.totalInvestment * springHeadCount;
  const locUtilization =
    config.loc_amount > 0 ? (totalInvestment / config.loc_amount) * 100 : 0;
  const locCapacityRemaining = config.loc_amount - totalInvestment;

  return {
    springHeadCount,
    springTotal,
    springSellBuy,
    winterHeadCount,
    winterTotal,
    winterSellBuy,
    annualNetIncome,
    totalRevenue,
    totalProtectedMargin,
    totalInvestment,
    locUtilization,
    locCapacityRemaining,
  };
}

// =============================================================================
// Breakeven calculations
// =============================================================================

export function calculateBreakeven(
  totalInvestment: number,
  saleWeightLbs: number
): number {
  return saleWeightLbs > 0 ? (totalInvestment / saleWeightLbs) * 100 : 0;
}

export function getBreakevenPrices(
  spring: TurnResult,
  winter: TurnResult,
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
// Scenario analysis (with sell/buy derived head counts)
// =============================================================================

/**
 * Calculate financial projections across low/mid/high price scenarios.
 * Each scenario derives its own winter head count via sell/buy.
 */
export function calculateScenarios(config: PlanConfig): ScenarioAnalysis {
  function runScenario(
    salePriceCwt: number,
    label: 'low' | 'mid' | 'high'
  ): import('./types').ScenarioResult {
    const modifiedConfig = { ...config, market_price_850lb: salePriceCwt };

    const springResult = calculateSpringTurn(modifiedConfig);
    const winterResult = calculateWinterTurn(modifiedConfig);

    const springHeadCount = config.head_count;
    const springSellBuy = calculateSellBuy(springResult, springHeadCount, modifiedConfig);
    const winterHeadCount = springSellBuy.nextHeadCount;

    const annualNet =
      (springResult.netIncome * springHeadCount) +
      (winterResult.netIncome * winterHeadCount);

    const winterSellBuy = calculateSellBuy(winterResult, winterHeadCount, modifiedConfig);
    const totalProtectedMargin =
      springSellBuy.protectedMargin + winterSellBuy.protectedMargin;

    return {
      scenario: label,
      salePriceCwt,
      springNet: springResult.netIncome,
      winterNet: winterResult.netIncome,
      springHeadCount,
      winterHeadCount,
      annualNet,
      totalProtectedMargin,
    };
  }

  return {
    low: runScenario(config.sale_price_low_per_cwt, 'low'),
    mid: runScenario(config.market_price_850lb, 'mid'),
    high: runScenario(config.sale_price_high_per_cwt, 'high'),
  };
}

// =============================================================================
// Hay price sensitivity
// =============================================================================

/**
 * Calculate hay price sensitivity for winter turn.
 * Uses sell/buy-derived winter head count for totals.
 */
export function calculateHaySensitivity(
  config: PlanConfig,
  minPrice: number = 40,
  maxPrice: number = 80,
  increment: number = 10
): HaySensitivityTable {
  const results: HaySensitivityTable = [];
  const springHeadCount = config.head_count;

  for (let hayPrice = minPrice; hayPrice <= maxPrice; hayPrice += increment) {
    const modifiedConfig = { ...config, hay_price_per_bale: hayPrice };

    // Hay price affects spring feed too, but spring sell/buy determines winter head count
    const springResult = calculateSpringTurn(modifiedConfig);
    const springSellBuy = calculateSellBuy(springResult, springHeadCount, modifiedConfig);
    const winterHeadCount = springSellBuy.nextHeadCount;

    const winterResult = calculateWinterTurn(modifiedConfig);

    results.push({
      hayPricePerBale: hayPrice,
      totalFeedCost: winterResult.totalFeedCost,
      winterNetPerHead: winterResult.netIncome,
      winterNetTotal: winterResult.netIncome * winterHeadCount,
    });
  }

  return results;
}

// =============================================================================
// Purchase price sensitivity
// =============================================================================

/**
 * Calculate purchase price sensitivity for both turns.
 * Uses sell/buy-derived winter head count for annual totals.
 */
export function calculatePurchaseSensitivity(
  config: PlanConfig,
  rangePerLb: number = 0.20,
  incrementPerLb: number = 0.10
): PurchaseSensitivityTable {
  const results: PurchaseSensitivityTable = [];
  const springHeadCount = config.head_count;
  const basePriceCwt = config.market_price_500lb;

  const rangeCwt = rangePerLb * 100;
  const incrementCwt = incrementPerLb * 100;
  const minPrice = basePriceCwt - rangeCwt;
  const maxPrice = basePriceCwt + rangeCwt;

  for (let purchasePrice = minPrice; purchasePrice <= maxPrice; purchasePrice += incrementCwt) {
    const modifiedConfig = { ...config, market_price_500lb: purchasePrice };

    const springResult = calculateSpringTurn(modifiedConfig);
    const winterResult = calculateWinterTurn(modifiedConfig);

    // Derive winter head count via sell/buy
    const springSellBuy = calculateSellBuy(springResult, springHeadCount, modifiedConfig);
    const winterHeadCount = springSellBuy.nextHeadCount;

    const annualNet =
      (springResult.netIncome * springHeadCount) +
      (winterResult.netIncome * winterHeadCount);

    results.push({
      purchasePriceCwt: purchasePrice,
      springNetPerHead: springResult.netIncome,
      winterNetPerHead: winterResult.netIncome,
      annualNetTotal: annualNet,
    });
  }

  return results;
}

// =============================================================================
// Worst-case scenario
// =============================================================================

/**
 * Calculate worst-case scenario: highest purchase price + lowest sale price.
 * Uses sell/buy-derived winter head count.
 */
export function calculateWorstCase(config: PlanConfig): WorstCaseScenario {
  const springHeadCount = config.head_count;

  const worstConfig = {
    ...config,
    market_price_500lb: config.market_price_500lb + 20,
    market_price_850lb: config.sale_price_low_per_cwt,
  };

  const springWorst = calculateSpringTurn(worstConfig);
  const winterWorst = calculateWinterTurn(worstConfig);

  const springSellBuy = calculateSellBuy(springWorst, springHeadCount, worstConfig);
  const winterHeadCount = springSellBuy.nextHeadCount;

  const annualNet =
    (springWorst.netIncome * springHeadCount) +
    (winterWorst.netIncome * winterHeadCount);

  return {
    purchasePriceCwt: worstConfig.market_price_500lb,
    salePriceCwt: worstConfig.market_price_850lb,
    springNet: springWorst.netIncome,
    winterNet: winterWorst.netIncome,
    annualNet,
    description: 'Highest purchase price (+$0.20/lb) with lowest sale price scenario',
  };
}
