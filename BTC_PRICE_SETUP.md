# Bitcoin Price Fetching Setup

## Overview

Robust BTC price fetching system with waterfall fallback pattern:
1. **CoinGecko** (Primary) - Free tier, 30 calls/min, very reliable
2. **CoinCap** (Fallback) - Free unlimited, good reliability  
3. **Cached** (Emergency) - Last known price from database

## Architecture

### Cron Job: `/app/api/cron/fetch-prices/route.ts`
- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Timeout**: 10 seconds
- **Security**: Bearer token auth using `CRON_SECRET` env var

### Database: `price_snapshots` table
```sql
CREATE TABLE price_snapshots (
  id BIGSERIAL PRIMARY KEY,
  btc_usd DECIMAL(10, 2) NOT NULL,
  hkd_usd DECIMAL(10, 4) NOT NULL,
  source TEXT CHECK (source IN ('coingecko', 'coincap', 'cached', 'unknown')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Health Checks: `/api/health`
Monitors both APIs:
- ✅ **CoinGecko**: `https://api.coingecko.com/api/v3/ping`
- ✅ **CoinCap**: `https://api.coincap.io/v2/assets/bitcoin`

## Deployment

### 1. Apply Database Migration
```bash
# Production (via Supabase Dashboard or CLI)
npx supabase db push

# Or manually run: supabase/migrations/013_add_price_source.sql
```

### 2. Set Environment Variable (Optional)
For production security, add to Vercel:
```bash
CRON_SECRET=your-random-secret-here
```

### 3. Deploy to Vercel
```bash
git add .
git commit -m "feat: implement robust BTC price fetching with CoinGecko + CoinCap fallback"
git push
```

The cron job will automatically start running every 5 minutes.

## Testing

### Manual Test (Development)
```bash
# Start dev server
npm run dev

# Trigger price fetch
curl -X POST http://localhost:3000/api/cron/fetch-prices
```

### Production Test
```bash
# Trigger via cron (requires CRON_SECRET)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://yourdomain.com/api/cron/fetch-prices
```

### Check Health
```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": [
    {
      "service": "database",
      "status": "healthy",
      "latency": 45
    },
    {
      "service": "api:coingecko",
      "status": "healthy",
      "latency": 367
    },
    {
      "service": "api:coincap",
      "status": "healthy",
      "latency": 142
    }
  ]
}
```

## Monitoring

### View Price History
```sql
SELECT 
  btc_usd,
  source,
  created_at
FROM price_snapshots
ORDER BY created_at DESC
LIMIT 10;
```

### Check Source Distribution
```sql
SELECT 
  source,
  COUNT(*) as count,
  AVG(btc_usd) as avg_price,
  MAX(created_at) as last_fetch
FROM price_snapshots
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY count DESC;
```

### Alert on Fallback Usage
If you see many `cached` or `coincap` entries, investigate:
```sql
SELECT 
  source,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM price_snapshots
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY source;
```

Should see ~95%+ from `coingecko`.

## API Endpoints

### GET `/api/cron/fetch-prices`
Fetches and stores current BTC price.

**Response:**
```json
{
  "success": true,
  "price": 107038.50,
  "source": "coingecko",
  "timestamp": "2025-10-14T12:00:00.000Z",
  "duration": 367
}
```

### GET `/api/v1/holdings`
Returns treasury data with latest BTC price.

**Response:**
```json
{
  "btcPrice": 107038.50,
  "pricedAt": "2025-10-14T12:00:00.000Z",
  "entities": [...]
}
```

## Troubleshooting

### Issue: "No price source available"
**Cause**: All APIs failed and no cached price exists
**Solution**: 
1. Check health endpoint: `/api/health`
2. Verify network connectivity
3. Check API status pages:
   - https://status.coingecko.com
   - https://status.coincap.io

### Issue: High latency (>2s)
**Cause**: API slowness or network issues
**Solution**:
1. Check health endpoint for degraded status
2. Verify timeout settings (currently 5s)
3. Consider adding more fallback sources

### Issue: Stale prices
**Cause**: Cron job not running
**Solution**:
1. Check Vercel cron logs
2. Verify `CRON_SECRET` is set correctly
3. Manually trigger: `POST /api/cron/fetch-prices`

## Rate Limits

| API | Free Tier | Notes |
|-----|-----------|-------|
| CoinGecko | 30 calls/min | ~10-50 calls/day with Demo API |
| CoinCap | Unlimited | Very reliable |

Running every 5 minutes = **~288 calls/day**, well within limits for both APIs.

## Future Enhancements

1. **Dynamic HKD/USD Rate**: Currently hardcoded at 0.128
2. **Multiple Cryptocurrencies**: Extend to ETH, etc.
3. **Price Alerts**: Notify on significant price changes
4. **Historical Analytics**: Price trends, volatility metrics
5. **Fallback Priority Config**: Make fallback order configurable

## Files Changed

- ✅ `/app/api/cron/fetch-prices/route.ts` - Main cron job
- ✅ `/supabase/migrations/013_add_price_source.sql` - Database migration
- ✅ `/lib/services/monitoring.ts` - Updated health checks
- ✅ `/vercel.json` - Cron schedule configuration
- ✅ `BTC_PRICE_SETUP.md` - This documentation

