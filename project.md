# Pierce Land & Cattle — Dynamic Business Plan Web App
## Claude Code Implementation Plan

## Overview

Build a web application hosted at **piercelandandcattle.com** with two pages:

1. **Public Business Plan** (`/plan/[slug]`) — A polished, print-ready stocker heifer business plan with live charts and financials. Each bank gets a unique URL (e.g., `/plan/cameron`, `/plan/first-national`).
2. **Admin Dashboard** (`/admin`) — Password-protected page to adjust shared operational/financial inputs and manage bank-specific plan versions. Changes recalculate all financials and update every plan instantly.

---

## Tech Stack

| Component | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (single config table) |
| Styling | Tailwind CSS |
| Charts | Chart.js via react-chartjs-2 |
| Auth (admin) | Simple password gate (env variable) — no user accounts needed |
| Hosting | Vercel (connected to piercelandandcattle.com) |
| PDF Export | Browser print-to-PDF (built-in print styles) |

---

## Database Schema — Supabase

Two tables: `plan_config` for the financial/operational parameters shared across all plans, and `plan_versions` for bank-specific presentation details. This way you update market numbers once and every plan reflects the change, but each bank gets their own personalized cover page and unique shareable link.

```sql
-- Shared operational & financial parameters (single row)
CREATE TABLE plan_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Operator Info
  operator_name TEXT DEFAULT 'Jason Pierce',
  operation_location TEXT DEFAULT 'SE Kansas',
  acres INTEGER DEFAULT 160,
  years_experience INTEGER DEFAULT 20,
  
  -- Purchase Parameters
  head_count INTEGER DEFAULT 45,
  purchase_weight INTEGER DEFAULT 400,
  purchase_price_per_lb NUMERIC(5,2) DEFAULT 3.90,
  
  -- Sale Parameters
  sale_price_low NUMERIC(5,2) DEFAULT 3.05,
  sale_price_mid NUMERIC(5,2) DEFAULT 3.20,
  sale_price_high NUMERIC(5,2) DEFAULT 3.40,
  
  -- Spring Turn
  spring_sale_weight INTEGER DEFAULT 775,
  spring_adg NUMERIC(3,1) DEFAULT 2.4,
  spring_days_on_feed INTEGER DEFAULT 150,
  spring_health_cost NUMERIC(6,2) DEFAULT 30.00,
  spring_freight_per_head NUMERIC(6,2) DEFAULT 10.00,
  spring_mineral_cost NUMERIC(6,2) DEFAULT 18.00,
  spring_lrp_premium NUMERIC(6,2) DEFAULT 20.00,
  spring_marketing_commission NUMERIC(6,2) DEFAULT 50.00,
  spring_freight_out NUMERIC(6,2) DEFAULT 10.00,
  spring_death_loss_pct NUMERIC(4,2) DEFAULT 1.50,
  spring_misc NUMERIC(6,2) DEFAULT 15.00,
  
  -- Winter Turn
  winter_sale_weight INTEGER DEFAULT 730,
  winter_adg NUMERIC(3,1) DEFAULT 2.0,
  winter_days_on_feed INTEGER DEFAULT 165,
  winter_health_cost NUMERIC(6,2) DEFAULT 30.00,
  winter_freight_per_head NUMERIC(6,2) DEFAULT 10.00,
  winter_mineral_cost NUMERIC(6,2) DEFAULT 20.00,
  winter_lrp_premium NUMERIC(6,2) DEFAULT 20.00,
  winter_marketing_commission NUMERIC(6,2) DEFAULT 50.00,
  winter_freight_out NUMERIC(6,2) DEFAULT 10.00,
  winter_death_loss_pct NUMERIC(4,2) DEFAULT 2.00,
  winter_misc NUMERIC(6,2) DEFAULT 25.00,
  
  -- Winter Feed
  hay_price_per_bale NUMERIC(6,2) DEFAULT 50.00,
  hay_bale_weight INTEGER DEFAULT 1200,
  hay_daily_intake_lbs NUMERIC(4,1) DEFAULT 13.0,
  hay_waste_pct NUMERIC(4,2) DEFAULT 15.00,
  commodity_price_per_ton NUMERIC(7,2) DEFAULT 285.00,
  commodity_daily_intake_lbs NUMERIC(4,1) DEFAULT 6.0,
  
  -- Loan Parameters (defaults — can be overridden per bank)
  loc_amount NUMERIC(10,2) DEFAULT 85000.00,
  interest_rate NUMERIC(4,2) DEFAULT 8.50,
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO plan_config DEFAULT VALUES;

-- Bank-specific plan versions
CREATE TABLE plan_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,              -- URL slug: "cameron", "first-national"
  bank_name TEXT NOT NULL,                -- "Equity Bank"
  banker_name TEXT NOT NULL,              -- "Cameron Wilkins"
  banker_title TEXT,                      -- "Ag Lending Officer" (optional)
  plan_date DATE DEFAULT CURRENT_DATE,
  
  -- Bank-specific overrides (NULL = use plan_config defaults)
  loc_amount_override NUMERIC(10,2),
  interest_rate_override NUMERIC(4,2),
  head_count_override INTEGER,
  notes TEXT,                             -- Internal notes (not shown on plan)
  
  is_active BOOLEAN DEFAULT true,         -- Deactivate without deleting
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Example starter rows
INSERT INTO plan_versions (slug, bank_name, banker_name) VALUES
  ('cameron', 'Equity Bank', 'Cameron Wilkins');

-- RLS policies
ALTER TABLE plan_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read config" ON plan_config FOR SELECT USING (true);
CREATE POLICY "Auth write config" ON plan_config FOR UPDATE USING (true);

CREATE POLICY "Public read active versions" ON plan_versions 
  FOR SELECT USING (is_active = true);
CREATE POLICY "Auth all versions" ON plan_versions FOR ALL USING (true);
```

### How It Works

- **Shared numbers:** Market prices, feed costs, weights, ADG — you update these once on the admin page and every bank's plan reflects the current numbers instantly.
- **Per-bank customization:** Each bank gets its own slug, banker name, and optional overrides for LOC amount, interest rate, or head count (in case one bank wants to see a 60-head scenario vs. 45).
- **URLs:** `piercelandandcattle.com/plan/cameron` and `piercelandandcattle.com/plan/first-national` — clean, professional, and each banker only sees their version.
- **Deactivation:** Set `is_active = false` to kill a link without deleting the record.

---

## Project Structure

```
piercelandandcattle/
├── .env.local
│   ├── NEXT_PUBLIC_SUPABASE_URL=your_url
│   ├── NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
│   └── ADMIN_PASSWORD=your_secure_password
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout — Inter font, metadata
│   │   ├── page.tsx                # Landing/redirect
│   │   ├── plan/
│   │   │   └── [slug]/
│   │   │       └── page.tsx        # Public business plan (dynamic per bank)
│   │   ├── admin/
│   │   │   └── page.tsx            # Admin dashboard (password-gated)
│   │   └── api/
│   │       ├── config/
│   │       │   └── route.ts        # GET/PUT shared config
│   │       ├── versions/
│   │       │   └── route.ts        # GET all, POST new, PUT update, DELETE
│   │       └── auth/
│   │           └── route.ts        # POST verify admin password
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client init
│   │   ├── calculations.ts         # All financial calc functions
│   │   └── types.ts                # TypeScript interfaces
│   └── components/
│       ├── plan/
│       │   ├── CoverHeader.tsx
│       │   ├── KpiRow.tsx
│       │   ├── OperationOverview.tsx
│       │   ├── OperatorBackground.tsx
│       │   ├── MarketingPlan.tsx
│       │   ├── SpringTurn.tsx
│       │   ├── WinterTurn.tsx
│       │   ├── AnnualProjections.tsx
│       │   ├── SensitivityAnalysis.tsx
│       │   ├── RiskManagement.tsx
│       │   ├── CreditStructure.tsx
│       │   ├── Appendix.tsx
│       │   └── Disclaimer.tsx
│       ├── charts/
│       │   ├── ScenarioBarChart.tsx
│       │   ├── BreakevenChart.tsx
│       │   ├── CostPieChart.tsx
│       │   ├── HaySensitivityChart.tsx
│       │   └── PurchaseSensitivityChart.tsx
│       └── admin/
│           ├── PasswordGate.tsx
│           ├── SharedConfigPanel.tsx  # Shared financial/operational inputs
│           ├── BankVersionManager.tsx # Create/edit/deactivate bank versions
│           ├── BankVersionCard.tsx    # Individual bank version with overrides
│           ├── InputSection.tsx
│           ├── NumberInput.tsx
│           └── LivePreview.tsx
```

---

## Core Calculations — `lib/calculations.ts`

All financials are derived from the config inputs. No hardcoded dollar amounts anywhere in the UI components. Every number displayed on the plan page comes from these functions.

**Override merging:** Before calculations run for a specific bank's plan, merge the shared `plan_config` with any non-null overrides from the `plan_versions` row. This produces a single effective config object that feeds into all calculation functions.

```typescript
interface PlanConfig {
  // ... all fields from the plan_config table
}

interface PlanVersion {
  slug: string;
  bank_name: string;
  banker_name: string;
  banker_title?: string;
  plan_date: string;
  loc_amount_override?: number;
  interest_rate_override?: number;
  head_count_override?: number;
  notes?: string;
  is_active: boolean;
}

// Merge overrides into shared config
function mergeConfig(config: PlanConfig, version: PlanVersion): PlanConfig {
  return {
    ...config,
    loc_amount: version.loc_amount_override ?? config.loc_amount,
    interest_rate: version.interest_rate_override ?? config.interest_rate,
    head_count: version.head_count_override ?? config.head_count,
  };
}

interface TurnResult {
  purchaseCostPerHead: number;
  totalCarryingCostPerHead: number;
  totalCostPerHead: number;
  saleRevenuePerHead: number;  // at mid price
  netMarginPerHead: number;
  totalPurchaseCost: number;
  totalCarryingCost: number;
  totalInvestment: number;
  grossRevenue: number;
  netIncome: number;
  weightGain: number;
  costOfGain: number;
  // Scenario variants
  netAtLow: number;
  netAtMid: number;
  netAtHigh: number;
}

interface WinterTurnResult extends TurnResult {
  hayCostPerHead: number;
  hayWasteCost: number;
  commodityCostPerHead: number;
  totalFeedCost: number;
}

// Functions to implement:
function calculateSpringTurn(config: PlanConfig): TurnResult
function calculateWinterTurn(config: PlanConfig): WinterTurnResult
function calculateAnnualProjections(spring: TurnResult, winter: WinterTurnResult, config: PlanConfig)
function calculateBreakeven(spring: TurnResult, winter: WinterTurnResult)
function calculateHaySensitivity(config: PlanConfig): { hayPrice: number; feedCost: number; winterNet: number; winterNetTotal: number }[]
function calculatePurchaseSensitivity(config: PlanConfig): { purchasePrice: number; springNet: number; winterNet: number; annualNet: number }[]
function calculateWorstCase(config: PlanConfig)
```

### Key Calculation Logic

**Spring Turn:**
```
purchaseCost = purchase_weight × purchase_price_per_lb
weightGain = spring_sale_weight - purchase_weight
interestCost = purchaseCost × (interest_rate / 100) × (spring_days_on_feed / 365)
deathLoss = purchaseCost × (spring_death_loss_pct / 100)
carryingCosts = health + freight_in + mineral + lrp + marketing + freight_out + interest + deathLoss + misc
totalCost = purchaseCost + carryingCosts
saleRevenue = spring_sale_weight × sale_price_mid
costOfGain = carryingCosts / weightGain
```

**Winter Turn (additional):**
```
hayPricePerLb = hay_price_per_bale / hay_bale_weight
hayCost = hay_daily_intake_lbs × winter_days_on_feed × hayPricePerLb
hayWaste = hayCost × (hay_waste_pct / 100)
commodityCost = commodity_daily_intake_lbs × winter_days_on_feed × (commodity_price_per_ton / 2000)
totalFeed = hayCost + hayWaste + commodityCost
```

**Sensitivity Tables:**
- Hay sensitivity: Loop hay price from $40 to $80 in $10 increments, recalculate winter turn each time
- Purchase sensitivity: Loop purchase price from (base - $0.20) to (base + $0.20) in $0.10 increments
- Worst case: Max purchase price + min sale price

---

## Page Details

### `/plan/[slug]` — Public Business Plan

**Data loading:** Server-side fetch from Supabase on each request. Loads both the shared `plan_config` and the matching `plan_versions` row by slug. If the version has overrides (LOC amount, interest rate, head count), those replace the shared defaults before calculations run.

**URL examples:**
- `piercelandandcattle.com/plan/cameron` → Cameron Wilkins at Equity Bank
- `piercelandandcattle.com/plan/first-national` → Different banker, potentially different LOC amount
- Invalid or inactive slugs show a clean 404

**Layout:** Matches the visual HTML artifact we already built — same color scheme, same section structure, same charts. Components map 1:1 to the sections in the existing plan. The cover header dynamically shows the bank name, banker name, and date from the version record.

**Print/PDF:** Include `@media print` styles. Add a "Download PDF" button in the top right corner that triggers `window.print()`. Hide the button in print view.

**Shareable:** Each bank gets their own clean URL. Send Cameron `piercelandandcattle.com/plan/cameron` — he sees his name, his bank, current numbers.

**Design tokens (match existing artifact):**
```
--primary: #1a3a2a
--primary-light: #2d5a3f
--accent: #c4872a
--bg: #faf9f6
--green: #3a7d53
--border: #e0ddd5
Font: Inter
```

### `/admin` — Admin Dashboard

**Password gate:** On first visit, show a simple password input. Check against `ADMIN_PASSWORD` env variable via API route. Store auth state in a cookie (httpOnly, 24hr expiry). No user accounts needed — this is a single-operator tool.

**Layout:** Two main sections stacked:

**Top section: Shared Operational & Financial Inputs**
Two-column layout — inputs on left, live preview on right.

- **Left column (60%):** Input sections grouped by category with number inputs
- **Right column (40%):** Live preview panel showing key calculated outputs that update as inputs change

**Input Sections (shared — affect all plans):**

1. **Operator Info**
   - Operator name, location, acres, years experience

2. **Purchase Parameters**
   - Head count, purchase weight, purchase price/lb

3. **Sale Parameters**
   - Sale price low, mid, high

4. **Spring Turn**
   - Sale weight, ADG, days on feed
   - Health, freight, mineral, LRP, marketing, death loss %, misc

5. **Winter Turn**
   - Sale weight, ADG, days on feed
   - Health, freight, mineral, LRP, marketing, death loss %, misc

6. **Winter Feed**
   - Hay price/bale, bale weight, daily hay intake, hay waste %
   - Commodity price/ton, daily commodity intake

7. **Loan Parameters (defaults)**
   - LOC amount, interest rate (can be overridden per bank)

**Bottom section: Bank Versions Manager**

A card-based list of all bank versions. Each card shows:
- Bank name, banker name, slug, status (active/inactive)
- Link to the live plan (`piercelandandcattle.com/plan/[slug]`)
- Override fields: LOC amount, interest rate, head count (blank = use shared defaults)
- Internal notes field (only visible here, not on the plan)
- Toggle active/inactive
- Delete button with confirmation

**"+ Add New Bank" button** at the top — opens a simple form to create a new version with bank name, banker name, and auto-generated slug.

**Live Preview Panel (right side of shared inputs):**
As inputs change, show:
- Spring net/head and total
- Winter net/head and total
- Annual net income
- Breakeven prices for each turn
- Cost of gain for each turn

**Save behavior:** Debounced auto-save (500ms after last change) with a small "Saved ✓" indicator, OR an explicit "Save Changes" button. Either works — auto-save is smoother.

**"View Plan" buttons:** Each bank version card has a "View Plan" link that opens `/plan/[slug]` in a new tab.

---

## API Routes

### `GET /api/config`
- Fetch the single row from `plan_config`
- Public (plan pages need this)

### `PUT /api/config`
- Validate admin cookie/session
- Update the `plan_config` row
- Update `updated_at` timestamp
- Return updated config

### `GET /api/versions`
- Fetch all rows from `plan_versions`
- Public GET filters to active only; admin GET returns all

### `POST /api/versions`
- Validate admin cookie
- Create a new `plan_versions` row
- Auto-generate slug from bank name (slugify, check uniqueness)
- Return new version

### `PUT /api/versions`
- Validate admin cookie
- Update a `plan_versions` row (overrides, bank info, active status)
- Return updated version

### `DELETE /api/versions`
- Validate admin cookie
- Delete a `plan_versions` row by ID

### `POST /api/auth`
- Accept `{ password: string }`
- Compare against `ADMIN_PASSWORD` env variable
- Set httpOnly cookie on success
- Return success/failure

---

## Implementation Order for Claude Code

Provide these instructions to Claude Code in sequence:

### Phase 1: Project Setup
```
Initialize a new Next.js 14 project with App Router, TypeScript, and Tailwind CSS. 
Install dependencies: @supabase/supabase-js, react-chartjs-2, chart.js. 
Set up the Supabase client in lib/supabase.ts. 
Create the types file in lib/types.ts with the PlanConfig interface matching 
the database schema. Set up .env.local with Supabase credentials and ADMIN_PASSWORD.
```

### Phase 2: Database
```
Run the SQL schema (provided above) in Supabase SQL editor to create both 
the plan_config table (shared financials) and plan_versions table 
(bank-specific versions) with defaults, starter rows, and RLS policies.
```

### Phase 3: Calculations Engine
```
Build lib/calculations.ts with all financial calculation functions. 
Every number in the business plan should be derived from config inputs — 
no hardcoded values. Include: mergeConfig (applies version overrides to 
shared config), calculateSpringTurn, calculateWinterTurn, 
calculateAnnualProjections, calculateBreakeven, calculateHaySensitivity, 
calculatePurchaseSensitivity, calculateWorstCase.

Use the formulas and logic documented in the calculations section of this plan.
```

### Phase 4: API Routes
```
Build the API routes:
- GET /api/config — fetch plan_config from Supabase
- PUT /api/config — update plan_config (require admin auth)
- GET /api/versions — fetch plan_versions (public: active only; admin: all)
- POST /api/versions — create new version (admin auth, auto-generate slug)
- PUT /api/versions — update version overrides/info (admin auth)
- DELETE /api/versions — delete version (admin auth)
- POST /api/auth — verify password, set httpOnly cookie

Include proper error handling, validation, and slug uniqueness checks.
```

### Phase 5: Plan Page Components
```
Build the /plan/[slug] dynamic page and all plan components. The page fetches 
both plan_config and the matching plan_versions row by slug, merges any 
overrides, runs calculations server-side, and passes results to components.

Match the visual design of the existing HTML artifact exactly — same colors 
(#1a3a2a primary, #c4872a accent, #3a7d53 green, #faf9f6 background), same 
section layout, same typography (Inter).

The cover header dynamically displays bank_name, banker_name, and plan_date 
from the version record. All financial figures come from merged/calculated data.

Include Chart.js charts: scenario bar chart, breakeven chart, cost pie charts, 
hay sensitivity line chart, purchase sensitivity line chart.

Include @media print styles and a "Download PDF" button that triggers window.print().
Show a clean 404 page for invalid or inactive slugs.
```

### Phase 6: Admin Page
```
Build the /admin page with:
1. PasswordGate component — simple password input, verify via /api/auth
2. Top section: Shared config editor — two-column layout with input form 
   (left 60%) and live preview (right 40%). Input sections grouped by 
   category (operator, purchase, sale, spring, winter, feed, loan defaults).
   Live preview shows key calculated outputs that update on input change.
   Save to Supabase via PUT /api/config.
3. Bottom section: Bank Versions Manager — card-based list of all bank 
   versions. Each card shows bank name, banker name, slug, active status, 
   link to live plan, override fields (LOC amount, interest rate, head count),
   internal notes, and active/inactive toggle. 
   "+ Add New Bank" button with form for bank name, banker name (auto-slug).
   Save/update/delete via /api/versions endpoints.
4. Each bank card has a "View Plan →" link opening /plan/[slug] in new tab.
```

### Phase 7: Deploy
```
Deploy to Vercel. Connect piercelandandcattle.com domain. 
Verify environment variables are set in Vercel dashboard.
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=your-secure-password
```

---

## Future Enhancements (Optional)

- **Market price auto-update:** Integrate USDA Market News API to pull recent feeder cattle prices automatically
- **PDF generation:** Server-side PDF generation with Puppeteer or similar instead of browser print
- **Photo upload:** Allow uploading property photos directly into the appendix via Supabase Storage
- **Historical tracking:** Log each config change with timestamp to track how assumptions have evolved
- **Version snapshots:** Save a frozen copy of the plan at a point in time (e.g., "what I presented to Cameron on 2/9/26") so it doesn't change if you update shared numbers later
- **Comparison view:** Side-by-side comparison of two bank versions showing where overrides differ