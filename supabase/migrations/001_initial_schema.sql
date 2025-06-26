-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Raw export data storage
CREATE TABLE raw_exports (
  id BIGSERIAL PRIMARY KEY,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'bitcointreasuries',
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entity master table
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  listing_venue TEXT NOT NULL,
  hq TEXT NOT NULL,
  region TEXT CHECK (region IN ('HK', 'China', 'ADR')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Holdings snapshots
CREATE TABLE holdings_snapshots (
  id BIGSERIAL PRIMARY KEY,
  entity_id UUID REFERENCES entities(id),
  btc DECIMAL(12, 4) NOT NULL,
  cost_basis_usd DECIMAL(15, 2),
  last_disclosed DATE NOT NULL,
  source_url TEXT NOT NULL,
  data_source TEXT CHECK (data_source IN ('export', 'filing', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price snapshots
CREATE TABLE price_snapshots (
  id BIGSERIAL PRIMARY KEY,
  btc_usd DECIMAL(10, 2) NOT NULL,
  hkd_usd DECIMAL(10, 4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_entities_ticker ON entities(ticker);
CREATE INDEX idx_holdings_entity_id ON holdings_snapshots(entity_id);
CREATE INDEX idx_holdings_created_at ON holdings_snapshots(created_at DESC);

-- Create view for latest holdings
CREATE OR REPLACE VIEW latest_holdings AS
SELECT DISTINCT ON (e.id)
  e.*,
  h.btc,
  h.cost_basis_usd,
  h.last_disclosed,
  h.source_url,
  h.data_source
FROM entities e
JOIN holdings_snapshots h ON e.id = h.entity_id
ORDER BY e.id, h.created_at DESC;

-- Row Level Security
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_exports ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can read entities" ON entities FOR SELECT USING (true);
CREATE POLICY "Public can read holdings" ON holdings_snapshots FOR SELECT USING (true);
CREATE POLICY "Public can read exports" ON raw_exports FOR SELECT USING (true); 