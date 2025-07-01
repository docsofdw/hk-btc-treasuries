-- Add pipeline stage columns to entities table
ALTER TABLE entities ADD COLUMN pipeline_stage TEXT CHECK (pipeline_stage IN ('rumoured', 'board_vote', 'filing', 'verified'));
ALTER TABLE entities ADD COLUMN stage_updated_at TIMESTAMPTZ;
ALTER TABLE entities ADD COLUMN estimated_btc DECIMAL(12, 4);
ALTER TABLE entities ADD COLUMN confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high'));

-- Update existing verified holdings to have pipeline_stage = 'verified'
UPDATE entities 
SET pipeline_stage = 'verified', 
    stage_updated_at = updated_at
WHERE id IN (
  SELECT DISTINCT entity_id 
  FROM holdings_snapshots 
  WHERE btc > 0
);

-- Create pipeline_events table for tracking stage transitions
CREATE TABLE pipeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL CHECK (to_stage IN ('rumoured', 'board_vote', 'filing', 'verified')),
  event_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  source_url TEXT,
  confidence_change TEXT CHECK (confidence_change IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for pipeline queries
CREATE INDEX idx_entities_pipeline_stage ON entities(pipeline_stage);
CREATE INDEX idx_pipeline_events_entity_id ON pipeline_events(entity_id);
CREATE INDEX idx_pipeline_events_date ON pipeline_events(event_date DESC);

-- Create view for pipeline prospects (non-verified entities)
CREATE OR REPLACE VIEW pipeline_prospects AS
SELECT 
  e.*,
  pe.event_date as last_stage_change,
  pe.notes as stage_notes
FROM entities e
LEFT JOIN LATERAL (
  SELECT event_date, notes
  FROM pipeline_events
  WHERE entity_id = e.id
  ORDER BY event_date DESC
  LIMIT 1
) pe ON true
WHERE e.pipeline_stage IS NOT NULL 
  AND e.pipeline_stage != 'verified';

-- Create view for pipeline analytics
CREATE OR REPLACE VIEW pipeline_analytics AS
SELECT 
  pipeline_stage,
  COUNT(*) as entity_count,
  COALESCE(SUM(estimated_btc), 0) as total_estimated_btc,
  AVG(CASE 
    WHEN confidence_level = 'low' THEN 1
    WHEN confidence_level = 'medium' THEN 2
    WHEN confidence_level = 'high' THEN 3
    ELSE NULL
  END) as avg_confidence_score,
  COUNT(*) FILTER (WHERE confidence_level = 'high') as high_confidence_count,
  MIN(stage_updated_at) as oldest_in_stage,
  MAX(stage_updated_at) as newest_in_stage
FROM entities
WHERE pipeline_stage IS NOT NULL
GROUP BY pipeline_stage
ORDER BY 
  CASE pipeline_stage
    WHEN 'rumoured' THEN 1
    WHEN 'board_vote' THEN 2
    WHEN 'filing' THEN 3
    WHEN 'verified' THEN 4
  END;

-- Update latest_holdings view to include pipeline data
DROP VIEW IF EXISTS latest_holdings;
CREATE OR REPLACE VIEW latest_holdings AS
SELECT DISTINCT ON (e.id)
  e.id,
  e.legal_name,
  e.ticker,
  e.listing_venue,
  e.hq,
  e.region,
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
LEFT JOIN holdings_snapshots h ON e.id = h.entity_id
ORDER BY e.id, h.created_at DESC;

-- Enable RLS for new tables
ALTER TABLE pipeline_events ENABLE ROW LEVEL SECURITY;

-- Public read access for pipeline events
CREATE POLICY "Public can read pipeline events" ON pipeline_events FOR SELECT USING (true);

-- Insert sample pipeline data for demonstration
INSERT INTO entities (legal_name, ticker, listing_venue, hq, region, pipeline_stage, stage_updated_at, estimated_btc, confidence_level) VALUES
('Sino Group', 'SINO.HK', 'HKEX', 'Hong Kong', 'HK', 'rumoured', NOW() - INTERVAL '2 weeks', 500.0, 'medium'),
('China Resources Land', '1109.HK', 'HKEX', 'Hong Kong', 'HK', 'board_vote', NOW() - INTERVAL '1 week', 1000.0, 'high'),
('Henderson Land Development', '12.HK', 'HKEX', 'Hong Kong', 'HK', 'filing', NOW() - INTERVAL '3 days', 750.0, 'high')
ON CONFLICT (ticker) DO NOTHING;