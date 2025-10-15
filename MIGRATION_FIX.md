# Migration Numbering Fix

## Problem
Migration files were renamed from `001_*.sql` to timestamp format `20240626_*.sql`, but remote database still has old numbered migrations applied.

## Quick Fix (Just apply the new migration)

### Via Supabase Dashboard SQL Editor:

```sql
-- Add source column to price_snapshots table
ALTER TABLE price_snapshots 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'unknown' 
CHECK (source IN ('coingecko', 'coincap', 'cached', 'unknown'));

-- Create index for source column
CREATE INDEX IF NOT EXISTS idx_price_snapshots_source ON price_snapshots(source);

-- Add comment for documentation
COMMENT ON COLUMN price_snapshots.source IS 'Source of the price data: coingecko (primary), coincap (fallback), or cached (emergency fallback)';
```

### Verify it worked:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'price_snapshots' 
AND column_name = 'source';
```

## Alternative: Keep Old Naming for Deployed Migrations

If you prefer consistency with what's already deployed, revert local migrations 001-010 back to old names:

```bash
cd supabase/migrations

# Revert already-deployed migrations to old names
mv 20240626170800_initial_schema.sql 001_initial_schema.sql
mv 20240701135300_pipeline_stages.sql 002_pipeline_stages.sql  
mv 20240701140200_multi_region_support.sql 003_multi_region_support.sql
mv 20240626222900_add_market_data.sql 004_add_market_data.sql
mv 20240626222800_refresh_materialized_view.sql 005_refresh_materialized_view.sql
mv 20240627095600_raw_filings_table.sql 006_raw_filings_table.sql
mv 20240627114400_add_delta_tracking.sql 007_add_delta_tracking.sql
mv 20240630141400_add_audit_logs.sql 008_add_audit_logs.sql
mv 20240630140800_recent_filings_view.sql 009_recent_filings_view.sql
mv 20240630143500_fix_recent_filings_view.sql 010_fix_recent_filings_view.sql

# Keep new migrations with timestamps
# 20240626173100_price_tracking.sql
# 20240626194200_refresh_function.sql  
# 20240703151100_enhanced_asia_treasury_scanner.sql
# 20240715101100_scraper_orchestration.sql
# 20251014111300_add_price_source.sql

# Then push
npx supabase db push
```

## Recommended Approach

**Just run the SQL manually** (Option 1 above). It's faster, safer, and avoids migration tracking issues.

Once the column exists in production, the cron job `/api/cron/fetch-prices` will work perfectly!

## Verify Everything Works

After applying the migration:

1. **Check column exists:**
   ```bash
   curl https://yourdomain.com/api/health
   ```

2. **Test price fetching:**
   ```bash
   curl https://yourdomain.com/api/cron/fetch-prices
   ```

3. **Query the data:**
   ```sql
   SELECT btc_usd, source, created_at 
   FROM price_snapshots 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

