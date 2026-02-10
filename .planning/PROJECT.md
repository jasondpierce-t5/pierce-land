# Pierce Land & Cattle — Dynamic Business Plan App

## What This Is

A web application at **piercelandandcattle.com** that generates professional, print-ready stocker heifer business plans with live financials, charts, and sensitivity analysis. Each bank gets a unique shareable URL with current market data. The admin dashboard allows updating shared operational/financial inputs once, and all bank-specific plans automatically reflect the changes.

## Core Value

**Professional presentation that looks polished to bankers.** Print/PDF quality is paramount - this goes to real lenders for real loans. Everything else serves this goal.

## Requirements

### Validated

- Public plan pages — Dynamic `/plan/[slug]` routes showing customized business plans per bank — v1.0
- Admin dashboard — Password-protected interface to manage shared financials and bank versions — v1.0
- Shared config system — Single source of truth for market prices, feed costs, weights, ADG, and operational parameters (43 fields across 8 sections) — v1.0
- Bank version management — Create/edit/deactivate bank-specific plans with optional overrides (LOC amount, interest rate, head count) — v1.0
- Live calculations — All financial projections derived from inputs via pure TypeScript engine (no hardcoded values) — v1.0
- Financial projections — Spring turn, winter turn, annual projections with scenario analysis (low/mid/high prices) — v1.0
- Sensitivity analysis — Hay price sensitivity ($40-$80/bale), purchase price sensitivity (+/-$0.20/lb), breakeven calculations — v1.0
- Visual charts — Scenario bar charts, breakeven charts, cost doughnut charts, sensitivity line charts (Chart.js) — v1.0
- Print-to-PDF — Browser-based PDF export with clean print styles, minimal forced page breaks — v1.0
- Unique URLs — Clean, shareable links per bank (e.g., `/plan/cameron`, `/plan/first-national`) — v1.0
- Professional design — Brand colors (primary #1a3a2a, accent #c4872a, green #3a7d53), Inter font — v1.0

### Active

(None — all v1.0 requirements shipped. New requirements pending user feedback.)

### Out of Scope

- **Server-side PDF generation** — Browser print-to-PDF is sufficient for v1; Puppeteer/headless can wait
- **Market price auto-update** — Manual entry for now; USDA Market News API integration deferred
- **Photo upload to appendix** — No Supabase Storage integration in v1
- **Historical tracking** — Not logging config changes over time in v1
- **Version snapshots** — No frozen "point in time" copies in v1
- **Comparison view** — No side-by-side bank version comparison in v1
- **Mobile app** — Web-first, responsive design sufficient

## Context

**Banking relationships:** Jason operates a stocker heifer business in SE Kansas and maintains relationships with multiple lenders. Each bank needs to see current operational and financial projections to maintain credit lines and potentially fund different scenarios (varying head counts, LOC amounts).

**Market volatility:** Feeder cattle prices, hay costs, and commodity prices change frequently. Having a single admin interface to update market assumptions once and instantly propagate to all bank plans eliminates manual spreadsheet updates and version drift.

**Professional credibility:** These plans go directly to ag lending officers. Visual polish, calculation accuracy, and print quality directly impact lending decisions.

**Current state (v1.0):** Shipped 2026-02-10 with 5,070 lines of TypeScript/TSX/CSS across 41 files. Tech stack: Next.js 14, Supabase, Chart.js, Tailwind CSS, deployed to Vercel at piercelandandcattle.com. 8 phases, 16 plans executed in ~2.6 hours.

## Constraints

- **Tech stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase, Chart.js, Vercel — established
- **Database structure**: Two-table design (plan_config for shared data, plan_versions for bank-specific overrides) — deployed
- **Authentication**: Simple password gate (no user accounts, no OAuth) — single-operator use case
- **Domain**: Deployed to piercelandandcattle.com with SSL
- **Design match**: Brand colors, typography, and layout established
- **Calculation precision**: Numeric types (not float), no rounding at calculation level

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser print-to-PDF vs server-side | Simpler implementation, sufficient quality for v1, can upgrade later | Good — produces clean banker-ready PDFs |
| Two-table schema (config + versions) | Shared defaults with per-bank overrides provides flexibility without duplication | Good — enables single-update propagation |
| Simple password auth | Single operator, no team collaboration needs, reduces complexity | Good — appropriate for use case |
| Chart.js for visualizations | Lightweight, React-friendly, sufficient for business charts | Good — 5 chart types working |
| Numeric types for financials | Ensures calculation precision for dollar amounts | Good — no floating point issues |
| Pure TypeScript calc engine | No mutations, no side effects, spread operator for config merging | Good — reliable, testable |
| Direct server component data fetching | No API routes for public pages, function call from server component | Good — simpler architecture |
| Minimal forced page breaks (2 of 8) | Checkpoint feedback showed excessive whitespace with per-section breaks | Good — compact PDF output |
| Vercel deployment with CLI env vars | Build requires env vars at compile time, set before production deploy | Good — clean deployment |

---
*Last updated: 2026-02-10 after v1.0 milestone*
