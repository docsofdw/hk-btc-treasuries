# Asia-Pacific Bitcoin Treasury Scanner - Complete Setup Guide

## Overview

The enhanced Asia-Pacific Bitcoin Treasury Scanner automatically discovers and tracks Bitcoin holdings of publicly listed companies across Asian markets using AI-powered search and data extraction.

## Key Improvements Made

### 1. Enhanced Search Strategy
- **Multi-language support**: Searches in English, Chinese (Simplified/Traditional), Japanese, and Korean
- **Exchange-specific queries**: Targets HKEX, SSE, SZSE, TSE, KOSPI, SGX, ASX
- **Better domain filtering**: Focuses on official exchange sites and reputable Asian news sources
- **10 refined search queries**: More specific searches for corporate Bitcoin holdings

### 2. Better Data Extraction
- **Structured prompts**: Gives Perplexity specific instructions on what data to extract
- **Multi-pattern matching**: Handles various formats of company names, tickers, and amounts
- **Ticker normalization**: Automatically adds exchange suffixes (.HK, .SZ, etc.)
- **Date normalization**: Handles Asian date formats

### 3. Validation & Deduplication
- **Sanity checks**: Validates BTC amounts (no company holds >1M BTC)
- **Duplicate detection**: Checks if findings already exist in database
- **Confidence scoring**: Rates each finding based on data completeness (0-100%)
- **URL deduplication**: Prevents processing the same announcement multiple times

### 4. Enhanced UI
- **Better visualization**: Shows findings by exchange, top holdings, and statistics
- **Batch approval**: Select multiple findings to add to database
- **Confidence indicators**: Visual cues for data quality
- **Exchange badges**: Color-coded exchange identification

## Setup Instructions

### Step 1: Deploy the Enhanced Edge Function

```bash
# Deploy the improved edge function
supabase functions deploy dynamic-data-updater --no-verify-jwt

# Verify deployment
supabase functions list
```

### Step 2: Set Environment Variables

```bash
# Set your API keys
supabase secrets set PERPLEXITY_API_KEY=your-actual-perplexity-key
supabase secrets set FIRECRAWL_API_KEY=your-actual-firecrawl-key

# Verify secrets are set
supabase secrets list
```

### Step 3: Apply Database Migrations

```bash
# Apply the enhanced database schema
supabase db push

# Verify tables and functions were created
supabase db inspect
```

### Step 4: Test the Enhanced Functionality

```bash
# Start local development environment
npm run dev

# Navigate to the admin panel
# http://localhost:3000/admin/dynamic-updates
```

## Monitoring & Alerts

### Daily Summary Query
```sql
SELECT 
  scan_date,
  filings_processed,
  unique_companies,
  total_btc_discovered,
  verified_filings,
  unverified_filings
FROM scanner_performance_stats
ORDER BY scan_date DESC
LIMIT 7;
```

### Duplicate Detection Query
```sql
SELECT * FROM get_duplicate_stats(7);
```

### Top Holdings Query
```sql
SELECT 
  legal_name,
  ticker,
  listing_venue,
  estimated_btc,
  confidence_level
FROM mv_asia_bitcoin_treasuries
WHERE estimated_btc > 0
ORDER BY estimated_btc DESC
LIMIT 10;
```

## Scheduling Regular Updates

### Supabase Cron Jobs (Recommended)

```sql
-- Schedule scanner to run every 6 hours
SELECT cron.schedule(
  'asia-bitcoin-treasury-scan',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-id.supabase.co/functions/v1/dynamic-data-updater',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

## Performance Features

### Database Indexes Added
- Fast entity + date queries
- Exchange-based filtering  
- Source and filing type queries

### API Rate Limiting
- Perplexity: 1-second delays between queries
- Firecrawl: Only for high-confidence URLs
- Graceful error handling

## Troubleshooting

### No Results Found
```bash
# Check API keys and logs
supabase secrets list
supabase functions logs dynamic-data-updater
```

### High Duplicate Rate
```sql
-- Check duplicate statistics
SELECT * FROM get_duplicate_stats(7);
```

## Cost Optimization

**Estimated monthly cost**: $10-30 for continuous scanning
- Perplexity API: $1-5/month
- Firecrawl API: $5-20/month

## Next Steps

1. Deploy the enhanced edge function
2. Set up API keys  
3. Apply database migrations
4. Test the improved functionality
5. Schedule regular scans
6. Monitor performance and costs