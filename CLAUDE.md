# CLAUDE.md — Pierce Land & Cattle Herd App

You are building a stocker-cattle management web app for a ~50 head/turn backgrounding
operation. It is used chute-side on a tablet over Wi-Fi. There are **no scales**; weights come
from sale-barn tickets and optional heart-girth tape readings.

Read these before doing anything else, every session:

1. `docs/SPEC.md` — what to build. The source of truth for behavior, data model, and formulas.
2. `docs/PLAN.md` — ordered milestones and tasks with checkboxes. Work top to bottom.
3. `docs/PROGRESS.md` — what's done, what you were doing last. Create it if missing.
4. `docs/BLOCKERS.md` and `docs/DECISIONS.md` — create if missing.

The owner (Jason) wants to intervene as little as possible. Work autonomously through the plan,
and stop only at the gates listed under **When to stop and ask**.

---

## Stack (do not substitute without a DECISIONS.md entry)

- Next.js (App Router, latest stable) + TypeScript `strict: true`
- Supabase: Postgres, Auth, Realtime. Schema managed **only** with Supabase CLI migrations
  in `supabase/migrations/`. Do not use Prisma (a stray `_prisma_migrations` table may exist in
  the remote project — leave it alone).
- Tailwind CSS + shadcn/ui
- Zod for all input validation (shared between client and server)
- Vitest for unit tests, pgTAP (`supabase test db`) for database/RLS tests,
  Playwright for end-to-end tests
- Package manager: npm. Node 20+.

## Commands

| Command | Purpose |
|---|---|
| `npx supabase start` | Start local Supabase (Docker). All dev and tests run against local. |
| `npx supabase db reset` | Rebuild local DB from migrations + `supabase/seed.sql` |
| `npm run dev` | Dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run test:unit` | Vitest |
| `npm run test:db` | `supabase test db` (pgTAP in `supabase/tests/`) |
| `npm run test:e2e` | Playwright (tablet project 1280×800 touch + portrait 800×1280) |
| `npm run gen:types` | `supabase gen types typescript --local > src/lib/db/types.ts` |
| `npm run check` | All of the above in order: typecheck → lint → unit → db → e2e. Must exit 0. |

Create these scripts in M0 if they don't exist.

---

## The working loop

Repeat until every box in `docs/PLAN.md` is checked or you hit a stop gate.

1. **Orient.** Read `PROGRESS.md` and find the first unchecked task in `PLAN.md`.
   Run `npm run check` to confirm the tree is green before starting. If it's red, fixing it is
   the current task.
2. **Write the tests first.** Translate the task's acceptance criteria (in PLAN.md and the
   referenced SPEC.md section) into failing tests. Run them and confirm they fail for the
   right reason.
3. **Implement** the smallest change that makes them pass.
4. **Run `npm run check`.** Fix failures. After any migration change: `db reset`, then
   `gen:types`, then check.
5. **Self-review** the diff against SPEC.md. Look specifically for: money not in integer cents,
   missing RLS policy on a new table, hard deletes of treatment records, touch targets under
   56px on chute screens, unhandled Supabase errors.
6. **Commit** with a message like `M5.3: per-calf save with retry outbox`. One task per commit.
7. **Record.** Check the box in PLAN.md. Append to PROGRESS.md: date, task, what changed,
   anything the next session should know. Then go to step 1.

### Retry limit

If the same test or check fails after **3 genuine fix attempts**, stop working on it:
write the failure, what you tried, and your best hypothesis to `BLOCKERS.md`, mark the task
`[~]` in PLAN.md, and move to the next task that doesn't depend on it. Revisit blockers at the
end of each milestone.

### Making decisions on your own

When the spec is silent or ambiguous, choose the option that is simplest and most consistent
with SPEC.md, implement it, and log it in `DECISIONS.md` (date, question, choice, why). Don't
stop to ask for things like component layout, naming, library minor versions, or query
structure.

---

## Hard rules

- **Never weaken a test to make it pass.** A test may change only if SPEC.md says the behavior
  is different; note the reason in the commit message.
- **Never hard-delete** administrations, treatments, processing events, or animals. Use the
  void pattern in SPEC.md §6.
- **Money is integer cents. Weights are lb, volumes are mL, temps are °F.** Convert only at
  the display layer.
- **Every table gets RLS enabled and a pgTAP test** proving a non-member can't read it.
- **Don't invent clinical content.** Drug doses, withdrawal times, and treatment protocols come
  only from `supabase/seed.sql` as provided in SPEC.md §9, and are editable by the owner in the
  app. If a feature needs a clinical value that isn't in the seed, make it a required
  owner-entered field — don't fill in a number.
- **Never touch the remote Supabase project** (`fxbxwgfykjcnhjcvrzxw`) — no `db push`, no
  remote SQL, no remote type generation — without Jason's approval at the gate below.
- **No secrets in git.** `.env.local` is gitignored; commit `.env.example` with placeholder
  keys only.

## When to stop and ask Jason

Stop, summarize where things stand in PROGRESS.md, and ask **only** for:

1. **Environment setup** you cannot do yourself (Docker not running, Supabase CLI missing,
   Supabase login needed).
2. **Before the first push to the remote Supabase project** — show the migration list and
   confirm `supabase link` points at `fxbxwgfykjcnhjcvrzxw` and that it's the farm project.
3. **Before deployment** — hosting target is Jason's call.
4. **End of each milestone** — only if `BLOCKERS.md` has open items that block the next
   milestone. Otherwise keep going.

Everything else: decide, log it, keep moving.
