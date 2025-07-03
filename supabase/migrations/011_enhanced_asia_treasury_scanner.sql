-- Migration: Enhanced Asia Treasury Scanner Improvements
-- This migration adds helper functions and indexes for the Asia-Pacific Bitcoin Treasury Scanner

-- Add indexes for better performance on raw_filings table
CREATE INDEX IF NOT EXISTS idx_raw_filings_ticker_date ON raw_filings(entity_id, disclosed_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_filings_source_type ON raw_filings(source, filing_type);
CREATE INDEX IF NOT EXISTS idx_raw_filings_btc_amount ON raw_filings(btc) WHERE btc > 0;

-- Add indexes for entities table
CREATE INDEX IF NOT EXISTS idx_entities_listing_venue ON entities(listing_venue);
CREATE INDEX IF NOT EXISTS idx_entities_region_ticker ON entities(region, ticker);
CREATE INDEX IF NOT EXISTS idx_entities_pipeline_stage ON entities(pipeline_stage);

-- Function to check for duplicate filings within a time window
CREATE OR REPLACE FUNCTION check_duplicate_filing(
  p_entity_id UUID,
  p_date TIMESTAMP WITH TIME ZONE,
  p_window_days INTEGER DEFAULT 7
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM raw_filings 
    WHERE entity_id = p_entity_id 
    AND disclosed_at >= p_date - INTERVAL '1 day' * p_window_days
    AND disclosed_at <= p_date + INTERVAL '1 day' * p_window_days
  );
END;
$$ LANGUAGE plpgsql;

-- Function to find entity by ticker with fuzzy matching
CREATE OR REPLACE FUNCTION find_entity_by_ticker(
  p_ticker TEXT
) RETURNS TABLE(
  entity_id UUID,
  legal_name TEXT,
  ticker TEXT,
  listing_venue TEXT,
  confidence FLOAT
) AS $$
BEGIN
  -- First try exact match
  RETURN QUERY
  SELECT e.id, e.legal_name, e.ticker, e.listing_venue, 1.0 as confidence
  FROM entities e
  WHERE e.ticker = p_ticker;
  
  -- If no exact match, try case-insensitive
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT e.id, e.legal_name, e.ticker, e.listing_venue, 0.9 as confidence
    FROM entities e
    WHERE UPPER(e.ticker) = UPPER(p_ticker);
  END IF;
  
  -- If still no match, try without exchange suffix
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT e.id, e.legal_name, e.ticker, e.listing_venue, 0.8 as confidence
    FROM entities e
    WHERE split_part(UPPER(e.ticker), '.', 1) = split_part(UPPER(p_ticker), '.', 1);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to normalize ticker symbols for Asian exchanges
CREATE OR REPLACE FUNCTION normalize_asian_ticker(
  p_ticker TEXT
) RETURNS TEXT AS $$
DECLARE
  normalized_ticker TEXT;
BEGIN
  -- Remove whitespace and convert to uppercase
  normalized_ticker := UPPER(TRIM(p_ticker));
  
  -- Handle Hong Kong stocks (4-digit numbers)
  IF normalized_ticker ~ '^\d{4}$' THEN
    RETURN normalized_ticker || '.HK';
  END IF;
  
  -- Handle Chinese stocks (6-digit numbers)
  IF normalized_ticker ~ '^\d{6}$' THEN
    -- Default to Shenzhen if no exchange specified
    RETURN normalized_ticker || '.SZ';
  END IF;
  
  -- Handle other common patterns
  IF normalized_ticker ~ '^\d{4}\.HK$' THEN
    RETURN normalized_ticker;
  END IF;
  
  IF normalized_ticker ~ '^\d{6}\.(SZ|SS)$' THEN
    RETURN normalized_ticker;
  END IF;
  
  -- Return as-is if already has proper exchange suffix
  IF normalized_ticker ~ '\.(HK|SZ|SS|T|KS|SI|AX)$' THEN
    RETURN normalized_ticker;
  END IF;
  
  RETURN normalized_ticker;
END;
$$ LANGUAGE plpgsql;

-- Function to get exchange code from ticker
CREATE OR REPLACE FUNCTION get_exchange_from_ticker(
  p_ticker TEXT
) RETURNS TEXT AS $$
BEGIN
  IF p_ticker ~ '\.HK$' THEN RETURN 'HKEX'; END IF;
  IF p_ticker ~ '\.SZ$' THEN RETURN 'SZSE'; END IF;
  IF p_ticker ~ '\.(SH|SS)$' THEN RETURN 'SSE'; END IF;
  IF p_ticker ~ '\.T$' THEN RETURN 'TSE'; END IF;
  IF p_ticker ~ '\.KS$' THEN RETURN 'KOSPI'; END IF;
  IF p_ticker ~ '\.SI$' THEN RETURN 'SGX'; END IF;
  IF p_ticker ~ '\.AX$' THEN RETURN 'ASX'; END IF;
  
  RETURN 'UNKNOWN';
END;
$$ LANGUAGE plpgsql;

-- Function to insert or update entity with enhanced data
CREATE OR REPLACE FUNCTION upsert_entity_with_btc(
  p_ticker TEXT,
  p_legal_name TEXT,
  p_btc FLOAT,
  p_cost_basis_usd FLOAT DEFAULT NULL,
  p_source_url TEXT DEFAULT NULL,
  p_disclosed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_confidence INTEGER DEFAULT 80,
  p_region TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  entity_uuid UUID;
  normalized_ticker TEXT;
  exchange_code TEXT;
  entity_region TEXT;
BEGIN
  -- Normalize the ticker
  normalized_ticker := normalize_asian_ticker(p_ticker);
  exchange_code := get_exchange_from_ticker(normalized_ticker);
  
  -- Determine region based on exchange if not provided
  IF p_region IS NULL THEN
    entity_region := CASE 
      WHEN exchange_code IN ('HKEX') THEN 'hong-kong'
      WHEN exchange_code IN ('SZSE', 'SSE') THEN 'china'
      WHEN exchange_code = 'TSE' THEN 'japan'
      WHEN exchange_code = 'KOSPI' THEN 'korea'
      WHEN exchange_code = 'SGX' THEN 'singapore'
      WHEN exchange_code = 'ASX' THEN 'australia'
      ELSE 'other'
    END;
  ELSE
    entity_region := p_region;
  END IF;
  
  -- Try to find existing entity
  SELECT id INTO entity_uuid 
  FROM entities 
  WHERE ticker = normalized_ticker;
  
  -- Insert or update entity
  IF entity_uuid IS NULL THEN
    INSERT INTO entities (
      legal_name, 
      ticker, 
      listing_venue, 
      region,
      pipeline_stage,
      estimated_btc,
      confidence_level,
      created_at,
      updated_at
    ) VALUES (
      p_legal_name,
      normalized_ticker,
      exchange_code,
      entity_region,
      'filing',
      p_btc,
      p_confidence,
      NOW(),
      NOW()
    ) RETURNING id INTO entity_uuid;
  ELSE
    UPDATE entities SET
      legal_name = COALESCE(p_legal_name, legal_name),
      listing_venue = COALESCE(exchange_code, listing_venue),
      region = COALESCE(entity_region, region),
      estimated_btc = GREATEST(COALESCE(estimated_btc, 0), p_btc),
      confidence_level = GREATEST(COALESCE(confidence_level, 0), p_confidence),
      updated_at = NOW()
    WHERE id = entity_uuid;
  END IF;
  
  -- Add raw filing record
  INSERT INTO raw_filings (
    entity_id,
    btc,
    total_holdings,
    disclosed_at,
    pdf_url,
    source,
    filing_type,
    verified,
    created_at
  ) VALUES (
    entity_uuid,
    p_btc,
    p_btc, -- Assuming this is total holdings for new discoveries
    p_disclosed_at,
    p_source_url,
    'dynamic_scanner',
    'disclosure',
    false, -- Needs manual verification
    NOW()
  );
  
  RETURN entity_uuid;
END;
$$ LANGUAGE plpgsql;

-- Enhanced materialized view for Asian Bitcoin treasury holdings
DROP MATERIALIZED VIEW IF EXISTS mv_asia_bitcoin_treasuries;
CREATE MATERIALIZED VIEW mv_asia_bitcoin_treasuries AS
SELECT 
  e.id,
  e.legal_name,
  e.ticker,
  e.listing_venue,
  e.region,
  e.pipeline_stage,
  e.estimated_btc,
  e.confidence_level,
  rf.btc as latest_filing_btc,
  rf.disclosed_at as latest_disclosure,
  rf.pdf_url as latest_source,
  rf.source as data_source,
  CASE 
    WHEN e.listing_venue IN ('HKEX', 'SZSE', 'SSE', 'TSE', 'KOSPI', 'SGX', 'ASX') THEN true
    ELSE false
  END as is_asia_pacific,
  CASE 
    WHEN e.estimated_btc > 0 AND e.confidence_level >= 80 THEN 'high'
    WHEN e.estimated_btc > 0 AND e.confidence_level >= 60 THEN 'medium'
    WHEN e.estimated_btc > 0 THEN 'low'
    ELSE 'none'
  END as holding_confidence,
  CURRENT_TIMESTAMP as last_updated
FROM entities e
LEFT JOIN LATERAL (
  SELECT btc, disclosed_at, pdf_url, source
  FROM raw_filings rf2
  WHERE rf2.entity_id = e.id
  ORDER BY rf2.disclosed_at DESC
  LIMIT 1
) rf ON true
WHERE e.region IN ('hong-kong', 'china', 'japan', 'korea', 'singapore', 'australia')
ORDER BY e.estimated_btc DESC NULLS LAST;

-- Create unique index for the materialized view
CREATE UNIQUE INDEX mv_asia_bitcoin_treasuries_id_idx ON mv_asia_bitcoin_treasuries(id);

-- Function to refresh the Asia Bitcoin treasuries materialized view
CREATE OR REPLACE FUNCTION refresh_asia_treasuries_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_asia_bitcoin_treasuries;
END;
$$ LANGUAGE plpgsql;

-- Add a trigger to automatically refresh the view when entities or raw_filings are updated
CREATE OR REPLACE FUNCTION trigger_refresh_asia_treasuries()
RETURNS trigger AS $$
BEGIN
  -- Only refresh if the change affects Asia-Pacific companies
  IF TG_TABLE_NAME = 'entities' THEN
    IF NEW.region IN ('hong-kong', 'china', 'japan', 'korea', 'singapore', 'australia') THEN
      PERFORM refresh_asia_treasuries_view();
    END IF;
  ELSIF TG_TABLE_NAME = 'raw_filings' THEN
    -- Check if the filing is for an Asia-Pacific company
    IF EXISTS (
      SELECT 1 FROM entities e 
      WHERE e.id = NEW.entity_id 
      AND e.region IN ('hong-kong', 'china', 'japan', 'korea', 'singapore', 'australia')
    ) THEN
      PERFORM refresh_asia_treasuries_view();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (only if they don't exist)
DROP TRIGGER IF EXISTS trigger_entities_refresh_asia_treasuries ON entities;
CREATE TRIGGER trigger_entities_refresh_asia_treasuries
  AFTER INSERT OR UPDATE ON entities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_asia_treasuries();

DROP TRIGGER IF EXISTS trigger_raw_filings_refresh_asia_treasuries ON raw_filings;
CREATE TRIGGER trigger_raw_filings_refresh_asia_treasuries
  AFTER INSERT OR UPDATE ON raw_filings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_asia_treasuries();

-- View for monitoring scanner performance
CREATE OR REPLACE VIEW scanner_performance_stats AS
SELECT 
  DATE(created_at) as scan_date,
  source,
  COUNT(*) as filings_processed,
  COUNT(DISTINCT entity_id) as unique_companies,
  SUM(btc) as total_btc_discovered,
  AVG(btc) as avg_btc_per_filing,
  COUNT(*) FILTER (WHERE verified = true) as verified_filings,
  COUNT(*) FILTER (WHERE verified = false) as unverified_filings
FROM raw_filings
WHERE source = 'dynamic_scanner'
AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), source
ORDER BY scan_date DESC;

-- Indexes for performance monitoring
CREATE INDEX IF NOT EXISTS idx_raw_filings_created_at ON raw_filings(created_at);
CREATE INDEX IF NOT EXISTS idx_raw_filings_verified ON raw_filings(verified);

-- Function to get duplicate detection statistics
CREATE OR REPLACE FUNCTION get_duplicate_stats(
  days_back INTEGER DEFAULT 7
) RETURNS TABLE(
  potential_duplicates INTEGER,
  unique_entities INTEGER,
  total_filings INTEGER,
  duplicate_rate FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH filing_groups AS (
    SELECT 
      entity_id,
      DATE(disclosed_at) as filing_date,
      COUNT(*) as filing_count
    FROM raw_filings
    WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    GROUP BY entity_id, DATE(disclosed_at)
    HAVING COUNT(*) > 1
  ),
  stats AS (
    SELECT 
      SUM(filing_count - 1) as dup_count,
      COUNT(DISTINCT entity_id) as unique_ent,
      (SELECT COUNT(*) FROM raw_filings WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back) as total_fil
    FROM filing_groups
  )
  SELECT 
    dup_count::INTEGER,
    unique_ent::INTEGER,
    total_fil::INTEGER,
    (dup_count::FLOAT / NULLIF(total_fil, 0) * 100)::FLOAT
  FROM stats;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON mv_asia_bitcoin_treasuries TO authenticated;
GRANT SELECT ON scanner_performance_stats TO authenticated;
GRANT EXECUTE ON FUNCTION check_duplicate_filing TO authenticated;
GRANT EXECUTE ON FUNCTION find_entity_by_ticker TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_asian_ticker TO authenticated;
GRANT EXECUTE ON FUNCTION get_exchange_from_ticker TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_entity_with_btc TO authenticated;
GRANT EXECUTE ON FUNCTION get_duplicate_stats TO authenticated;

-- Comment on functions for documentation
COMMENT ON FUNCTION check_duplicate_filing IS 'Checks if a filing for the same entity exists within a specified time window';
COMMENT ON FUNCTION find_entity_by_ticker IS 'Finds entities by ticker symbol with fuzzy matching for Asian exchanges';
COMMENT ON FUNCTION normalize_asian_ticker IS 'Normalizes ticker symbols for Asian stock exchanges (HK, China, Japan, Korea, Singapore, Australia)';
COMMENT ON FUNCTION get_exchange_from_ticker IS 'Extracts the exchange code from a ticker symbol';
COMMENT ON FUNCTION upsert_entity_with_btc IS 'Inserts or updates an entity with Bitcoin holdings data from the dynamic scanner';
COMMENT ON FUNCTION get_duplicate_stats IS 'Returns statistics about potential duplicate filings';
COMMENT ON MATERIALIZED VIEW mv_asia_bitcoin_treasuries IS 'Materialized view of all Asia-Pacific companies with Bitcoin holdings';
COMMENT ON VIEW scanner_performance_stats IS 'Performance statistics for the dynamic scanner';