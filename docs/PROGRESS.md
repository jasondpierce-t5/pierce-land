# PROGRESS

## 2026-09-30 — M0.1–M0.4 (scaffold)
- Archived the old bank-plan app (still on `master`; tag `archive/bank-plan-app` pushed).
- Scaffolded Next.js 16 + TS strict + Tailwind 4 + hand-set-up shadcn/ui + ESLint (zero warnings).
- Vitest, Playwright (3 projects), pgTAP harness with one smoke test each; `supabase init`.
- `npm run check` scripts added.
- **Not yet verified:** `test:db` and `test:e2e` (no Docker daemon in the cloud container).

## 2026-09-30 — Session 2 (Jason's Windows machine)
- Environment: Node 24, npm 11, Supabase CLI 2.118 via npx. **Docker Desktop and WSL 2 not
  installed** — walked Jason through installing them (see BLOCKERS.md). Playwright Chromium
  installed; e2e smoke now passes in all 3 projects. `test:db` still unverified.
- PLAN: M0.1/M0.4 checked; M0.2/M0.3 marked `[~]` (only the Docker-dependent parts remain).
- Skipped ahead to M2 (pure TS, no DB) while M1 is blocked on Docker.
- **M2.1** `src/lib/domain/dates.ts` (ISO date math, America/Chicago conversion) and
  `dosing.ts` (weight source, 50-lb bracket, per-100-lb volume rounded up to 0.5 mL, site split,
  display string). 100% line coverage.
- **M2.2** `fever.ts` (processing badges, NSAID condition; compared in tenths of °F),
  `treatment.ts` (pull number per diagnosis, suggestions + beyond protocol, metaphylaxis status
  and dialog text, same-class warnings), `types.ts` (shared enum lists with a contract test).
- **M2.3** `withdrawal.ts` (clear date in the Chicago time zone, animal/lot max, sale flags) and
  `inventory.ts` (cost per administration, bottle problems, apply/restore dose, default bottle,
  expiring and doses-on-hand queries). Shared fixtures `tests/fixtures/withdrawal.json` and
  `administration_cost.json` are ready for the M2.5 pgTAP comparison.
- **M2.4** `closeout.ts` (every §5.7 figure; golden case passes to the cent via
  `tests/fixtures/golden_closeout.json`, which e2e #6 should reuse), `format.ts` (display
  strings, "—" for null, real minus sign), `groupGain.ts` (§5.8 thresholds).
