-- Add bitcoin_related field to raw_filings table
-- This allows us to store ALL company announcements and flag Bitcoin-related ones

ALTER TABLE raw_filings 
ADD COLUMN IF NOT EXISTS bitcoin_related BOOLEAN DEFAULT false;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_raw_filings_bitcoin_related ON raw_filings(bitcoin_related);

-- Update existing records to mark Bitcoin-related filings
-- Any filing with Bitcoin keywords in title or text should be flagged
UPDATE raw_filings
SET bitcoin_related = true
WHERE 
  bitcoin_related = false AND (
    title ILIKE '%bitcoin%' OR
    title ILIKE '%btc%' OR
    title ILIKE '%cryptocurrency%' OR
    title ILIKE '%crypto asset%' OR
    title ILIKE '%digital asset%' OR
    title ILIKE '%virtual asset%' OR
    title ILIKE '%比特币%' OR
    title ILIKE '%加密货币%' OR
    title ILIKE '%數字資產%' OR
    title ILIKE '%虛擬資產%' OR
    title ILIKE '%加密資產%' OR
    extracted_text ILIKE '%bitcoin%' OR
    extracted_text ILIKE '%btc%' OR
    summary ILIKE '%bitcoin%' OR
    summary ILIKE '%btc%'
  );

COMMENT ON COLUMN raw_filings.bitcoin_related IS 'Flag indicating if this filing mentions Bitcoin/cryptocurrency. Allows storing ALL company announcements while identifying relevant ones.';

