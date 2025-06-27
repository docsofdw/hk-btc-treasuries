-- Add delta tracking columns to raw_filings table
ALTER TABLE raw_filings
ADD COLUMN IF NOT EXISTS btc_delta DECIMAL(12, 4),
ADD COLUMN IF NOT EXISTS btc_total DECIMAL(12, 4),
ADD COLUMN IF NOT EXISTS detected_in TEXT CHECK (detected_in IN ('title', 'body', 'manual')),
ADD COLUMN IF NOT EXISTS market_data_updated_at TIMESTAMPTZ;

-- Update existing records to set detected_in
UPDATE raw_filings 
SET detected_in = 'title' 
WHERE detected_in IS NULL;

-- Add market data columns to entities table
ALTER TABLE entities
ADD COLUMN IF NOT EXISTS market_cap DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS shares_outstanding BIGINT,
ADD COLUMN IF NOT EXISTS market_data_updated_at TIMESTAMPTZ;

-- Create a materialized view for current holdings using delta tracking
CREATE MATERIALIZED VIEW IF NOT EXISTS entity_btc_holdings AS
WITH latest_filings AS (
  SELECT DISTINCT ON (entity_id)
    entity_id,
    disclosed_at,
    btc_total,
    verified,
    created_at
  FROM raw_filings
  WHERE (verified = true OR detected_in = 'body')
    AND btc_total IS NOT NULL
  ORDER BY entity_id, disclosed_at DESC, created_at DESC
),
entity_stats AS (
  SELECT 
    entity_id,
    COUNT(*) as total_filings,
    COUNT(*) FILTER (WHERE verified = true) as verified_filings,
    MAX(disclosed_at) as last_disclosed
  FROM raw_filings
  WHERE (verified = true OR detected_in = 'body')
    AND (btc_delta IS NOT NULL OR btc_total IS NOT NULL)
  GROUP BY entity_id
)
SELECT 
  e.id as entity_id,
  e.legal_name,
  e.ticker,
  e.listing_venue,
  e.region,
  COALESCE(lf.btc_total, 0) as current_btc_holdings,
  es.last_disclosed,
  es.total_filings,
  es.verified_filings,
  e.market_cap,
  e.price_usd,
  e.market_data_updated_at
FROM entities e
LEFT JOIN latest_filings lf ON e.id = lf.entity_id
LEFT JOIN entity_stats es ON e.id = es.entity_id;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_btc_holdings_entity_id 
  ON entity_btc_holdings(entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_btc_holdings_ticker 
  ON entity_btc_holdings(ticker);

CREATE INDEX IF NOT EXISTS idx_entity_btc_holdings_btc 
  ON entity_btc_holdings(current_btc_holdings DESC);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_entity_holdings()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY entity_btc_holdings;
END;
$$ LANGUAGE plpgsql;

-- Create function for advisory locks (for crawler concurrency)
CREATE OR REPLACE FUNCTION try_advisory_lock(lock_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN pg_try_advisory_lock(hashtext(lock_name)::bigint);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_advisory_lock(lock_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN pg_advisory_unlock(hashtext(lock_name)::bigint);
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance (P2 requirement)
CREATE INDEX IF NOT EXISTS idx_raw_filings_entity_disclosed 
  ON raw_filings(entity_id, disclosed_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_raw_filings_source 
  ON raw_filings(source);
  
CREATE INDEX IF NOT EXISTS idx_raw_filings_verified 
  ON raw_filings(verified) WHERE verified = true;

CREATE INDEX IF NOT EXISTS idx_raw_filings_detected_in 
  ON raw_filings(detected_in);

CREATE INDEX IF NOT EXISTS idx_entities_ticker 
  ON entities(ticker);

CREATE INDEX IF NOT EXISTS idx_entities_listing_venue 
  ON entities(listing_venue);

-- Create a view for data quality monitoring
CREATE OR REPLACE VIEW data_quality_report AS
SELECT 
  'raw_filings' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE verified = true) as verified_records,
  COUNT(*) FILTER (WHERE detected_in = 'body') as parsed_records,
  COUNT(*) FILTER (WHERE detected_in = 'title') as title_only_records,
  COUNT(*) FILTER (WHERE btc_delta IS NOT NULL) as records_with_delta,
  COUNT(*) FILTER (WHERE btc_total IS NOT NULL) as records_with_total,
  AVG(EXTRACT(epoch FROM (NOW() - created_at)) / 86400) as avg_age_days
FROM raw_filings

UNION ALL

SELECT 
  'entities' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE market_cap IS NOT NULL) as verified_records,
  COUNT(*) FILTER (WHERE market_data_updated_at > NOW() - INTERVAL '48 hours') as parsed_records,
  0 as title_only_records,
  0 as records_with_delta,
  0 as records_with_total,
  AVG(EXTRACT(epoch FROM (NOW() - COALESCE(market_data_updated_at, created_at))) / 86400) as avg_age_days
FROM entities;

-- Add RLS policies for new columns
ALTER TABLE raw_filings ENABLE ROW LEVEL SECURITY;

-- Update existing policies to handle new columns
DROP POLICY IF EXISTS "Public can read raw_filings" ON raw_filings;
CREATE POLICY "Public can read raw_filings" ON raw_filings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert raw_filings" ON raw_filings;
CREATE POLICY "Authenticated can insert raw_filings" ON raw_filings FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated can update raw_filings" ON raw_filings;
CREATE POLICY "Authenticated can update raw_filings" ON raw_filings FOR UPDATE 
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Analyze tables for query planner
ANALYZE raw_filings;
ANALYZE entities; 