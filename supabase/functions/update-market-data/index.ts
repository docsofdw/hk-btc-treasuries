import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { MarketDataFetcher } from '../../../lib/services/market-data-fetcher.ts'
import { DatabaseHelpers } from '../../../lib/services/database-helpers.ts'
import { monitoring } from '../../../lib/services/monitoring.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
}




serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Initialize services
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const dbHelpers = new DatabaseHelpers(supabase);
    const marketDataFetcher = new MarketDataFetcher({
      finnhub: Deno.env.get('FINNHUB_API_KEY') || '',
      polygon: Deno.env.get('POLYGON_API_KEY') || '',
      twelveData: Deno.env.get('TWELVE_DATA_API_KEY') || '',
      alphaVantage: Deno.env.get('ALPHA_VANTAGE_API_KEY') || '',
    });
    
    monitoring.info('update-market-data', 'Starting market data update');
    
    // Get all entities that need market data updates
    const { data: entities, error: fetchError } = await monitoring.trackPerformance(
      'fetch_entities',
      async () => {
        const result = await supabase
          .from('entities')
          .select('id, ticker, market_data_updated_at')
          .or('market_data_updated_at.is.null,market_data_updated_at.lt.now() - interval \'24 hours\'');
        
        if (result.error) throw result.error;
        return result.data;
      }
    );
    
    if (!entities || entities.length === 0) {
      monitoring.info('update-market-data', 'No entities need updating');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No entities need updating',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    monitoring.info('update-market-data', `Processing ${entities.length} entities`);
    
    // Batch fetch market data
    const tickers = entities.map(e => e.ticker);
    const marketDataMap = await monitoring.trackPerformance(
      'batch_fetch_market_data',
      () => marketDataFetcher.batchFetchMarketData(tickers),
      { count: tickers.length }
    );
    
    // Update entities with batch operation
    const updateResults = await dbHelpers.batchOperation(
      entities,
      async (entity) => {
        const marketData = marketDataMap.get(entity.ticker);
        
        if (!marketData || marketData.marketCap === 0) {
          monitoring.warn('update-market-data', `No market data for ${entity.ticker}`);
          throw new Error('No market data available');
        }
        
        const { error } = await supabase
          .from('entities')
          .update({
            market_cap: marketData.marketCap,
            shares_outstanding: marketData.sharesOutstanding,
            stock_price: marketData.price,
            market_data_updated_at: new Date().toISOString(),
            market_data_source: marketData.source
          })
          .eq('id', entity.id);
        
        if (error) throw error;
        
        return {
          ticker: entity.ticker,
          marketCap: marketData.marketCap,
          price: marketData.price,
          source: marketData.source
        };
      },
      { batchSize: 10, continueOnError: true }
    );
    
    // Refresh materialized view
    await monitoring.trackPerformance(
      'refresh_materialized_view',
      () => supabase.rpc('refresh_latest_snapshot')
    );
    
    const duration = Date.now() - startTime;
    const summary = {
      success: true, 
      processed: entities.length,
      updated: updateResults.successful.length,
      failed: updateResults.failed.length,
      duration,
      results: {
        successful: updateResults.successful,
        failed: updateResults.failed.map(f => ({
          ticker: f.item.ticker,
          error: f.error?.message || 'Unknown error'
        }))
      },
      timestamp: new Date().toISOString()
    };
    
    monitoring.info('update-market-data', 'Market data update completed', summary);
    
    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    monitoring.error('update-market-data', 'Failed to update market data', error as Error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 