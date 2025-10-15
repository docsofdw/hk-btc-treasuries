# Migration Sync Issue - Fix Guide

## Problem

When running `npx supabase db push`, you get:
```
ERROR: column "listing_venue" does not exist (SQLSTATE 42703)
At migration: 20240703151100_enhanced_asia_treasury_scanner.sql
```

This happens because:
- Your production database has already been set up
- Some migrations were applied manually or through dashboard
- Supabase CLI is trying to re-run old migrations that conflict

## Solution 1: Use Supabase Dashboard (Recommended)

**Apply ONLY the new entity-scoped refresh migration:**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy contents of `supabase/migrations/20251015130000_entity_scoped_snapshot_refresh.sql`
3. Paste and click **Run**
4. ✅ Done! Skip all the old migrations

## Solution 2: Mark Old Migrations as Applied

If you want to use CLI, tell Supabase which migrations are already applied:

```bash
# Connect to your database
psql $DATABASE_URL

# Or via Supabase SQL Editor, run:
```

```sql
-- Create schema_migrations table if it doesn't exist
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY,
  statements TEXT[],
  name TEXT
);

-- Mark these migrations as already applied (adjust as needed)
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
  ('20240626173100', 'price_tracking'),
  ('20240626194200', 'refresh_function'),
  ('20240703151100', 'enhanced_asia_treasury_scanner'),
  ('20240715101100', 'scraper_orchestration')
ON CONFLICT (version) DO NOTHING;
```

Then run:
```bash
npx supabase db push
# Will only push migrations not in schema_migrations table
```

## Solution 3: Apply Only New Migrations

Create a separate file with just the new migration:

```bash
# In Supabase SQL Editor, run:
```

```sql
-- Just the entity-scoped refresh migration
\i supabase/migrations/20251015130000_entity_scoped_snapshot_refresh.sql
```

## Verification

After applying the migration, verify it worked:

```sql
-- Should return 'table' (not 'materialized view')
SELECT table_type 
FROM information_schema.tables 
WHERE table_name = 'latest_snapshot';

-- Should show the new functions
SELECT proname 
FROM pg_proc 
WHERE proname IN ('refresh_entity_snapshot', 'full_refresh_latest_snapshot');
```

## What Causes This?

Common scenarios:
1. **Manual setup** - Database was created through dashboard
2. **Partial migrations** - Some migrations ran, others didn't
3. **Schema drift** - Production schema differs from migration files
4. **Migration order** - Migrations applied out of order

## Prevention

Going forward:
- Use Supabase CLI consistently OR dashboard consistently (not both)
- Keep `schema_migrations` table in sync
- Test migrations locally first with `npx supabase start`

## For This Specific Case

**Just use the Dashboard method** - It's faster and avoids all the old migration conflicts! 🚀

