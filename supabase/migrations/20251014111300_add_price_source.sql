-- Add source column to price_snapshots table to track where prices came from
-- This helps with monitoring and debugging the price fetching waterfall

ALTER TABLE price_snapshots 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'unknown' 
CHECK (source IN ('coingecko', 'coincap', 'cached', 'unknown'));

-- Create index for source column to enable fast filtering
CREATE INDEX IF NOT EXISTS idx_price_snapshots_source ON price_snapshots(source);

-- Add comment for documentation
COMMENT ON COLUMN price_snapshots.source IS 'Source of the price data: coingecko (primary), coincap (fallback), or cached (emergency fallback)';

