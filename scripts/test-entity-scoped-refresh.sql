-- =====================================================================
-- Test Script: Entity-Scoped Snapshot Refresh
-- Purpose: Verify migration worked correctly
-- =====================================================================

-- TEST 1: Verify Table Structure
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'TEST 1: Verify Table Structure';
  RAISE NOTICE '==================================================';
END $$;

-- Check if latest_snapshot is a table (not materialized view)
SELECT 
  table_name,
  table_type,
  CASE 
    WHEN table_type = 'BASE TABLE' THEN '✅ PASS: Is a regular table'
    ELSE '❌ FAIL: Still a materialized view'
  END as status
FROM information_schema.tables 
WHERE table_name = 'latest_snapshot';

-- TEST 2: Verify Row Count
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'TEST 2: Verify Row Count';
  RAISE NOTICE '==================================================';
END $$;

SELECT 
  COUNT(*) as row_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS: Has data'
    ELSE '❌ FAIL: No data found'
  END as status
FROM latest_snapshot;

-- TEST 3: Verify Functions Exist
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'TEST 3: Verify Functions Exist';
  RAISE NOTICE '==================================================';
END $$;

SELECT 
  proname as function_name,
  '✅ PASS: Function exists' as status
FROM pg_proc
WHERE proname IN (
  'refresh_entity_snapshot',
  'full_refresh_latest_snapshot',
  'trigger_refresh_entity_snapshot',
  'refresh_latest_snapshot'
)
ORDER BY proname;

-- TEST 4: Verify Triggers Exist
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'TEST 4: Verify Triggers Exist';
  RAISE NOTICE '==================================================';
END $$;

SELECT 
  trigger_name,
  event_object_table,
  event_manipulation,
  '✅ PASS: Trigger exists' as status
FROM information_schema.triggers
WHERE event_object_table IN ('entities', 'holdings_snapshots')
  AND trigger_name LIKE '%refresh%';

-- TEST 5: Verify Indexes Exist
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'TEST 5: Verify Indexes Exist';
  RAISE NOTICE '==================================================';
END $$;

SELECT 
  indexname,
  tablename,
  '✅ PASS: Index exists' as status
FROM pg_indexes
WHERE tablename = 'latest_snapshot'
ORDER BY indexname;

-- TEST 6: Test Entity-Scoped Refresh Function
-- =====================================================================
DO $$
DECLARE
  v_test_entity_id UUID;
  v_old_btc DECIMAL(12,4);
  v_new_btc DECIMAL(12,4);
  v_test_btc DECIMAL(12,4) := 9999.9999;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'TEST 6: Test Entity-Scoped Refresh';
  RAISE NOTICE '==================================================';
  
  -- Get a test entity
  SELECT id INTO v_test_entity_id 
  FROM entities 
  LIMIT 1;
  
  IF v_test_entity_id IS NULL THEN
    RAISE NOTICE '⚠️  SKIP: No entities found to test';
    RETURN;
  END IF;
  
  -- Get current BTC value
  SELECT btc INTO v_old_btc 
  FROM latest_snapshot 
  WHERE id = v_test_entity_id;
  
  RAISE NOTICE 'Test entity ID: %', v_test_entity_id;
  RAISE NOTICE 'Current BTC: %', v_old_btc;
  
  -- Insert a new test snapshot
  INSERT INTO holdings_snapshots (
    entity_id, 
    btc, 
    last_disclosed, 
    source_url,
    data_source
  ) VALUES (
    v_test_entity_id,
    v_test_btc,
    CURRENT_DATE,
    'https://example.com/test-refresh',
    'manual'
  );
  
  -- Trigger should automatically refresh
  -- Give it a moment
  PERFORM pg_sleep(0.1);
  
  -- Check if latest_snapshot updated
  SELECT btc INTO v_new_btc 
  FROM latest_snapshot 
  WHERE id = v_test_entity_id;
  
  IF v_new_btc = v_test_btc THEN
    RAISE NOTICE '✅ PASS: Automatic trigger refresh worked!';
    RAISE NOTICE '   Old BTC: %', v_old_btc;
    RAISE NOTICE '   New BTC: %', v_new_btc;
  ELSE
    RAISE NOTICE '❌ FAIL: Trigger did not update latest_snapshot';
    RAISE NOTICE '   Expected: %', v_test_btc;
    RAISE NOTICE '   Got: %', v_new_btc;
  END IF;
  
  -- Clean up test data
  DELETE FROM holdings_snapshots 
  WHERE entity_id = v_test_entity_id 
    AND source_url = 'https://example.com/test-refresh';
  
  -- Restore original state
  IF v_old_btc IS NOT NULL THEN
    UPDATE latest_snapshot 
    SET btc = v_old_btc 
    WHERE id = v_test_entity_id;
  END IF;
  
  RAISE NOTICE '🧹 Test cleanup completed';
END $$;

-- TEST 7: Performance Test (Entity-Scoped vs Full Refresh)
-- =====================================================================
DO $$
DECLARE
  v_entity_id UUID;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_entity_duration INTERVAL;
  v_full_duration INTERVAL;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'TEST 7: Performance Comparison';
  RAISE NOTICE '==================================================';
  
  -- Get a test entity
  SELECT id INTO v_entity_id FROM entities LIMIT 1;
  
  IF v_entity_id IS NULL THEN
    RAISE NOTICE '⚠️  SKIP: No entities found to test';
    RETURN;
  END IF;
  
  -- Test entity-scoped refresh
  v_start_time := clock_timestamp();
  PERFORM refresh_entity_snapshot(v_entity_id);
  v_end_time := clock_timestamp();
  v_entity_duration := v_end_time - v_start_time;
  
  RAISE NOTICE 'Entity-scoped refresh: % ms', 
    EXTRACT(MILLISECONDS FROM v_entity_duration);
  
  -- Test full refresh
  v_start_time := clock_timestamp();
  PERFORM full_refresh_latest_snapshot();
  v_end_time := clock_timestamp();
  v_full_duration := v_end_time - v_start_time;
  
  RAISE NOTICE 'Full refresh: % ms', 
    EXTRACT(MILLISECONDS FROM v_full_duration);
  
  RAISE NOTICE 'Speedup: %x faster', 
    ROUND((EXTRACT(MILLISECONDS FROM v_full_duration) / 
           EXTRACT(MILLISECONDS FROM v_entity_duration))::NUMERIC, 1);
END $$;

-- TEST 8: Data Integrity Check
-- =====================================================================
DO $$
DECLARE
  v_entities_count INTEGER;
  v_snapshot_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'TEST 8: Data Integrity Check';
  RAISE NOTICE '==================================================';
  
  SELECT COUNT(*) INTO v_entities_count FROM entities;
  SELECT COUNT(*) INTO v_snapshot_count FROM latest_snapshot;
  
  RAISE NOTICE 'Entities count: %', v_entities_count;
  RAISE NOTICE 'Snapshot count: %', v_snapshot_count;
  
  IF v_entities_count = v_snapshot_count THEN
    RAISE NOTICE '✅ PASS: All entities have a snapshot';
  ELSE
    RAISE NOTICE '⚠️  WARNING: Entity/snapshot count mismatch';
    RAISE NOTICE '   This may be normal if some entities have no holdings';
  END IF;
END $$;

-- Final Summary
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'TEST SUITE COMPLETE';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Review results above for any ❌ FAIL markers';
  RAISE NOTICE 'All tests should show ✅ PASS status';
  RAISE NOTICE '';
END $$;

