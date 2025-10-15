-- Migration: Add scraper orchestration and logging support
-- Version: 012
-- Description: Tables and functions for enhanced scraper management

-- Scraper logs table for tracking execution history
CREATE TABLE IF NOT EXISTS scraper_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scraper_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    duration INTEGER NOT NULL, -- milliseconds
    records_processed INTEGER DEFAULT 0,
    new_records INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    summary TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_scraper_logs_scraper_id ON scraper_logs(scraper_id);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_timestamp ON scraper_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_logs_success ON scraper_logs(success);

-- Enhanced admin statistics function
CREATE OR REPLACE FUNCTION get_enhanced_admin_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_companies INTEGER;
    total_btc NUMERIC;
    pending_approvals INTEGER;
    scans_today INTEGER;
    last_scan_time TEXT;
    recent_activity JSON;
    system_health JSON;
BEGIN
    -- Get basic stats
    SELECT COUNT(*) INTO total_companies FROM entities;
    
    SELECT COALESCE(SUM(hs.btc), 0) INTO total_btc
    FROM entities e
    LEFT JOIN holdings_snapshots hs ON e.id = hs.entity_id
    WHERE hs.created_at = (
        SELECT MAX(created_at) 
        FROM holdings_snapshots hs2 
        WHERE hs2.entity_id = e.id
    );
    
    -- Count pending approvals (you may need to adjust this based on your approval system)
    SELECT COUNT(*) INTO pending_approvals 
    FROM raw_filings 
    WHERE status = 'pending' OR status IS NULL;
    
    -- Count scans today
    SELECT COUNT(*) INTO scans_today
    FROM scraper_logs
    WHERE DATE(timestamp) = CURRENT_DATE;
    
    -- Get last scan time
    SELECT TO_CHAR(MAX(timestamp), 'HH24:MI DD/MM') INTO last_scan_time
    FROM scraper_logs
    WHERE success = true;
    
    -- Get recent activity (last 10 log entries)
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'timestamp', timestamp,
            'action', CASE 
                WHEN success THEN 'Scan Completed'
                ELSE 'Scan Failed'
            END,
            'details', summary,
            'status', CASE 
                WHEN success THEN 'success'
                ELSE 'error'
            END
        )
        ORDER BY timestamp DESC
    ) INTO recent_activity
    FROM (
        SELECT timestamp, success, summary
        FROM scraper_logs
        ORDER BY timestamp DESC
        LIMIT 10
    ) recent;
    
    -- Calculate system health metrics
    SELECT JSON_BUILD_OBJECT(
        'scraperStatus', CASE
            WHEN COUNT(*) FILTER (WHERE success = false AND timestamp > NOW() - INTERVAL '1 hour') > 0 
            THEN 'error'
            WHEN COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '30 minutes') > 0 
            THEN 'active'
            ELSE 'idle'
        END,
        'apiLimits', JSON_BUILD_ARRAY(
            JSON_BUILD_OBJECT('service', 'Perplexity', 'used', 45, 'total', 100),
            JSON_BUILD_OBJECT('service', 'Firecrawl', 'used', 23, 'total', 50),
            JSON_BUILD_OBJECT('service', 'HKEX API', 'used', 156, 'total', 200)
        ),
        'lastErrors', COALESCE(
            (SELECT JSON_AGG(errors->>0)
             FROM scraper_logs 
             WHERE success = false 
               AND timestamp > NOW() - INTERVAL '24 hours'
               AND errors IS NOT NULL 
               AND JSON_ARRAY_LENGTH(errors) > 0
             ORDER BY timestamp DESC 
             LIMIT 5),
            '[]'::json
        )
    ) INTO system_health
    FROM scraper_logs
    WHERE timestamp > NOW() - INTERVAL '24 hours';
    
    -- Build final result
    SELECT JSON_BUILD_OBJECT(
        'totalCompanies', total_companies,
        'totalBTC', total_btc,
        'pendingApprovals', pending_approvals,
        'scansToday', scans_today,
        'lastScanTime', COALESCE(last_scan_time, 'Never'),
        'recentActivity', COALESCE(recent_activity, '[]'::json),
        'systemHealth', system_health
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get scraper performance metrics
CREATE OR REPLACE FUNCTION get_scraper_performance(scraper_id_param TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'scraperId', scraper_id,
            'totalRuns', total_runs,
            'successRate', success_rate,
            'avgDuration', avg_duration,
            'lastRun', last_run,
            'errorCount', error_count,
            'recordsProcessed', total_records
        )
    ) INTO result
    FROM (
        SELECT 
            scraper_id,
            COUNT(*) as total_runs,
            ROUND((COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*))::numeric, 2) as success_rate,
            ROUND(AVG(duration)) as avg_duration,
            MAX(timestamp) as last_run,
            COUNT(*) FILTER (WHERE success = false) as error_count,
            SUM(records_processed) as total_records
        FROM scraper_logs
        WHERE (scraper_id_param IS NULL OR scraper_id = scraper_id_param)
          AND timestamp > NOW() - INTERVAL '30 days'
        GROUP BY scraper_id
        ORDER BY last_run DESC
    ) stats;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Function to clean old scraper logs (retain last 1000 per scraper)
CREATE OR REPLACE FUNCTION cleanup_scraper_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    current_deleted INTEGER;
    scraper_record RECORD;
BEGIN
    -- For each scraper, keep only the most recent 1000 logs
    FOR scraper_record IN 
        SELECT DISTINCT scraper_id FROM scraper_logs
    LOOP
        WITH logs_to_delete AS (
            SELECT id 
            FROM scraper_logs 
            WHERE scraper_id = scraper_record.scraper_id
            ORDER BY timestamp DESC 
            OFFSET 1000
        )
        DELETE FROM scraper_logs 
        WHERE id IN (SELECT id FROM logs_to_delete);
        
        GET DIAGNOSTICS current_deleted = ROW_COUNT;
        deleted_count := deleted_count + current_deleted;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic cleanup (run daily)
-- Note: This requires pg_cron extension if you want automatic cleanup
-- You can also call this function manually or via your application

-- Add some sample data for testing
INSERT INTO scraper_logs (scraper_id, success, duration, records_processed, new_records, summary) VALUES
('hkex-filings', true, 45000, 150, 3, 'Successfully processed HKEX filings'),
('sec-filings', true, 60000, 89, 1, 'SEC EDGAR scan completed'),
('dynamic-discovery', true, 120000, 25, 2, 'AI discovery found 2 new companies'),
('market-data', true, 15000, 200, 0, 'Market data updated for all entities');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON scraper_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_enhanced_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_scraper_performance(TEXT) TO authenticated;

-- Add comments
COMMENT ON TABLE scraper_logs IS 'Execution logs for all scrapers and data collection processes';
COMMENT ON FUNCTION get_enhanced_admin_stats() IS 'Returns comprehensive admin dashboard statistics';
COMMENT ON FUNCTION get_scraper_performance(TEXT) IS 'Returns performance metrics for scrapers';
COMMENT ON FUNCTION cleanup_scraper_logs() IS 'Maintains scraper log table size by removing old entries';