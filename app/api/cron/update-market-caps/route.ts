import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = await createClient();
    
    // Get all entities
    const { data: entities, error } = await supabase
      .from('entities')
      .select('id, ticker, listing_venue');
    
    if (error || !entities) {
      console.error('Error fetching entities:', error);
      return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 });
    }
    
    // Fetch market data from our API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const tickers = entities.map(e => e.ticker).join(',');
    const venues = entities.map(e => e.listing_venue).join(',');
    
    const marketDataResponse = await fetch(
      `${baseUrl}/api/market-data?tickers=${tickers}&venues=${venues}`
    );
    
    if (!marketDataResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
    }
    
    const { data: marketData } = await marketDataResponse.json();
    
    // Update entities with market cap data
    let updateCount = 0;
    const updatePromises = [];
    
    for (const entity of entities) {
      const data = marketData[entity.ticker];
      
      if (data?.marketCap) {
        updatePromises.push(
          supabase
            .from('entities')
            .update({
              market_cap: data.marketCap,
              market_data_updated_at: new Date().toISOString()
            })
            .eq('id', entity.id)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error(`Error updating ${entity.ticker}:`, updateError);
              } else {
                updateCount++;
              }
            })
        );
      }
    }
    
    await Promise.all(updatePromises);
    
    // Refresh the materialized view to include updated market cap data
    const { error: refreshError } = await supabase.rpc('refresh_latest_snapshot');
    
    if (refreshError) {
      console.error('Error refreshing materialized view:', refreshError);
      // Don't fail the whole operation if refresh fails
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updateCount} entities with market cap data`,
      stats: {
        total: entities.length,
        updated: updateCount,
        viewRefreshed: !refreshError
      }
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 