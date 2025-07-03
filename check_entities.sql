-- Check for existing entities that might conflict
SELECT id, legal_name, ticker, listing_venue, btc, region
FROM entities
WHERE legal_name LIKE '%Asia%' 
   OR legal_name LIKE '%Moon%'
   OR ticker LIKE '%HK%'
ORDER BY legal_name;
