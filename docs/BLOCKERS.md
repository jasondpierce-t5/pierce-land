# BLOCKERS

- **Docker daemon unavailable** in the cloud container, so `supabase start`, `test:db`, and the
  DB-backed e2e tests cannot run here. Needed from Jason: run on a machine with Docker Desktop.
- **`ui.shadcn.com` blocked** by the container network policy; shadcn set up by hand (see DECISIONS.md).
