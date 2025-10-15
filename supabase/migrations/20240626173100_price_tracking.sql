-- Create price history table
CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  asset VARCHAR(10) NOT NULL,
  price_usd DECIMAL(20, 2) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient querying
CREATE INDEX idx_price_history_asset_timestamp ON price_history(asset, timestamp DESC);

-- Add RLS policies
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON price_history
  FOR SELECT USING (true); 