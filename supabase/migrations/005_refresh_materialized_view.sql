-- Function to refresh the latest_snapshot materialized view
CREATE OR REPLACE FUNCTION refresh_latest_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY latest_snapshot;
END;
$$;

-- Create trigger function to refresh materialized view when entities change
CREATE OR REPLACE FUNCTION trigger_refresh_latest_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use pg_notify to trigger async refresh (better performance)
  PERFORM pg_notify('refresh_snapshot', '');
  RETURN NULL;
END;
$$;

-- Create triggers on entities table
DROP TRIGGER IF EXISTS trigger_entities_refresh_snapshot ON entities;
CREATE TRIGGER trigger_entities_refresh_snapshot
  AFTER INSERT OR UPDATE OR DELETE ON entities
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_latest_snapshot();

-- Create triggers on holdings_snapshots table  
DROP TRIGGER IF EXISTS trigger_holdings_refresh_snapshot ON holdings_snapshots;
CREATE TRIGGER trigger_holdings_refresh_snapshot
  AFTER INSERT OR UPDATE OR DELETE ON holdings_snapshots
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_latest_snapshot();

-- Grant execute permission on the refresh function
GRANT EXECUTE ON FUNCTION refresh_latest_snapshot() TO anon, authenticated;