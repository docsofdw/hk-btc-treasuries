# Manual Deployment Guide

Since you're not using Docker/local Supabase, here's how to deploy the improvements manually:

## Option 1: Quick Manual Deployment (Recommended)

### Step 1: Apply Database Migration
```bash
# Apply all pending migrations to your linked Supabase project
supabase db push

# Or if you want to see what would be applied first:
supabase db push --dry-run
```

### Step 2: Deploy PDF Parsing Function
```bash
# Deploy the new PDF parsing edge function
supabase functions deploy parse-pdf
```

### Step 3: Test the Migration
```bash
# Check if the new materialized view was created
supabase sql --execute "SELECT * FROM entity_btc_holdings LIMIT 1;"

# Check if the advisory lock functions exist
supabase sql --execute "SELECT try_advisory_lock('test');"
```

### Step 4: Run Tests (Optional)
```bash
npm run test:unit
```

## Option 2: Database-Only Deployment

If you just want the database improvements without the edge functions:

### Apply the Migration Manually
```bash
# Copy the SQL from supabase/migrations/007_add_delta_tracking.sql
# and run it directly in your Supabase SQL editor or via CLI:

supabase sql --file supabase/migrations/007_add_delta_tracking.sql
```

## Option 3: Using Supabase Dashboard

### Database Changes
1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase/migrations/007_add_delta_tracking.sql`
3. Click "Run" to execute

### Edge Function Deployment
1. Go to Supabase Dashboard → Edge Functions
2. Create a new function called `parse-pdf`
3. Copy and paste the contents of `supabase/functions/parse-pdf/index.ts`
4. Deploy the function

## Verification Steps

After deployment, verify everything works:

### 1. Check New Database Objects
```sql
-- Check if materialized view exists
SELECT * FROM entity_btc_holdings LIMIT 5;

-- Check data quality report
SELECT * FROM data_quality_report;

-- Test advisory lock functions
SELECT try_advisory_lock('test-lock');
SELECT release_advisory_lock('test-lock');
```

### 2. Check New Columns
```sql
-- Verify new columns in raw_filings table
SELECT 
  id, 
  btc_delta, 
  btc_total, 
  detected_in, 
  market_data_updated_at 
FROM raw_filings 
LIMIT 5;
```

### 3. Check Indexes
```sql
-- Verify indexes were created
SELECT 
  indexname, 
  tablename 
FROM pg_indexes 
WHERE tablename IN ('raw_filings', 'entities')
ORDER BY tablename, indexname;
```

## Environment Setup

Make sure your environment variables are set according to `.env.example`:

```bash
# Copy the example file
cp .env.example .env.local

# Edit with your actual values
# Key security points:
# - SUPABASE_SERVICE_ROLE_KEY should only be in server environments
# - Never commit real keys to git
```

## Troubleshooting

### Migration Issues
```bash
# If migration fails, check current state
supabase db diff --use-migra

# Reset local migrations (if using local dev)
supabase db reset

# Check Supabase project status
supabase projects list
supabase status
```

### Edge Function Issues
```bash
# Check function logs
supabase functions logs parse-pdf

# Test function locally
supabase functions serve parse-pdf
```

### Common Problems

**Problem**: `unknown flag: --include-migrations`
**Solution**: Use `supabase db push` without extra flags

**Problem**: `Cannot find function refresh_entity_holdings`
**Solution**: The migration needs to complete first. Run `supabase db push` again.

**Problem**: Edge function deployment fails
**Solution**: Make sure you're logged in: `supabase login`

## Next Steps

After successful deployment:

1. **Test PDF parsing**: Try parsing a sample Bitcoin filing
2. **Monitor data quality**: Check the `data_quality_report` view regularly
3. **Set up monitoring**: Enable GitHub Actions for secret scanning
4. **Update your application**: The UI improvements should now show provenance badges

## Manual File Updates

If you prefer to update files manually rather than using git, here are the key changes:

### Frontend Changes
- `components/filings/RecentFilings.tsx` - Added provenance badges
- `components/treasuries/TreasuryTable.tsx` - Added market data reliability indicators

### Backend Changes  
- `lib/rate-limiter.ts` - Rate limiting framework
- `lib/parsers/bitcoin-extractor.ts` - Bitcoin amount extraction
- `lib/parsers/hkex-parser.server.ts` - Server-only parser

### Security Files
- `.env.example` - Environment variable template with warnings
- `.github/workflows/secret-scan.yml` - Automated secret scanning

All the code is already in your project, you just need to apply the database migration and optionally deploy the edge function! 