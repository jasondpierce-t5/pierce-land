# Database Schema Setup

## Apply Migration and Seed Data

Since we're using a remote Supabase instance without CLI authentication, follow these steps to apply the migration:

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/fxbxwgfykjcnhjcvrzxw/sql
2. Open the SQL Editor
3. Copy and paste the contents of `migrations/20260209000001_initial_schema.sql`
4. Click "Run" to execute the migration
5. Copy and paste the contents of `seed.sql`
6. Click "Run" to execute the seed data

### Option 2: Supabase CLI (Requires Authentication)

If you have Supabase CLI authenticated:

```bash
npx supabase login
npx supabase link --project-ref fxbxwgfykjcnhjcvrzxw
npx supabase db push
```

Then apply seed data via the SQL Editor or by running:

```bash
psql $DATABASE_URL < supabase/seed.sql
```

## Apply Schema Expansion (Phase 5)

After the initial schema and seed data are applied, apply the schema expansion migration:

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/fxbxwgfykjcnhjcvrzxw/sql
2. Open the SQL Editor
3. Copy and paste the contents of `migrations/20260210000001_expand_config_schema.sql`
4. Click "Run" to execute the migration

This adds 32 new fields to `plan_config` covering operator info, sale scenarios, spring/winter turn operations, and winter feed details. The existing singleton row is automatically updated with default values from project.md.

### Option 2: Supabase CLI

If you have Supabase CLI authenticated:

```bash
npx supabase db push
```

## Verify Deployment

After applying all migrations and seed data, verify in the Supabase Table Editor:

- `plan_config` table should have 1 row with 43 fields (11 original + 32 new)
- `plan_versions` table should have 3 rows (cameron, first-national, community-bank)

You can also test the connection by querying from your Next.js app.
