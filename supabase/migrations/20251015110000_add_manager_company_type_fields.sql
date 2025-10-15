-- Phase 1: Add manager_profile and company_type classification fields to entities table
-- This enables badge system for categorizing Bitcoin treasury companies

-- Add manager_profile column: distinguishes active traders from passive holders
ALTER TABLE entities 
ADD COLUMN IF NOT EXISTS manager_profile TEXT 
CHECK (manager_profile IN ('ACTIVE_MANAGER', 'PASSIVE_HOLDER'));

-- Add company_type column: categorizes companies by industry
ALTER TABLE entities 
ADD COLUMN IF NOT EXISTS company_type TEXT 
CHECK (company_type IN ('INTERNET', 'GAMING', 'MINER', 'TECH', 'INVESTMENT', 'OTHER'));

-- Create indexes for filtering and analytics
CREATE INDEX IF NOT EXISTS idx_entities_manager_profile ON entities(manager_profile);
CREATE INDEX IF NOT EXISTS idx_entities_company_type ON entities(company_type);

-- Add helpful comments
COMMENT ON COLUMN entities.manager_profile IS 'Classification of Bitcoin management strategy: ACTIVE_MANAGER (actively trades/manages) or PASSIVE_HOLDER (long-term holder)';
COMMENT ON COLUMN entities.company_type IS 'Primary industry classification: INTERNET, GAMING, MINER, TECH, INVESTMENT, or OTHER';

-- Example data updates (optional - you can customize these)
-- UPDATE entities SET manager_profile = 'ACTIVE_MANAGER', company_type = 'MINER' WHERE ticker = 'MARA';
-- UPDATE entities SET manager_profile = 'PASSIVE_HOLDER', company_type = 'TECH' WHERE ticker = 'MSTR';

