# DECISIONS

- **2026-09-30 — Existing repo content.** Question: repo held a different app. Choice: Option A
  (Jason): archive the bank-plan app (remains on `master`) and scaffold at the root.
- **2026-09-30 — Next.js 16 / React 19 / Tailwind 4 / ESLint 9.** Choice: "latest stable" per
  CLAUDE.md; whatever `create-next-app@latest` produced.
- **2026-09-30 — shadcn/ui manual setup.** `shadcn init` needs ui.shadcn.com, which the container
  blocks. Added deps, `components.json`, `cn`, and theme CSS by hand; components are written in the
  standard shadcn shape. Re-run `npx shadcn add` on a machine with access if desired.
- **2026-09-30 — `@types/node@22`.** Vitest 5 peers require >=22; Node 22 is installed.
- **2026-09-30 — Lint script** is `eslint --max-warnings=0 .` for zero-warning enforcement.
- **2026-09-30 — `dose_weight_source` values.** Spec names the three sources but not their
  stored values. Choice: `event_tape | recent_tape | lot_average` (same order as §5.1).
- **2026-09-30 — "Most recent tape within the last 30 days."** Choice: a reading counts when it is
  0–30 days before the event date inclusive; readings dated after the event are ignored.
- **2026-09-30 — Dose arithmetic precision.** Dose volumes and site splits are computed in integer
  hundredths of a mL (label doses are `numeric(7,2)`), so 1.1 mL/cwt × 500 lb is exactly 5.5 mL
  rather than float 5.500000000000001 rounding up to 6.0. Weights are bracketed in tenths of a lb.
- **2026-09-30 — `each`-unit products** (implants) always use 1 site and format as "1 each".
- **2026-09-30 — Metaphylaxis day counter.** Day N = pull date − dose date (day 0 = day given);
  "within interval" is N < X, so with X = 7 days 0–6 block and day 7 doesn't (matches the §10
  test days 0/6/7/8). Voided and skipped doses don't count. If several windows cover the pull
  date, the one ending latest is shown; if none, the most recent dose is shown for the side
  panel's counter.
- **2026-09-30 — Same-class lookback** is 0–14 days before the pull date inclusive, counting only
  non-voided, non-skipped antimicrobial doses. One warning per suggested product, naming the
  most recent prior product of that class.
- **2026-09-30 — Conditional steps below threshold** are returned as `notIndicated` rather than
  dropped, so the UI can show "Flunixin — not indicated (temp below 104.0 °F)".
- **2026-09-30 — Withdrawal date uses the farm time zone.** §4 writes `given_at::date`, but the DB
  session runs in UTC, so a 10:30 pm CDT dose would land on the next day. The trigger (and TS)
  use `(given_at at time zone 'America/Chicago')::date`, per §2. Fixture
  `tests/fixtures/withdrawal.json` includes the late-evening case.
- **2026-09-30 — A dose must fit in one bottle.** `remaining_ml < dose` blocks the save (the UI
  prompts a bottle switch) rather than letting remaining go negative or splitting a dose across
  bottles. Enforced by a `remaining_ml >= 0` check in the DB.
- **2026-09-30 — Expiry boundary.** A bottle is usable on its expiration date and blocked from
  the day after ("expiration_date before today" per §5.6).
- **2026-09-30 — Dashboard stock queries.** "Expiring within 30 days" lists in-stock/open bottles
  with expiration ≤ today + 30, including ones already past expiry that haven't been marked.
  "Doses on hand" counts whole doses per usable bottle (a dose can't span bottles); low stock is
  doses < the lot's head.
- **2026-09-30 — Golden ADG display (spec inconsistency).** 9,800 / 49 / 151 = 1.32450…, which
  rounds to 1.325, but the §5.7 table says 1.324, while its other rows (e.g. breakeven 304.866 →
  $304.87) are conventionally rounded. Choice: keep the exact value in `adgLb` and **display ADG
  truncated to 3 decimals**, so the report matches the golden table. Jason: say if you'd rather
  see 1.325.
- **2026-09-30 — Closeout rounding.** Totals are integer cents: the purchase cost and each sale's
  gross are rounded half away from zero, as is `dead_purchase`. Rates ($/lb, $/cwt, $/head,
  lb/day) stay unrounded and are rounded only for display. Days on feed can be fractional with
  several sales (head-weighted). Percentages are 0–1 fractions shown to one decimal.
- **2026-09-30 — Group gain pairing.** Uses the last non-voided, non-blank tape weight per animal
  in each session; sessions may be passed in either order; also reports the group-average daily
  gain (group level only — individual ADG is never produced).
- **2026-09-30 — PGlite fallback DB test runner (not a stack substitution).** No Docker on this
  machine or in cloud sessions, so `npm run test:db:lite` (`scripts/db-test-lite.mjs`) runs the
  migrations, seeds, and the same pgTAP files in PGlite (WASM Postgres 18 +
  `@electric-sql/pglite-pgtap`) with a stub of Supabase's auth schema/roles/grants. It is for fast
  feedback only; `npm run check` still runs `supabase test db`, and a task touching the DB isn't
  checked off in PLAN.md until that passes on the real stack.
