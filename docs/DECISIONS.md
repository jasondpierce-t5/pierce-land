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
- **2026-09-30 — Schema details the spec leaves open (M1.1).**
  - `animals.sex` is its own enum `heifer | steer | bull` (lots use `heifer | steer | mixed`); nullable.
  - Active-tag uniqueness is case-insensitive (`lower(visual_tag)`); tags must be trimmed.
  - Child rows reference parents by `(id, farm_id)` composite FKs so no row can point at another
    farm's data; administrations also reference `(processing_event_id, animal_id)`,
    `(treatment_id, animal_id)` and `(inventory_item_id, product_id)` so the event, animal, bottle,
    and product always agree.
  - `protocol_steps.session_kind` (null = any) added: the seeded processing protocol has separate
    arrival and booster steps, which §4's column list can't express.
  - `protocols.family_id` groups versions; one active version per family.
  - `farms` holds the fever thresholds (§5.3 "settings"), defaults 104.0 / 105.0.
  - `products.rx_only` is nullable: not in the §9 seed, so it stays unknown until the owner enters
    it (no invented regulatory data).
  - `inventory_items.discarded_at` / `discard_reason` added for "discard bottle (with reason)".
  - A skipped administration has no bottle and must have a `skip_reason`; a given one must have a
    bottle and `dose_ml`.
  - One non-voided processing event per animal per session.
  - Temps are range-checked 90–115 °F to catch keypad typos (data entry sanity, not clinical).
  - Signed-in users can't set `created_at`/`created_by`; seeds (no `auth.uid()`) can.
- **2026-09-30 — RLS details (M1.2).**
  - Hands may add and discard bottles (`inventory_items`): §3 gives them "inventory use", and
    they're the ones opening a new box at the chute. Products, protocols, costs, sales, members,
    and farm settings are owner-only.
  - Farms are never created through the API (seeded, or by the service role).
  - `anon` has no table privileges. DELETE is revoked everywhere, and new tables opt in
    explicitly (default privileges revoked); owners may delete only `lot_costs`,
    `protocol_steps`, and `farm_members`. The four protected tables also deny DELETE to
    `service_role`.
  - Direct UPDATE on `administrations` and `processing_events` is revoked; they change only
    through `void_record`. Treatments allow updates to `outcome`, `recheck_date`, `notes`;
    animals to their own details (not void columns). Voided rows are frozen by trigger, even for
    the table owner.
  - `void_record` is idempotent (voiding a voided row is a no-op, for outbox retries), trims the
    reason, cascades from processing events and treatments to their administrations, and
    returns "not found" (not "forbidden") to non-members so ids don't leak.
  - Error codes: 22023 bad input, P0002 not found, 42501 not allowed, 55000 voided/immutable.
- **2026-09-30 — Trigger design (M1.3).**
  - Retries are `insert … on conflict do nothing`, and Postgres fires BEFORE ROW triggers even
    for rows that then conflict. So BEFORE triggers only compute snapshots (cost, withdrawal date,
    pull number), and everything that changes other rows or refuses the write (bottle checks and
    decrement, metaphylaxis ack, death → status) runs AFTER INSERT. A test proves a retried dose
    doesn't decrement twice. Raising in AFTER also means RLS denials win over business errors.
  - Bottle expiry is judged against the dose's own farm date (`given_at` in Chicago), not "now".
  - The post-metaphylaxis acknowledgement is enforced in the DB too (SQLSTATE PLT01), mirroring
    `metaphylaxisStatus()`; the dialog is the UI half.
  - Status rules: `dead` only via a death row (active animals only), `sold` only by linking
    `sale_id` (owners only; unlinking returns the animal to active), `removed` needs a reason and
    defaults `removal_date` to today; dead/sold can't be edited back.
  - Custom SQLSTATEs: PLB01 bottle expired, PLB02 empty/discarded, PLB03 less than the dose,
    PLT01 metaphylaxis ack missing.
  - The PGlite runner pins `timezone = 'UTC'` like Supabase; without it the host's Central time
    zone hid a `given_at::date` bug in a mutation test.
- **2026-09-30 — Seeds (M1.4).**
  - `seed.sql` creates the farm "Pierce Land & Cattle" (fixed id `00000000-…-0001`) and its §9
    catalog with fixed ids, idempotently (`on conflict do nothing`), so G1 can run it by hand.
  - Flunixin "IV/IM neck": default route IV (first listed), site neck; the route is editable per
    administration. `is_antimicrobial` is set for the macrolide, phenicol, and fluoroquinolone
    (definitional from the class); `rx_only` and brand/vaccine active ingredients stay null.
  - "Demo farm" in §9 is read as: the dev seed fills the seeded farm with demo data, plus a
    separate "Neighbor Farm (dev)" owned by `outsider@pierce.test` for isolation checks.
  - Dev users sign in with a dev-only password or a magic link via Mailpit.
  - The golden lot is seeded as a *closed* turn (tags 101–150 sold/dead), so E2E #1 can still
    create an active lot with tags 101–150. An active "Demo Heifers" lot (tags 201–250; 246–250
    replacement candidates) and demo bottles support chute work and E2E #2.
