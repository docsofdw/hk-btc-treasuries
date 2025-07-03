-- Script to fix Moon Inc. entity name
-- First, let's check what entities might be conflicting

-- Check for entities that might be "HK Asia Holdings" or similar
SELECT id, legal_name, ticker, listing_venue, btc, region
FROM entities
WHERE legal_name LIKE '%Asia%' 
   OR legal_name LIKE '%HK%Holdings%'
   OR legal_name LIKE '%Moon%'
   OR ticker IN ('MOON.HK', '1357.HK', 'MOON');

-- If you find "HK Asia Holdings" that should be "Moon Inc.", update it:
-- UPDATE entities
-- SET legal_name = 'Moon Inc.'
-- WHERE legal_name = 'HK Asia Holdings'
--   AND ticker = 'MOON.HK';  -- or whatever the ticker is

-- Alternative: If the ticker is wrong too, update both:
-- UPDATE entities
-- SET legal_name = 'Moon Inc.',
--     ticker = 'MOON.HK'  -- or the correct ticker
-- WHERE legal_name = 'HK Asia Holdings';

-- Check the result
-- SELECT id, legal_name, ticker, listing_venue, btc, region
-- FROM entities
-- WHERE legal_name = 'Moon Inc.'; 