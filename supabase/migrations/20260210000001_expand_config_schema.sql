-- Expand plan_config schema for detailed financial calculations
-- Adds operator info, sale scenarios, spring/winter turn operations, and winter feed details
-- Phase 5 Plan 01: Schema Migration & Config API Updates

-- =============================================================================
-- Add new columns to plan_config table
-- Organized by category for clarity
-- =============================================================================

ALTER TABLE plan_config

  -- -------------------------------------------------------------------------
  -- Operator Info (4 fields)
  -- -------------------------------------------------------------------------
  ADD COLUMN operator_name text DEFAULT 'Jason Pierce',
  ADD COLUMN operation_location text DEFAULT 'SE Kansas',
  ADD COLUMN acres integer DEFAULT 160,
  ADD COLUMN years_experience integer DEFAULT 20,

  -- -------------------------------------------------------------------------
  -- Sale Scenarios (2 fields)
  -- Keep existing market_price_500lb and market_price_850lb as base/mid prices
  -- -------------------------------------------------------------------------
  ADD COLUMN sale_price_low_per_cwt numeric NOT NULL DEFAULT 305.00,
  ADD COLUMN sale_price_high_per_cwt numeric NOT NULL DEFAULT 340.00,

  -- -------------------------------------------------------------------------
  -- Spring Turn Operations (10 fields)
  -- -------------------------------------------------------------------------
  ADD COLUMN spring_sale_weight_lbs integer NOT NULL DEFAULT 775,
  ADD COLUMN spring_days_on_feed integer NOT NULL DEFAULT 150,
  ADD COLUMN spring_health_cost_per_head numeric NOT NULL DEFAULT 30.00,
  ADD COLUMN spring_freight_in_per_head numeric NOT NULL DEFAULT 10.00,
  ADD COLUMN spring_mineral_cost_per_head numeric NOT NULL DEFAULT 18.00,
  ADD COLUMN spring_lrp_premium_per_head numeric NOT NULL DEFAULT 20.00,
  ADD COLUMN spring_marketing_commission_per_head numeric NOT NULL DEFAULT 50.00,
  ADD COLUMN spring_freight_out_per_head numeric NOT NULL DEFAULT 10.00,
  ADD COLUMN spring_death_loss_pct numeric NOT NULL DEFAULT 1.50,
  ADD COLUMN spring_misc_per_head numeric NOT NULL DEFAULT 15.00,

  -- -------------------------------------------------------------------------
  -- Winter Turn Operations (10 fields)
  -- -------------------------------------------------------------------------
  ADD COLUMN winter_sale_weight_lbs integer NOT NULL DEFAULT 730,
  ADD COLUMN winter_days_on_feed integer NOT NULL DEFAULT 165,
  ADD COLUMN winter_health_cost_per_head numeric NOT NULL DEFAULT 30.00,
  ADD COLUMN winter_freight_in_per_head numeric NOT NULL DEFAULT 10.00,
  ADD COLUMN winter_mineral_cost_per_head numeric NOT NULL DEFAULT 20.00,
  ADD COLUMN winter_lrp_premium_per_head numeric NOT NULL DEFAULT 20.00,
  ADD COLUMN winter_marketing_commission_per_head numeric NOT NULL DEFAULT 50.00,
  ADD COLUMN winter_freight_out_per_head numeric NOT NULL DEFAULT 10.00,
  ADD COLUMN winter_death_loss_pct numeric NOT NULL DEFAULT 2.00,
  ADD COLUMN winter_misc_per_head numeric NOT NULL DEFAULT 25.00,

  -- -------------------------------------------------------------------------
  -- Winter Feed Details (6 fields)
  -- -------------------------------------------------------------------------
  ADD COLUMN hay_price_per_bale numeric NOT NULL DEFAULT 50.00,
  ADD COLUMN hay_bale_weight_lbs integer NOT NULL DEFAULT 1200,
  ADD COLUMN hay_daily_intake_lbs numeric NOT NULL DEFAULT 13.0,
  ADD COLUMN hay_waste_pct numeric NOT NULL DEFAULT 15.00,
  ADD COLUMN commodity_price_per_ton numeric NOT NULL DEFAULT 285.00,
  ADD COLUMN commodity_daily_intake_lbs numeric NOT NULL DEFAULT 6.0;

-- =============================================================================
-- Update existing singleton row with values from project.md seed data
-- DEFAULT values handle INSERT for new rows, but this UPDATE ensures
-- the existing row gets populated correctly
-- =============================================================================

UPDATE plan_config SET
  -- Operator Info
  operator_name = 'Jason Pierce',
  operation_location = 'SE Kansas',
  acres = 160,
  years_experience = 20,

  -- Sale Scenarios
  sale_price_low_per_cwt = 305.00,
  sale_price_high_per_cwt = 340.00,

  -- Spring Turn Operations
  spring_sale_weight_lbs = 775,
  spring_days_on_feed = 150,
  spring_health_cost_per_head = 30.00,
  spring_freight_in_per_head = 10.00,
  spring_mineral_cost_per_head = 18.00,
  spring_lrp_premium_per_head = 20.00,
  spring_marketing_commission_per_head = 50.00,
  spring_freight_out_per_head = 10.00,
  spring_death_loss_pct = 1.50,
  spring_misc_per_head = 15.00,

  -- Winter Turn Operations
  winter_sale_weight_lbs = 730,
  winter_days_on_feed = 165,
  winter_health_cost_per_head = 30.00,
  winter_freight_in_per_head = 10.00,
  winter_mineral_cost_per_head = 20.00,
  winter_lrp_premium_per_head = 20.00,
  winter_marketing_commission_per_head = 50.00,
  winter_freight_out_per_head = 10.00,
  winter_death_loss_pct = 2.00,
  winter_misc_per_head = 25.00,

  -- Winter Feed Details
  hay_price_per_bale = 50.00,
  hay_bale_weight_lbs = 1200,
  hay_daily_intake_lbs = 13.0,
  hay_waste_pct = 15.00,
  commodity_price_per_ton = 285.00,
  commodity_daily_intake_lbs = 6.0
WHERE id = (SELECT id FROM plan_config LIMIT 1);
