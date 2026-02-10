-- Initial schema migration
-- Creates plan_config (shared operational/financial data) and plan_versions (bank-specific overrides)

-- =============================================================================
-- plan_config table: Single source of truth for shared operational data
-- =============================================================================

CREATE TABLE plan_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Market prices (per cwt basis)
  market_price_500lb numeric NOT NULL,
  market_price_850lb numeric NOT NULL,

  -- Feed costs
  hay_price_per_ton numeric NOT NULL,
  feed_cost_per_day numeric NOT NULL,

  -- Operational parameters
  purchase_weight_lbs integer NOT NULL,
  sale_weight_lbs integer NOT NULL,
  avg_daily_gain_lbs numeric NOT NULL,
  mortality_rate_pct numeric NOT NULL,

  -- Financial defaults
  interest_rate_pct numeric NOT NULL,
  loc_amount numeric NOT NULL,
  head_count integer NOT NULL
);

-- Enforce singleton pattern: only one row allowed in plan_config
CREATE UNIQUE INDEX plan_config_singleton ON plan_config ((1));

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_plan_config_updated_at
  BEFORE UPDATE ON plan_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- plan_versions table: Bank-specific plans with optional overrides
-- =============================================================================

CREATE TABLE plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Bank identification
  slug text UNIQUE NOT NULL,  -- URL identifier (e.g., 'cameron', 'first-national')
  bank_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,

  -- Optional overrides (null = use value from plan_config)
  override_loc_amount numeric,
  override_interest_rate_pct numeric,
  override_head_count integer
);

-- Index on slug for fast lookups
CREATE INDEX plan_versions_slug_idx ON plan_versions (slug);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_plan_versions_updated_at
  BEFORE UPDATE ON plan_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
