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
