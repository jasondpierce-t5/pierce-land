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

## Verify Deployment

After applying the migration and seed data, verify in the Supabase Table Editor:

- `plan_config` table should have 1 row
- `plan_versions` table should have 3 rows (cameron, first-national, community-bank)

You can also test the connection by querying from your Next.js app.
