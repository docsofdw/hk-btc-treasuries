# Supabase Migrations

## Issue Resolution

The error you encountered:
```
ERROR: 42809: "latest_snapshot" is not a view
HINT: Use DROP MATERIALIZED VIEW to remove a materialized view.
```

This happens because `latest_snapshot` is a **materialized view**, not a regular view. The migration has been fixed to use `DROP MATERIALIZED VIEW` instead.

## Deploying to Vercel/Supabase

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. **Run migrations in order:**
   - First: Copy and run `004_add_market_data.sql`
   - Then: Copy and run `005_refresh_materialized_view.sql`

### Option 2: Via Supabase CLI (Local Development)

```bash
# Start local Supabase (requires Docker)
npx supabase start

# Run migrations
npx supabase migration up
```

### Option 3: Via Supabase CLI (Production)

```bash
# Link to your project
npx supabase link --project-ref your-project-ref

# Push migrations to production
npx supabase db push
```

## Migration Files

- `001_initial_schema.sql` - Creates the base tables and entities
- `002_price_tracking.sql` - Adds price tracking functionality
- `003_refresh_function.sql` - Adds database functions
- `004_add_market_data.sql` - **Adds market cap columns and fixes materialized view**
- `005_refresh_materialized_view.sql` - **Adds auto-refresh for materialized view**

## Materialized View vs Regular View

- **Regular View**: Virtual table, always shows live data
- **Materialized View**: Cached result set, needs manual refresh for better performance

The `latest_snapshot` is a materialized view for performance reasons, so we need to:
1. Use `DROP MATERIALIZED VIEW` (not `DROP VIEW`)
2. Use `REFRESH MATERIALIZED VIEW` to update data
3. Set up triggers for automatic refresh

## Market Cap Data

After running the migrations:

1. **Automatic Sample Data**: The migration includes sample market cap data
2. **Manual Updates**: 
   ```sql
   UPDATE entities 
   SET market_cap = 1234567890, 
       market_data_updated_at = NOW() 
   WHERE ticker = 'TICKER_SYMBOL';
   
   -- Refresh the view to see changes
   REFRESH MATERIALIZED VIEW latest_snapshot;
   ```
3. **Programmatic Updates**: Use the cron job or manual script

## Troubleshooting

If you get permission errors, grant yourself the necessary permissions:
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO your_role;
```

## Notes

- The materialized view automatically refreshes when entities or holdings change (via triggers)
- Market cap is stored as DECIMAL(20, 2) to handle large numbers precisely
- The `market_data_updated_at` timestamp tracks when data was last updated 