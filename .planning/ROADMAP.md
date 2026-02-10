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
- [ ] **Phase 2: Admin Authentication & Layout** - Password gate, dashboard structure
- [ ] **Phase 3: Shared Config Management** - Market prices and operational params interface
- [ ] **Phase 4: Bank Version Management** - Create/edit bank-specific plans with overrides
- [ ] **Phase 5: Financial Calculations Engine** - Core calc logic, scenarios, sensitivity analysis
- [ ] **Phase 6: Public Plan Pages** - Dynamic routing and plan rendering
- [ ] **Phase 7: Charts & Visualizations** - Chart.js integration for all business charts
- [ ] **Phase 8: Print Optimization & Deployment** - PDF styles, Vercel deployment, domain config

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
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 3: Shared Config Management
**Goal**: Admin interface to edit market prices, feed costs, weights, ADG, and operational parameters
**Depends on**: Phase 2
**Research**: Unlikely (CRUD operations on plan_config table, standard form handling)
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 4: Bank Version Management
**Goal**: Create, edit, and deactivate bank-specific plans with optional overrides
**Depends on**: Phase 3
**Research**: Unlikely (Database operations, slug generation is standard practice)
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 5: Financial Calculations Engine
**Goal**: Complete calculation logic for all financial projections and sensitivity analysis
**Depends on**: Phase 3
**Research**: Unlikely (Internal business logic derived from requirements, no external integrations)
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 6: Public Plan Pages
**Goal**: Dynamic `/plan/[slug]` routes rendering bank-specific business plans
**Depends on**: Phase 4, Phase 5
**Research**: Unlikely (Next.js App Router dynamic routing is well-documented)
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 7: Charts & Visualizations
**Goal**: All business charts rendered with Chart.js (scenario, breakeven, cost, sensitivity)
**Depends on**: Phase 5
**Research**: Likely (Chart.js integration with React/Next.js)
**Research topics**: Chart.js React integration patterns, responsive chart configuration, SSR compatibility with Chart.js
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 8: Print Optimization & Deployment
**Goal**: Print-to-PDF functionality polished, app deployed to piercelandandcattle.com
**Depends on**: Phase 6, Phase 7
**Research**: Likely (Vercel deployment configuration, print CSS optimization)
**Research topics**: Print CSS best practices for multi-page documents, Vercel custom domain setup, environment variable configuration for production
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Database | 2/2 | Complete | 2026-02-09 |
| 2. Admin Authentication & Layout | 0/TBD | Ready to start | - |
| 3. Shared Config Management | 0/TBD | Not started | - |
| 4. Bank Version Management | 0/TBD | Not started | - |
| 5. Financial Calculations Engine | 0/TBD | Not started | - |
| 6. Public Plan Pages | 0/TBD | Not started | - |
| 7. Charts & Visualizations | 0/TBD | Not started | - |
| 8. Print Optimization & Deployment | 0/TBD | Not started | - |
