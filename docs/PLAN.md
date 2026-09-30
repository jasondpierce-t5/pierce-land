# PLAN — build order

Work top to bottom. Each task: tests first, then implement, then `npm run check` green, then
commit, then check the box. Legend: `[ ]` todo · `[x]` done · `[~]` blocked (see BLOCKERS.md).
Section references (§) are to `docs/SPEC.md`.

## Jason's one-time setup (before M0)

- [ ] Install Docker Desktop, Node 20+, Supabase CLI; run `npx supabase login`
- [ ] Create an empty git repo and drop in `CLAUDE.md` and `docs/`
- [ ] Start Claude Code in the repo: "Read CLAUDE.md and work through docs/PLAN.md."

## M0 — Scaffold

- [x] **M0.1** Next.js + TS strict + Tailwind + shadcn/ui + ESLint (zero warnings).
  `.env.example`, `.gitignore`.
- [~] **M0.2** `supabase init`; the local stack starts. Scripts from CLAUDE.md, including
  `check`.
- [~] **M0.3** Vitest, Playwright (projects: tablet-landscape 1280×800 with `hasTouch`,
  tablet-portrait 800×1280, phone 390×844), pgTAP harness. One smoke test each.
- [x] **M0.4** Create `docs/PROGRESS.md`, `BLOCKERS.md`, `DECISIONS.md`.

**Done when:** `npm run check` passes from a clean clone after `supabase start`.

## M1 — Schema, RLS, seed

- [~] **M1.1** Migrations for all §4 tables, with enums, FKs, indexes, audit columns, and the
  `updated_at` trigger.
- [ ] **M1.2** RLS policies per §3; revoke DELETE on the protected tables; `void_record` RPC
  (§6).
- [ ] **M1.3** Triggers:
  - inventory decrement on insert, and restore on void (§5.6)
  - `cost_cents` and `withdrawal_clear_date` snapshots
  - animal status set by deaths and sales
- [ ] **M1.4** `seed.sql` (§9) and `seed.dev.sql` (demo farm, one user per role, golden lot).
- [ ] **M1.5** pgTAP suite per §10 (Database). `gen:types` committed.

**Done when:** every table has an RLS-denied test, and the protected-delete tests pass.

## M2 — Domain library (pure functions)

- [x] **M2.1** `dosing.ts` — weight source, bracket, volume, sites (§5.1–5.2)
- [x] **M2.2** `fever.ts`, `treatment.ts` — flags, pull number, suggestions, metaphylaxis
  interval, same-class warning (§5.3–5.4)
- [x] **M2.3** `withdrawal.ts`, `inventory.ts` (§5.5–5.6)
- [x] **M2.4** `closeout.ts` with the golden case (§5.7); `groupGain.ts` (§5.8)
- [ ] **M2.5** Shared fixtures; pgTAP tests proving the DB snapshots equal the TS results.

**Done when:** domain coverage is ≥95% and the golden case passes to the cent.

## M3 — Auth, shell, lots, animals

- [ ] **M3.1** Supabase Auth (email magic link), farm membership gate, and role-aware
  navigation.
- [ ] **M3.2** Lots CRUD with the purchase fields and Zod validation.
- [ ] **M3.3** Add animals by tag range, CSV, or one at a time; duplicate active tags rejected
  with a clear message.
- [ ] **M3.4** Animal detail: timeline of processing, administrations, treatments, and
  withdrawal status, with voided rows struck through.

**Done when:** E2E #1 passes.

## M4 — Products, inventory, protocols

- [ ] **M4.1** Product catalog editor with the label-verification badge.
- [ ] **M4.2** Inventory: add, discard, and view bottles; expiry and low-stock queries.
- [ ] **M4.3** Protocol editor with versioning-on-edit-after-use and the vet approval fields.

**Done when:** an owner can edit these, and hand/vet edits are rejected in both the UI and the
DB.

## M5 — Chute mode (the core)

- [ ] **M5.1** Session start with bottle selection (§8.3.1).
- [ ] **M5.2** Per-calf screen: keypad tag entry, temp, tape weight, protocol checklist with
  computed doses, skip-with-reason, feeders_only auto-skip.
- [ ] **M5.3** Save via client UUID, the outbox, and status chips (§7).
- [ ] **M5.4** Undo last calf (transactional void); change bottle mid-session.
- [ ] **M5.5** Fever badges and the sick-on-arrival handoff to the treatment flow.
- [ ] **M5.6** Close session with the summary.

**Done when:** E2E #2 and #3 pass in both tablet orientations.

## M6 — Sick pen

- [ ] **M6.1** Pull entry with the animal side panel, suggestions, metaphylaxis dialog, and
  same-class warning.
- [ ] **M6.2** Rechecks list and outcomes; re-pull.
- [ ] **M6.3** Death recording with necropsy fields.

**Done when:** E2E #4 and #5 pass.

## M7 — Dashboard and Realtime

- [ ] **M7.1** Dashboard widgets (§8.1) and the protocol-approval banner.
- [ ] **M7.2** Realtime subscriptions for treatments and rechecks, with a test that a second
  browser context sees a new pull within 5 seconds.

## M8 — Money and reports

- [ ] **M8.1** Lot costs CRUD.
- [ ] **M8.2** Sales, with animal selection and the withdrawal flag at confirmation.
- [ ] **M8.3** Closeout page (print CSS) built on `closeout.ts`.
- [ ] **M8.4** CSV exports: treatment records (BQA), withdrawal report.

**Done when:** E2E #6 (full turn) and #7 (roles) pass.

## M9 — Hardening

- [ ] **M9.1** Accessibility pass (axe in Playwright, no serious violations on the chute and
  sick-pen screens).
- [ ] **M9.2** E2E #8 visual/orientation check.
- [ ] **M9.3** Installable web app manifest and icon (so the tablet opens it full-screen; not
  offline).
- [ ] **M9.4** `README.md`: setup, commands, architecture, how to add a product or protocol.
- [ ] **M9.5** Review BLOCKERS.md and DECISIONS.md; resolve or summarize for Jason.

## Gates (stop and ask Jason)

- [ ] **G1 — Remote database.** Confirm `supabase link --project-ref fxbxwgfykjcnhjcvrzxw` is
  the farm project, show the migration list, get approval, then `supabase db push` and seed
  production **without** `seed.dev.sql`.
- [ ] **G2 — Deploy.** Jason picks the hosting target and sets the env vars.
- [ ] **G3 — Clinical sign-off.** Jason's vet reviews the seeded products and protocols in the
  app, and Jason clears the verification badges and sets `approved_by`. (Not a code task;
  the build doesn't wait on it.)
