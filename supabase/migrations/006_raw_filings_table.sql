-- Create raw_filings table for tracking regulatory filings
CREATE TABLE raw_filings (
  id BIGSERIAL PRIMARY KEY,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  btc DECIMAL(12, 4) NOT NULL DEFAULT 0,
  disclosed_at TIMESTAMPTZ NOT NULL,
  pdf_url TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('HKEX', 'SEC', 'SEDAR', 'ASX', 'manual')),
  extracted_text TEXT,
  verified BOOLEAN DEFAULT FALSE,
  filing_type TEXT CHECK (filing_type IN ('acquisition', 'disposal', 'disclosure', 'update')),
  title TEXT,
  summary TEXT,
  document_type TEXT,
  total_holdings DECIMAL(12, 4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_entity_filing UNIQUE(entity_id, pdf_url)
);

-- Create indexes for efficient queries
CREATE INDEX idx_raw_filings_disclosed_at ON raw_filings(disclosed_at DESC);
CREATE INDEX idx_raw_filings_source ON raw_filings(source);
CREATE INDEX idx_raw_filings_entity_id ON raw_filings(entity_id);
CREATE INDEX idx_raw_filings_verified ON raw_filings(verified);
CREATE INDEX idx_raw_filings_filing_type ON raw_filings(filing_type);

-- Enable Row Level Security
ALTER TABLE raw_filings ENABLE ROW LEVEL SECURITY;

-- Public read access policy
CREATE POLICY "Public can read raw_filings" ON raw_filings FOR SELECT USING (true);

-- Only authenticated users can insert/update
CREATE POLICY "Authenticated can insert raw_filings" ON raw_filings FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Authenticated can update raw_filings" ON raw_filings FOR UPDATE 
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role'); 