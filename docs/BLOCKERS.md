# BLOCKERS

## Open

- **2026-09-30 — Docker Desktop not installed on Jason's Windows machine.** WSL 2 is also
  missing. Blocks `supabase start`, `test:db`, DB-backed e2e, and therefore verification of
  M0.2, M0.3 (pgTAP part), all of M1, M2.5, and M3+.
  Needed from Jason: `wsl --install --no-distribution` (admin) → reboot →
  `winget install -e --id Docker.DockerDesktop` → start Docker Desktop. Walked through in chat.
  Until then: M2 is complete; M1 is written and passes in the PGlite fallback
  (`npm run test:db:lite`). M3 onward needs the real stack (auth + e2e), so work is paused there.

## Resolved / historical

- **ui.shadcn.com blocked** in the earlier cloud container; shadcn set up by hand (see
  DECISIONS.md). Not an issue on Jason's machine.
