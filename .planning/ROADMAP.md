# Roadmap: Pierce Land & Cattle

## Overview

This roadmap takes the project from initial setup through deployment of a professional business plan generator. We start with database foundation, build the admin interface for managing shared financials, add bank version management, implement the calculation engine that drives all projections, create public plan pages, add visual charts, and finish with print optimization and deployment to piercelandandcattle.com.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Database** - Project setup, Supabase schema, seed data
- [x] **Phase 2: Admin Authentication & Layout** - Password gate, dashboard structure
- [x] **Phase 3: Shared Config Management** - Market prices and operational params interface
- [x] **Phase 4: Bank Version Management** - Create/edit bank-specific plans with overrides
- [x] **Phase 5: Financial Calculations Engine** - Core calc logic, scenarios, sensitivity analysis
- [x] **Phase 6: Public Plan Pages** - Dynamic routing and plan rendering
- [x] **Phase 7: Charts & Visualizations** - Chart.js integration for all business charts
- [x] **Phase 8: Print Optimization & Deployment** - PDF styles, Vercel deployment, domain config

## Phase Details

### Phase 1: Foundation & Database
**Goal**: Next.js project initialized with Supabase connected and database schema deployed
**Depends on**: Nothing (first phase)
**Research**: Unlikely (Next.js and Supabase setup follow established patterns)
**Plans**: 2 (complete)

Plans:
- [x] **01-01**: Project Initialization (Next.js 14 + TypeScript + Tailwind + Supabase) — Complete
- [x] **01-02**: Database Schema Deployment (plan_config and plan_versions tables) — Complete

### Phase 2: Admin Authentication & Layout
**Goal**: Protected admin dashboard with navigation structure
**Depends on**: Phase 1
**Research**: Unlikely (Simple password authentication, standard layout patterns)
**Plans**: 1 (complete)

Plans:
- [x] **02-01**: Admin Authentication & Dashboard (middleware, login, layout) — Complete

### Phase 3: Shared Config Management
**Goal**: Admin interface to edit market prices, feed costs, weights, ADG, and operational parameters
**Depends on**: Phase 2
**Research**: Unlikely (CRUD operations on plan_config table, standard form handling)
**Plans**: 1 (complete)

Plans:
- [x] **03-01**: Config CRUD Interface (API routes and admin form) — Complete

### Phase 4: Bank Version Management
**Goal**: Create, edit, and deactivate bank-specific plans with optional overrides
**Depends on**: Phase 3
**Research**: Unlikely (Database operations, slug generation is standard practice)
**Plans**: 2 (complete)

Plans:
- [x] **04-01**: Bank Version API (CRUD endpoints, slug generation, validation) — Complete
- [x] **04-02**: Bank Version Admin UI (list, create, edit forms with slug auto-generation) — Complete

### Phase 5: Financial Calculations Engine
**Goal**: Complete calculation logic for all financial projections and sensitivity analysis
**Depends on**: Phase 3
**Research**: Unlikely (Internal business logic derived from requirements, no external integrations)
**Plans**: 3 (complete)

Plans:
- [x] **05-01**: Schema Migration & Config API Updates (32 new operational fields, 8-section admin form) — Complete
- [x] **05-02**: Calculation Engine Core (type definitions, mergeConfig, spring/winter turns, annual projections, breakeven) — Complete
- [x] **05-03**: Scenario & Sensitivity Analysis (scenarios, hay/purchase sensitivity, worst-case) — Complete

### Phase 6: Public Plan Pages
**Goal**: Dynamic `/plan/[slug]` routes rendering bank-specific business plans
**Depends on**: Phase 4, Phase 5
**Research**: Unlikely (Next.js App Router dynamic routing is well-documented)
**Plans**: 3

Plans:
- [x] **06-01**: Public Data Layer & Page Foundation (formatters, fetchPlanData, /plan/[slug] route, cover header, KPI row) — Complete
- [x] **06-02**: Financial Detail Sections (operation overview, spring/winter turn tables, annual projections, credit structure) — Complete
- [x] **06-03**: Analysis Sections & Verification (scenario analysis, breakeven, worst-case, sensitivity tables, disclaimer, human verify) — Complete

### Phase 7: Charts & Visualizations
**Goal**: All business charts rendered with Chart.js (scenario, breakeven, cost, sensitivity)
**Depends on**: Phase 5
**Research**: Likely (Chart.js integration with React/Next.js)
**Research topics**: Chart.js React integration patterns, responsive chart configuration, SSR compatibility with Chart.js
**Plans**: 2

Plans:
- [x] **07-01**: Chart.js Setup + Chart Components (install packages, config, ScenarioChart, BreakevenChart, CostBreakdownChart, HaySensitivityChart, PurchaseSensitivityChart) — Complete
- [x] **07-02**: Page Integration + Visual Verification (integrate charts into plan page, human verify) — Complete

### Phase 8: Print Optimization & Deployment
**Goal**: Print-to-PDF functionality polished, app deployed to piercelandandcattle.com
**Depends on**: Phase 6, Phase 7
**Research**: Likely (Vercel deployment configuration, print CSS optimization)
**Research topics**: Print CSS best practices for multi-page documents, Vercel custom domain setup, environment variable configuration for production
**Plans**: 2

Plans:
- [x] **08-01**: Print Optimization (print stylesheet, print button, human verify print quality) — Complete
- [x] **08-02**: Production Deployment (build verification, Vercel deploy, custom domain piercelandandcattle.com) — Complete

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Database | 2/2 | Complete | 2026-02-09 |
| 2. Admin Authentication & Layout | 1/1 | Complete | 2026-02-10 |
| 3. Shared Config Management | 1/1 | Complete | 2026-02-10 |
| 4. Bank Version Management | 2/2 | Complete | 2026-02-10 |
| 5. Financial Calculations Engine | 3/3 | Complete | 2026-02-10 |
| 6. Public Plan Pages | 3/3 | Complete | 2026-02-10 |
| 7. Charts & Visualizations | 2/2 | Complete | 2026-02-10 |
| 8. Print Optimization & Deployment | 2/2 | Complete | 2026-02-10 |
