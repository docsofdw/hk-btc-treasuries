# Bitcoin Treasury Filing System

A comprehensive system for automatically tracking and collecting regulatory filings related to Bitcoin treasury disclosures from HKEX and SEC.

## 🚀 Features

- **Automated HKEX Scanning**: Searches Hong Kong Exchange announcements for Bitcoin-related keywords
- **SEC EDGAR Integration**: Monitors SEC filings from tracked Chinese ADR companies
- **Real-time Data**: Updates every 4 hours via automated cron jobs
- **Multi-language Support**: Detects Bitcoin keywords in English and Chinese
- **Admin Interface**: Manual trigger interface for testing and immediate scans
- **Verification System**: Track verified vs unverified filings
- **Rate Limiting**: Respectful API usage with proper delays

## 📋 Requirements

- Supabase project with Edge Functions enabled
- Vercel deployment (for cron jobs)
- Node.js 18+ for local development

## 🛠️ Setup Instructions

### 1. Database Migration

Run the new migration to create the `raw_filings` table:

```sql
-- This is already created in: supabase/migrations/006_raw_filings_table.sql
-- Run: supabase db push
```

### 2. Deploy Edge Functions

Deploy the scanning functions to Supabase:

```bash
# Deploy HKEX scanner
supabase functions deploy scan-hkex-filings

# Deploy SEC scanner
supabase functions deploy scan-sec-filings
```

### 3. Environment Variables

Add to your `.env.local`:

```env
# Required for cron jobs
CRON_SECRET=your-super-secret-cron-key

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Deploy to Vercel

The `vercel.json` is already configured with the cron job:

```json
{
  "crons": [
    {
      "path": "/api/cron/scan-filings",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

## 🔄 How It Works

### HKEX Scanner

1. **Entity Discovery**: Queries all entities with `listing_venue = 'HKEX'`
2. **Incremental Scanning**: Only scans for filings newer than the last stored filing
3. **Keyword Detection**: Searches for Bitcoin-related terms in multiple languages:
   - English: bitcoin, btc, digital asset, cryptocurrency, crypto asset
   - Chinese: 比特币, 數字資產, 加密货币, 虛擬資產, 數位資產
4. **Amount Extraction**: Uses regex patterns to extract BTC amounts from titles
5. **Filing Classification**: Automatically categorizes as acquisition, disposal, disclosure, or update

### SEC Scanner

1. **CIK Mapping**: Uses predefined mapping of tickers to SEC CIK numbers
2. **EDGAR API**: Searches recent filings (8-K, 10-Q, 10-K, 20-F, 6-K)
3. **Content Analysis**: Downloads and parses filing content for Bitcoin mentions
4. **Amount Extraction**: Advanced regex patterns for extracting BTC quantities
5. **Rate Limiting**: Respects SEC API guidelines with appropriate delays

## 📊 Data Structure

### Raw Filings Table

```sql
CREATE TABLE raw_filings (
  id BIGSERIAL PRIMARY KEY,
  entity_id UUID REFERENCES entities(id),
  btc DECIMAL(12, 4) NOT NULL DEFAULT 0,
  disclosed_at TIMESTAMPTZ NOT NULL,
  pdf_url TEXT NOT NULL,
  source TEXT NOT NULL, -- 'HKEX' or 'SEC'
  extracted_text TEXT,
  verified BOOLEAN DEFAULT FALSE,
  filing_type TEXT, -- 'acquisition', 'disposal', 'disclosure', 'update'
  title TEXT,
  summary TEXT,
  document_type TEXT,
  total_holdings DECIMAL(12, 4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🎛️ Usage

### Automatic Scanning

The system automatically scans every 4 hours via Vercel cron jobs. No manual intervention required.

### Manual Scanning

Visit `/admin/scan-filings` for manual trigger interface:

- **Full Scan**: Scans both HKEX and SEC
- **HKEX Only**: Scans Hong Kong Exchange only
- **SEC Only**: Scans SEC EDGAR only

### API Endpoints

#### Get Recent Filings
```bash
GET /api/filings/recent?source=raw&limit=20
```

#### Manual Scan Trigger
```bash
POST /api/admin/scan-filings
```

#### Cron Job Endpoint
```bash
POST /api/cron/scan-filings
Authorization: Bearer ${CRON_SECRET}
```

## 🔧 Configuration

### Adding New Entities

To track new companies, add them to the `entities` table:

```sql
INSERT INTO entities (legal_name, ticker, listing_venue, hq, region)
VALUES ('New Company Ltd', '1234.HK', 'HKEX', 'Hong Kong', 'HK');
```

### Adding SEC CIKs

For SEC-tracked companies, update the CIK map in `scan-sec-filings/index.ts`:

```typescript
const CIK_MAP: Record<string, string> = {
  'TICKER': '0001234567', // Company CIK
  // Add more mappings
};
```

### Customizing Keywords

Update the keyword arrays in both scanner functions to catch more filing types:

```typescript
const BITCOIN_KEYWORDS = [
  'bitcoin', 'btc', 'digital asset',
  // Add more keywords
];
```

## 📈 Monitoring

### Logs

- Cron job results are logged to Vercel Functions
- Edge function logs available in Supabase dashboard
- Admin interface shows real-time scan results

### Error Handling

- Graceful failure handling for individual entities
- Comprehensive error reporting in scan results
- Automatic retry mechanisms for failed requests

### Performance

- Rate limiting prevents API abuse
- Incremental scanning reduces processing time
- Efficient database queries with proper indexing

## 🔍 Verification Workflow

1. **Automatic Detection**: System finds potential Bitcoin-related filings
2. **Manual Review**: Admin reviews filings at `/admin/scan-filings`
3. **Verification**: Mark filings as verified after manual confirmation
4. **Integration**: Verified filings appear in public filing feeds

## 🚨 Troubleshooting

### Common Issues

1. **No Filings Found**: Check if entities exist in database with correct `listing_venue`
2. **SEC Access Denied**: Ensure User-Agent header is properly set
3. **HKEX Timeouts**: Increase timeout values in edge function
4. **Cron Not Running**: Verify `CRON_SECRET` environment variable

### Debug Mode

Enable detailed logging by updating edge functions:

```typescript
// Add at the top of edge functions
const DEBUG = true;
if (DEBUG) console.log('Debug info:', data);
```

## 🔮 Future Enhancements

- **PDF Parsing**: Implement actual PDF content extraction
- **AI Classification**: Use GPT-4 for better filing categorization
- **Real-time Notifications**: Alert system for new filings
- **Historical Backfill**: Scan historical filings for existing entities
- **Additional Exchanges**: Support for TSX, ASX, and other exchanges

## 📝 Maintenance

### Regular Tasks

- Review and verify new filings weekly
- Update CIK mappings for new tracked companies
- Monitor scan success rates and error logs
- Update keyword lists based on filing patterns

### Database Maintenance

```sql
-- Clean up old unverified filings (optional)
DELETE FROM raw_filings 
WHERE verified = false 
AND created_at < NOW() - INTERVAL '30 days'
AND btc = 0;

-- Update entity information
UPDATE entities SET region = 'China' WHERE ticker LIKE '%.SZ';
```

## 🤝 Contributing

When adding new features:

1. Follow TypeScript best practices
2. Add proper error handling
3. Include rate limiting for external APIs
4. Update documentation
5. Test with manual scan interface

## 📄 License

This filing system is part of the HK BTC Treasuries project and follows the same license terms. 