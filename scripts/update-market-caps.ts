import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MarketData {
  ticker: string;
  marketCap?: number;
  price?: number;
  currency?: string;
}

async function fetchMarketData(tickers: string[], venues: string[]): Promise<Record<string, MarketData>> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/market-data?tickers=${tickers.join(',')}&venues=${venues.join(',')}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch market data');
    }
    
    const result = await response.json();
    return result.data || {};
  } catch (error) {
    console.error('Error fetching market data:', error);
    return {};
  }
}

async function updateMarketCaps() {
  console.log('Fetching entities from database...');
  
  // Get all entities
  const { data: entities, error } = await supabase
    .from('entities')
    .select('id, ticker, listing_venue');
  
  if (error || !entities) {
    console.error('Error fetching entities:', error);
    return;
  }
  
  console.log(`Found ${entities.length} entities`);
  
  // Fetch market data
  const tickers = entities.map(e => e.ticker);
  const venues = entities.map(e => e.listing_venue);
  
  console.log('Fetching market data from API...');
  const marketData = await fetchMarketData(tickers, venues);
  
  // Update each entity with market cap
  let updateCount = 0;
  for (const entity of entities) {
    const data = marketData[entity.ticker];
    
    if (data?.marketCap) {
      const { error: updateError } = await supabase
        .from('entities')
        .update({
          market_cap: data.marketCap,
          market_data_updated_at: new Date().toISOString()
        })
        .eq('id', entity.id);
      
      if (updateError) {
        console.error(`Error updating ${entity.ticker}:`, updateError);
      } else {
        console.log(`Updated ${entity.ticker} with market cap: $${(data.marketCap / 1000000).toFixed(2)}M`);
        updateCount++;
      }
    } else {
      console.log(`No market cap data available for ${entity.ticker}`);
    }
  }
  
  console.log(`\nUpdated ${updateCount} entities with market cap data`);
}

// Run the update
updateMarketCaps()
  .then(() => {
    console.log('Market cap update complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error updating market caps:', error);
    process.exit(1);
  }); 