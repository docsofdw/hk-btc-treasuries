-- Create materialized view for recent HKEX filings
CREATE MATERIALIZED VIEW mv_recent_hkex_filings AS
SELECT
  rf.id,
  rf.title,
  rf.pdf_url,
  rf.filing_type,
  rf.btc AS btc_amount,        -- delta amount
  rf.total_holdings,           -- total after transaction
  rf.disclosed_at AS date,
  rf.verified,
  e.legal_name AS company,
  e.ticker,
  'HKEX' AS exchange           -- always HKEX for this view
FROM raw_filings rf
JOIN entities e ON e.id = rf.entity_id
WHERE rf.source = 'HKEX'
  AND rf.disclosed_at > (NOW() - INTERVAL '30 days')
ORDER BY rf.disclosed_at DESC;

-- Create index on the materialized view for faster sorting
CREATE INDEX idx_mv_recent_hkex_filings_date ON mv_recent_hkex_filings(date DESC);

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_recent_hkex_filings()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_recent_hkex_filings;
END;
$$ LANGUAGE plpgsql;

-- Grant read access to the materialized view
GRANT SELECT ON mv_recent_hkex_filings TO anon, authenticated;

-- Add btc_delta column to raw_filings if not exists
-- This will store the change amount separately from total holdings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'raw_filings' AND column_name = 'btc_delta'
  ) THEN
    ALTER TABLE raw_filings ADD COLUMN btc_delta DECIMAL(12, 4);
    
    -- Migrate existing data: use btc as delta for acquisitions/disposals
    UPDATE raw_filings 
    SET btc_delta = btc 
    WHERE filing_type IN ('acquisition', 'disposal');
    
    -- For disclosures, delta is 0 (just reporting total)
    UPDATE raw_filings 
    SET btc_delta = 0 
    WHERE filing_type = 'disclosure';
  END IF;
END $$;

-- Update the materialized view to use btc_delta
DROP MATERIALIZED VIEW IF EXISTS mv_recent_hkex_filings;

CREATE MATERIALIZED VIEW mv_recent_hkex_filings AS
SELECT
  rf.id,
  rf.title,
  rf.pdf_url,
  rf.filing_type,
  COALESCE(rf.btc_delta, rf.btc) AS btc_amount,  -- use delta if available
  rf.total_holdings,
  rf.disclosed_at AS date,
  rf.verified,
  e.legal_name AS company,
  e.ticker,
  'HKEX' AS exchange
FROM raw_filings rf
JOIN entities e ON e.id = rf.entity_id
WHERE rf.source = 'HKEX'
  AND rf.disclosed_at > (NOW() - INTERVAL '30 days')
ORDER BY rf.disclosed_at DESC;

-- Create index
CREATE INDEX idx_mv_recent_hkex_filings_date ON mv_recent_hkex_filings(date DESC);

-- Initial refresh
REFRESH MATERIALIZED VIEW mv_recent_hkex_filings; 