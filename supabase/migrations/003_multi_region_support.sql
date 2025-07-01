-- Create regions table for managing supported regions
CREATE TABLE regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  flag TEXT NOT NULL,
  currency TEXT NOT NULL,
  primary_exchange TEXT NOT NULL,
  regulatory_body TEXT NOT NULL,
  timezone TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  market_description TEXT,
  regulatory_status TEXT CHECK (regulatory_status IN ('friendly', 'neutral', 'restrictive', 'developing')) DEFAULT 'developing',
  btc_legal_status TEXT CHECK (btc_legal_status IN ('legal', 'restricted', 'unclear', 'banned')) DEFAULT 'unclear',
  corporate_adoption TEXT CHECK (corporate_adoption IN ('active', 'emerging', 'early', 'none')) DEFAULT 'none',
  is_active BOOLEAN DEFAULT false,
  launch_date DATE,
  gdp DECIMAL(10, 2), -- in USD billions
  market_cap DECIMAL(10, 2), -- in USD billions  
  population DECIMAL(6, 1), -- in millions
  seo_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update entities table to use region_id instead of region text
ALTER TABLE entities ADD COLUMN region_id TEXT REFERENCES regions(id);

-- Update existing region values to new system
UPDATE entities SET region_id = 'hong-kong' WHERE region = 'HK';
UPDATE entities SET region_id = 'mainland-china' WHERE region = 'China';

-- Add new region support columns
ALTER TABLE entities ADD COLUMN market_data_source TEXT; -- 'manual', 'api', 'exchange'
ALTER TABLE entities ADD COLUMN regulatory_notes TEXT;
ALTER TABLE entities ADD COLUMN last_regulatory_update TIMESTAMPTZ;

-- Create exchange_mappings table for handling different ticker formats
CREATE TABLE exchange_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id TEXT REFERENCES regions(id),
  exchange_code TEXT NOT NULL, -- 'HKEX', 'SGX', 'KRX', etc.
  ticker_format TEXT NOT NULL, -- e.g., 'XXXX.HK', 'XXXX', etc.
  api_endpoint TEXT,
  data_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert region data
INSERT INTO regions (id, name, short_name, flag, currency, primary_exchange, regulatory_body, timezone, slug, description, market_description, regulatory_status, btc_legal_status, corporate_adoption, is_active, gdp, market_cap, population, seo_keywords) VALUES
('hong-kong', 'Hong Kong', 'HK', '🇭🇰', 'HKD', 'HKEX', 'SFC (Securities and Futures Commission)', 'Asia/Hong_Kong', 'hong-kong', 'Asia''s leading financial hub with progressive crypto regulations', 'Hong Kong Stock Exchange (HKEX) is the world''s 4th largest stock exchange by market capitalization.', 'friendly', 'legal', 'active', true, 365.00, 4500.00, 7.5, ARRAY['Hong Kong Bitcoin', 'HKEX Bitcoin', 'HK corporate treasury', 'Asia Bitcoin adoption']),

('singapore', 'Singapore', 'SG', '🇸🇬', 'SGD', 'SGX', 'MAS (Monetary Authority of Singapore)', 'Asia/Singapore', 'singapore', 'Southeast Asia''s fintech capital with clear digital asset regulations', 'Singapore Exchange (SGX) hosts over 700 listed companies with S$900B market cap.', 'friendly', 'legal', 'emerging', false, 397.00, 900.00, 5.9, ARRAY['Singapore Bitcoin', 'SGX Bitcoin', 'MAS crypto', 'Southeast Asia Bitcoin']),

('south-korea', 'South Korea', 'KR', '🇰🇷', 'KRW', 'KRX', 'FSC (Financial Services Commission)', 'Asia/Seoul', 'south-korea', 'Major Asian economy with growing institutional crypto interest', 'Korea Exchange (KRX) is home to tech giants like Samsung and SK Group.', 'developing', 'legal', 'early', false, 1811.00, 2200.00, 51.7, ARRAY['South Korea Bitcoin', 'KRX Bitcoin', 'Korean corporate treasury', 'Samsung Bitcoin']),

('thailand', 'Thailand', 'TH', '🇹🇭', 'THB', 'SET', 'SEC Thailand', 'Asia/Bangkok', 'thailand', 'Emerging market with progressive digital asset adoption', 'Stock Exchange of Thailand (SET) represents the kingdom''s largest corporations.', 'developing', 'legal', 'early', false, 544.00, 700.00, 70.0, ARRAY['Thailand Bitcoin', 'SET Bitcoin', 'Thai corporate treasury', 'Thailand crypto']),

('japan', 'Japan', 'JP', '🇯🇵', 'JPY', 'TSE', 'JFSA (Japan Financial Services Agency)', 'Asia/Tokyo', 'japan', 'World''s 3rd largest economy with established crypto framework', 'Tokyo Stock Exchange is the world''s 3rd largest with ¥750T market cap.', 'neutral', 'legal', 'early', false, 4239.00, 6500.00, 125.0, ARRAY['Japan Bitcoin', 'TSE Bitcoin', 'Japanese corporate treasury', 'JFSA crypto']),

('mainland-china', 'Mainland China', 'CN', '🇨🇳', 'CNY', 'SSE/SZSE', 'CSRC (China Securities Regulatory Commission)', 'Asia/Shanghai', 'mainland-china', 'World''s 2nd largest economy with restrictive crypto policies', 'Shanghai and Shenzhen exchanges combine for world''s 2nd largest market.', 'restrictive', 'banned', 'none', false, 17734.00, 12000.00, 1412.0, ARRAY['China Bitcoin ban', 'CSRC crypto', 'Chinese corporate policy', 'mainland China Bitcoin']);

-- Insert exchange mappings
INSERT INTO exchange_mappings (region_id, exchange_code, ticker_format, data_source) VALUES
('hong-kong', 'HKEX', 'XXXX.HK', 'hkex_api'),
('singapore', 'SGX', 'XXXX.SI', 'sgx_api'),
('south-korea', 'KRX', 'XXXXXX.KS', 'krx_api'),
('thailand', 'SET', 'XXXX.BK', 'set_api'),
('japan', 'TSE', 'XXXX.T', 'tse_api'),
('mainland-china', 'SSE', 'XXXXXX.SS', 'manual'),
('mainland-china', 'SZSE', 'XXXXXX.SZ', 'manual');

-- Create indexes for new columns
CREATE INDEX idx_entities_region_id ON entities(region_id);
CREATE INDEX idx_regions_slug ON regions(slug);
CREATE INDEX idx_regions_is_active ON regions(is_active);
CREATE INDEX idx_exchange_mappings_region ON exchange_mappings(region_id);

-- Update views to include region data
DROP VIEW IF EXISTS latest_holdings;
CREATE OR REPLACE VIEW latest_holdings AS
SELECT DISTINCT ON (e.id)
  e.id,
  e.legal_name,
  e.ticker,
  e.listing_venue,
  e.hq,
  e.region, -- keep old region for compatibility
  e.region_id,
  r.name as region_name,
  r.flag as region_flag,
  r.short_name as region_short_name,
  e.pipeline_stage,
  e.stage_updated_at,
  e.estimated_btc,
  e.confidence_level,
  e.created_at,
  e.updated_at,
  COALESCE(h.btc, 0) as btc,
  h.cost_basis_usd,
  h.last_disclosed,
  h.source_url,
  h.data_source
FROM entities e
LEFT JOIN regions r ON e.region_id = r.id
LEFT JOIN holdings_snapshots h ON e.id = h.entity_id
ORDER BY e.id, h.created_at DESC;

-- Create view for regional analytics
CREATE OR REPLACE VIEW regional_analytics AS
SELECT 
  r.id as region_id,
  r.name as region_name,
  r.flag as region_flag,
  r.is_active,
  r.regulatory_status,
  r.corporate_adoption,
  COUNT(e.id) as total_entities,
  COUNT(e.id) FILTER (WHERE h.btc > 0) as entities_with_btc,
  COALESCE(SUM(h.btc), 0) as total_btc,
  COALESCE(AVG(h.btc) FILTER (WHERE h.btc > 0), 0) as avg_btc_per_company,
  COUNT(e.id) FILTER (WHERE e.pipeline_stage IS NOT NULL) as pipeline_entities,
  r.gdp,
  r.market_cap,
  r.population
FROM regions r
LEFT JOIN entities e ON r.id = e.region_id
LEFT JOIN LATERAL (
  SELECT btc, cost_basis_usd, last_disclosed, source_url, data_source
  FROM holdings_snapshots
  WHERE entity_id = e.id
  ORDER BY created_at DESC
  LIMIT 1
) h ON true
GROUP BY r.id, r.name, r.flag, r.is_active, r.regulatory_status, r.corporate_adoption, r.gdp, r.market_cap, r.population
ORDER BY r.is_active DESC, total_btc DESC;

-- Enable RLS for new tables
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_mappings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can read regions" ON regions FOR SELECT USING (true);
CREATE POLICY "Public can read exchange mappings" ON exchange_mappings FOR SELECT USING (true);