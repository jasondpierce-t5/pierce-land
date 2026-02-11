-- Migration: Add spring feed intake rates and sell/buy marketing margin
-- Spring uses shared hay/commodity prices but has different daily intake amounts.
-- Sell/buy marketing: operator keeps margin_pct% of gross revenue, reinvests rest.

ALTER TABLE plan_config
  ADD COLUMN spring_hay_daily_intake_lbs numeric NOT NULL DEFAULT 8.0,
  ADD COLUMN spring_commodity_daily_intake_lbs numeric NOT NULL DEFAULT 3.0,
  ADD COLUMN sell_buy_margin_pct numeric NOT NULL DEFAULT 25.00;

-- Populate existing singleton row
UPDATE plan_config SET
  spring_hay_daily_intake_lbs = 8.0,
  spring_commodity_daily_intake_lbs = 3.0,
  sell_buy_margin_pct = 25.00
WHERE id = (SELECT id FROM plan_config LIMIT 1);
