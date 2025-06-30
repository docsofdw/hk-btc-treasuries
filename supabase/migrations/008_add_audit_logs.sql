-- Add audit logs table for tracking changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  user_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_audit_logs_entity_id (entity_id),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_created_at (created_at)
);

-- Add new columns to entities table for better tracking
ALTER TABLE entities 
  ADD COLUMN IF NOT EXISTS stock_price DECIMAL(20, 8),
  ADD COLUMN IF NOT EXISTS market_data_source VARCHAR(50);

-- Add advisory lock functions for preventing race conditions
CREATE OR REPLACE FUNCTION try_advisory_lock(lock_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  lock_id BIGINT;
BEGIN
  -- Convert lock name to a unique bigint
  lock_id := ('x' || substr(md5(lock_name), 1, 16))::bit(64)::bigint;
  RETURN pg_try_advisory_lock(lock_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_advisory_lock(lock_name TEXT)
RETURNS VOID AS $$
DECLARE
  lock_id BIGINT;
BEGIN
  -- Convert lock name to a unique bigint
  lock_id := ('x' || substr(md5(lock_name), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_unlock(lock_id);
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage all audit logs
CREATE POLICY "Service role can manage all audit logs"
  ON audit_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy for authenticated users to read their own audit logs
CREATE POLICY "Users can read their own audit logs"
  ON audit_logs
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Add comment
COMMENT ON TABLE audit_logs IS 'Audit trail for all entity and filing changes'; 