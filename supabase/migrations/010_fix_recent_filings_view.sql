-- Fix the materialized view to handle future dates and broader time window
DROP MATERIALIZED VIEW IF EXISTS mv_recent_hkex_filings;

CREATE MATERIALIZED VIEW mv_recent_hkex_filings AS
SELECT
  rf.id,
  rf.title,
  rf.pdf_url,
  rf.filing_type,
  COALESCE(rf.btc_delta, rf.btc) AS btc_amount,
  rf.total_holdings,
  rf.disclosed_at AS date,
  rf.verified,
  e.legal_name AS company,
  e.ticker,
  'HKEX' AS exchange
FROM raw_filings rf
JOIN entities e ON e.id = rf.entity_id
WHERE rf.source = 'HKEX'
  AND rf.disclosed_at > (NOW() - INTERVAL '6 months')  -- Broader window for testing
  AND rf.disclosed_at < (NOW() + INTERVAL '1 year')    -- Include future dates
ORDER BY rf.disclosed_at DESC;

-- Create index
CREATE INDEX idx_mv_recent_hkex_filings_date ON mv_recent_hkex_filings(date DESC);

-- Initial refresh
REFRESH MATERIALIZED VIEW mv_recent_hkex_filings;

-- Grant permissions
GRANT SELECT ON mv_recent_hkex_filings TO anon, authenticated; 