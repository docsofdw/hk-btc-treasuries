# Update Market Data Edge Function

This Supabase Edge Function fetches market data from Yahoo Finance and updates entity information in the database.

## Features

- Fetches market cap, shares outstanding, and current price data
- Supports Hong Kong (.HK) and Chinese (.SZ) stock exchanges
- Includes rate limiting to respect API limits
- Fallback to Alpha Vantage API (requires API key)
- Automatic materialized view refresh after updates

## Deployment

### Via Supabase CLI

```bash
# Deploy the function
supabase functions deploy update-market-data

# Test the function
supabase functions invoke update-market-data
```

### Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Create new function named `update-market-data`
4. Copy and paste the code from `index.ts`
5. Deploy the function

## Environment Variables

The function requires these environment variables to be set in Supabase:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access
- `ALPHA_VANTAGE_API_KEY` (optional) - For fallback API

## API Response

```json
{
  "success": true,
  "updated": 5,
  "failed": 1,
  "results": [
    {
      "ticker": "1357.HK",
      "success": true,
      "marketCap": 1234567890
    },
    {
      "ticker": "INVALID",
      "success": false,
      "error": "No data available"
    }
  ]
}
```

## Rate Limiting

The function includes a 1-second delay between API calls to Yahoo Finance to avoid rate limiting. For production use with many entities, consider:

- Using a paid API service
- Implementing more sophisticated rate limiting
- Batching updates across multiple function calls

## Supported Stock Exchanges

- Hong Kong Stock Exchange (.HK)
- Shenzhen Stock Exchange (.SZ)
- US exchanges (NASDAQ, NYSE)
- Other Yahoo Finance supported markets

## Error Handling

The function gracefully handles:
- API timeouts and errors
- Invalid ticker symbols
- Missing market data
- Database update failures

Failed updates are logged but don't stop the entire process. 