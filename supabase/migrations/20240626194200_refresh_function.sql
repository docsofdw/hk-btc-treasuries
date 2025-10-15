-- Add function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_latest_snapshot()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY latest_snapshot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 