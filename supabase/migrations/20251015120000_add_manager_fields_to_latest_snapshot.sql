-- Update latest_snapshot materialized view to include manager_profile and company_type
-- Part of Phase 2: Badge System implementation
-- NOTE: Using only columns that exist in the current entities table schema

-- Drop the existing materialized view
DROP MATERIALIZED VIEW IF EXISTS latest_snapshot;

-- Recreate materialized view with the new manager and company type fields
-- Using only columns that actually exist in entities table
CREATE MATERIALIZED VIEW latest_snapshot AS
SELECT DISTINCT ON (e.id)
  e.id,
  e.legal_name,
  e.hq,
  e.region,
  e.market_cap,
  e.shares_outstanding,
  e.market_data_updated_at,
  e.price_usd,
  e.stock_price,
  e.market_data_source,
  e.manager_profile,
  e.company_type,
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

-- Recreate unique index for the materialized view
CREATE UNIQUE INDEX idx_latest_snapshot_id ON latest_snapshot(id);

-- Refresh the materialized view to include the new data
REFRESH MATERIALIZED VIEW latest_snapshot;

-- Grant permissions for the materialized view
GRANT SELECT ON latest_snapshot TO anon, authenticated;

-- Add helpful comment
COMMENT ON MATERIALIZED VIEW latest_snapshot IS 'Latest Bitcoin holdings snapshot for each entity, including manager profile and company type classifications';

