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
