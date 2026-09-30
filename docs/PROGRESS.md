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
- Added `npm run test:db:lite` (PGlite fallback, see DECISIONS) since Docker is still missing.
- **M1.1** (`[~]` pending real stack) `supabase/migrations/20260930000100_schema.sql`: all §4
  tables, enums, composite tenancy FKs, indexes, audit trigger; `supabase/tests/01_schema.test.sql`
  (65 assertions) passes in PGlite. Mutation-checked the "every table/FK" assertions.
- **M1.2** (`[~]` pending real stack) `20260930000200_rls.sql`: membership helpers in `private`,
  policies per §3, privilege revokes, void guards, `void_record` RPC. Tests
  `02_rls.test.sql` (115) and `03_void.test.sql` (27) pass in PGlite; shared fixture builder in
  `supabase/tests/_helpers.psql` (`tests.seed_basic()`, `tests.authenticate_as(key)`).
  Gotcha: test helper `tests.id()` must be VOLATILE — a STABLE one gets pre-evaluated by the
  planner against a stale snapshot inside plpgsql and raises "unknown key".
- **M1.3** (`[~]` pending real stack) `20260930000300_triggers.sql` + `04_triggers.test.sql`
  (48): bottle defaults/decrement/restore, snapshots, pull number, metaphylaxis ack, death and
  sale status rules. Mutation-checked the time-zone and restore logic.
- **M1.4** (`[~]` pending real stack) `supabase/seed.sql` (§9 exactly) and `seed.dev.sql` (users per
  role, outsider farm, golden closed lot, Demo Heifers, demo bottles); `config.toml` seeds both
  locally. `05_seed.test.sql` (27) checks every §9 value. Seeds verified idempotent.
