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

## API Rate Limiting & Management

### Current Issues & Solutions

The application uses multiple market data APIs that have rate limits:

#### Twelve Data API
- **Free Tier Limit**: 8 requests/minute, 800 requests/day
- **Issue**: Exceeding rate limits causes 429 errors
- **Solution**: Implemented conservative rate limiting (6 req/min) with fallbacks

#### Yahoo Finance API  
- **Limit**: Varies, often returns 429 errors under load
- **Solution**: Used as fallback with delays between requests

#### API Management Best Practices

1. **Rate Limiting Strategy**:
   ```typescript
   // Conservative limits implemented in market-data-fetcher.ts
   const rateLimiters = {
     twelveData: new RateLimiter({ maxRequests: 6, windowMs: 60 * 1000 }),
     yahoo: new RateLimiter({ maxRequests: 50, windowMs: 60 * 60 * 1000 })
   };
   ```

2. **Sequential Processing**:
   - Changed from parallel to sequential API calls
   - Added delays between requests (200ms-2000ms)
   - Reduced batch sizes from 5 to 3

3. **Fallback Chain**:
   - Primary: Twelve Data → Secondary: Yahoo Finance → Tertiary: Mock data
   - Graceful degradation when APIs fail

4. **Caching Strategy**:
   - 30-minute TTL for market data
   - Reduces API calls by serving cached responses

### Environment Variables Required

```bash
# Market Data APIs
TWELVE_DATA_API_KEY=your_twelve_data_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FINNHUB_API_KEY=your_finnhub_key
POLYGON_API_KEY=your_polygon_key

# For production, consider upgrading API plans:
# - Twelve Data: Professional plan ($79/month) for 5000 req/min
# - Alpha Vantage: Premium plan for higher limits
```

### Monitoring & Alerts

1. **API Success Rate Monitoring**:
   ```typescript
   // Implemented in market-data-fetcher.ts
   console.log(`Market data fetch: ${successCount}/${total} successful`);
   ```

2. **Rate Limit Tracking**:
   - Added rate limit counters per API
   - Automatic fallback when limits exceeded

3. **Recommended Alerts**:
   - API success rate < 50%
   - Rate limit exceeded notifications
   - API key expiration warnings

### Production Recommendations

1. **Upgrade API Plans**:
   - Twelve Data Professional: $79/month (5000 req/min)
   - Consider multiple API keys for load balancing

2. **Implement Circuit Breakers**:
   - Temporary disable failing APIs
   - Automatic recovery after cooldown

3. **Add Request Queuing**:
   - Queue requests during high traffic
   - Process during off-peak hours

4. **Cache Optimization**:
   - Redis for distributed caching
   - Longer TTL for less volatile data
``` 
</rewritten_file>