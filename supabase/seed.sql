-- Seed data for development and testing
-- Creates realistic operational/financial data for Pierce Land & Cattle

-- =============================================================================
-- plan_config: Single row with shared operational data
-- =============================================================================

INSERT INTO plan_config (
  market_price_500lb,
  market_price_850lb,
  hay_price_per_ton,
  feed_cost_per_day,
  purchase_weight_lbs,
  sale_weight_lbs,
  avg_daily_gain_lbs,
  mortality_rate_pct,
  interest_rate_pct,
  loc_amount,
  head_count
) VALUES (
  280.00,   -- $280 per cwt for 500lb calves
  235.00,   -- $235 per cwt for 850lb feeder cattle
  130.00,   -- $130 per ton for hay
  3.50,     -- $3.50 per day feed cost per head
  500,      -- Purchase weight: 500 lbs
  850,      -- Sale weight: 850 lbs
  2.5,      -- Average daily gain: 2.5 lbs per day
  1.5,      -- Mortality rate: 1.5%
  7.5,      -- Interest rate: 7.5%
  500000,   -- Default line of credit: $500,000
  200       -- Default head count: 200 head
);

-- =============================================================================
-- plan_versions: Sample banks for development/testing
-- =============================================================================

-- Cameron State Bank: Uses all defaults from plan_config
INSERT INTO plan_versions (
  slug,
  bank_name,
  is_active,
  override_loc_amount,
  override_interest_rate_pct,
  override_head_count
) VALUES (
  'cameron',
  'Cameron State Bank',
  true,
  NULL,  -- Use default LOC from plan_config
  NULL,  -- Use default interest rate from plan_config
  NULL   -- Use default head count from plan_config
);

-- First National Bank: Custom LOC amount
INSERT INTO plan_versions (
  slug,
  bank_name,
  is_active,
  override_loc_amount,
  override_interest_rate_pct,
  override_head_count
) VALUES (
  'first-national',
  'First National Bank',
  true,
  750000,  -- Custom LOC: $750,000
  NULL,    -- Use default interest rate from plan_config
  NULL     -- Use default head count from plan_config
);

-- Community Bank: Inactive for testing
INSERT INTO plan_versions (
  slug,
  bank_name,
  is_active,
  override_loc_amount,
  override_interest_rate_pct,
  override_head_count
) VALUES (
  'community-bank',
  'Community Bank of Texas',
  false,  -- Inactive
  600000, -- Custom LOC: $600,000
  6.75,   -- Custom interest rate: 6.75%
  250     -- Custom head count: 250 head
);
