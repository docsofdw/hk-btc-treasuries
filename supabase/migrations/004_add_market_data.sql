-- Add market data columns to entities table
ALTER TABLE entities 
ADD COLUMN IF NOT EXISTS market_cap DECIMAL(20, 2),
ADD COLUMN IF NOT EXISTS shares_outstanding DECIMAL(20, 4),
ADD COLUMN IF NOT EXISTS market_data_updated_at TIMESTAMPTZ;

-- Create index for market data updates
CREATE INDEX IF NOT EXISTS idx_entities_market_data_updated ON entities(market_data_updated_at);

-- Drop the existing materialized view (not regular view)
DROP MATERIALIZED VIEW IF EXISTS latest_snapshot;

-- Recreate as a materialized view with market data columns
CREATE MATERIALIZED VIEW latest_snapshot AS
SELECT DISTINCT ON (e.id)
  e.id,
  e.legal_name,
  e.ticker,
  e.listing_venue,
  e.hq,
  e.region,
  e.market_cap,
  e.shares_outstanding,
  e.created_at,
  e.updated_at,
  h.btc,
  h.cost_basis_usd,
  h.last_disclosed,
  h.source_url,
  h.data_source as data_quality,
  CASE 
    WHEN h.data_source = 'filing' THEN true
    ELSE false
  END as verified
FROM entities e
LEFT JOIN holdings_snapshots h ON e.id = h.entity_id
ORDER BY e.id, h.created_at DESC;

-- Create unique index for the materialized view
CREATE UNIQUE INDEX idx_latest_snapshot_id ON latest_snapshot(id);

-- Update some sample market cap data (you can remove this section if you don't want sample data)
UPDATE entities SET 
  market_cap = 282687358,
  market_data_updated_at = NOW()
WHERE ticker = '0434.HK';

UPDATE entities SET 
  market_cap = 100615720,
  market_data_updated_at = NOW()
WHERE ticker = '1357.HK';

UPDATE entities SET 
  market_cap = 9847496,
  market_data_updated_at = NOW()
WHERE ticker = 'NCTY';

UPDATE entities SET 
  market_cap = 4281520,
  market_data_updated_at = NOW()
WHERE ticker = '3000058.SZ';

UPDATE entities SET 
  market_cap = 2870759,
  market_data_updated_at = NOW()
WHERE ticker = '1723.HK';

-- Refresh the materialized view to include the new data
REFRESH MATERIALIZED VIEW latest_snapshot;

-- Grant permissions for the materialized view
GRANT SELECT ON latest_snapshot TO anon, authenticated; 