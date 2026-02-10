# Pierce Land & Cattle — Dynamic Business Plan App

## What This Is

A web application hosted at **piercelandandcattle.com** that generates professional, print-ready stocker heifer business plans with live financials and charts. Each bank gets a unique shareable URL with current market data. The admin dashboard allows updating shared operational/financial inputs once, and all bank-specific plans automatically reflect the changes.

## Core Value

**Professional presentation that looks polished to bankers.** Print/PDF quality is paramount - this goes to real lenders for real loans. Everything else serves this goal.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **Public plan pages** — Dynamic `/plan/[slug]` routes showing customized business plans per bank
- [ ] **Admin dashboard** — Password-protected interface to manage shared financials and bank versions
- [ ] **Shared config system** — Single source of truth for market prices, feed costs, weights, ADG, and operational parameters
- [ ] **Bank version management** — Create/edit/deactivate bank-specific plans with optional overrides (LOC amount, interest rate, head count)
- [ ] **Live calculations** — All financial projections derived from inputs (no hardcoded values)
- [ ] **Financial projections** — Spring turn, winter turn, annual projections with scenario analysis (low/mid/high prices)
- [ ] **Sensitivity analysis** — Hay price sensitivity, purchase price sensitivity, breakeven calculations
- [ ] **Visual charts** — Scenario bar charts, breakeven charts, cost pie charts, sensitivity line charts
- [ ] **Print-to-PDF** — Browser-based PDF export with clean print styles
- [ ] **Unique URLs** — Clean, shareable links per bank (e.g., `/plan/cameron`, `/plan/first-national`)
- [ ] **Professional design** — Match existing visual artifact (primary #1a3a2a, accent #c4872a, green #3a7d53, Inter font)

### Out of Scope

- **Server-side PDF generation** — Browser print-to-PDF is sufficient for v1; Puppeteer/headless can wait
- **Market price auto-update** — Manual entry for now; USDA Market News API integration deferred
- **Photo upload to appendix** — No Supabase Storage integration in v1
- **Historical tracking** — Not logging config changes over time in v1
- **Version snapshots** — No frozen "point in time" copies in v1
- **Comparison view** — No side-by-side bank version comparison in v1

## Context

**Banking relationships:** Jason operates a stocker heifer business in SE Kansas and maintains relationships with multiple lenders. Each bank needs to see current operational and financial projections to maintain credit lines and potentially fund different scenarios (varying head counts, LOC amounts).

**Market volatility:** Feeder cattle prices, hay costs, and commodity prices change frequently. Having a single admin interface to update market assumptions once and instantly propagate to all bank plans eliminates manual spreadsheet updates and version drift.

**Professional credibility:** These plans go directly to ag lending officers. Visual polish, calculation accuracy, and print quality directly impact lending decisions.

**Technical environment:** Modern web stack (Next.js 14 App Router, Supabase, Vercel) chosen for speed of development, easy updates, and reliable hosting.

## Constraints

- **Tech stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase, Chart.js, Vercel — already specified and non-negotiable
- **Database structure**: Two-table design (plan_config for shared data, plan_versions for bank-specific overrides) — schema already designed
- **Authentication**: Simple password gate (no user accounts, no OAuth) — single-operator use case
- **Domain**: Must deploy to piercelandandcattle.com
- **Design match**: Must match existing visual artifact in colors, typography, and layout
- **Calculation precision**: All dollar amounts must trace back to config inputs for auditability

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser print-to-PDF vs server-side | Simpler implementation, sufficient quality for v1, can upgrade later if needed | — Pending |
| Two-table schema (config + versions) | Shared defaults with per-bank overrides provides flexibility without duplication | — Pending |
| Simple password auth | Single operator, no team collaboration needs, reduces complexity | — Pending |
| Chart.js for visualizations | Lightweight, React-friendly, sufficient for business charts | — Pending |

---
*Last updated: 2026-02-09 after initialization*
