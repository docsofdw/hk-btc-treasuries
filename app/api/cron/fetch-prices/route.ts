import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

interface PriceResult {
  price: number;
  source: 'coingecko' | 'coincap' | 'cached';
}

/**
 * Fetch Bitcoin price with waterfall fallback pattern:
 * 1. Try CoinGecko (primary - free, 30 calls/min)
 * 2. Try CoinCap (fallback - free, unlimited)
 * 3. Use cached price from database (last resort)
 */
async function fetchBtcPrice(supabase: SupabaseClient): Promise<PriceResult> {
  // Try CoinGecko first
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { 
        signal: AbortSignal.timeout(5000),
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data?.bitcoin?.usd && typeof data.bitcoin.usd === 'number') {
        console.log('[BTC Price] ✅ CoinGecko success:', data.bitcoin.usd);
        return { price: data.bitcoin.usd, source: 'coingecko' };
      }
    }
    
    console.warn('[BTC Price] ⚠️ CoinGecko returned invalid data, trying fallback');
  } catch (error) {
    console.warn('[BTC Price] ⚠️ CoinGecko failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Try CoinCap fallback
  try {
    const response = await fetch(
      'https://api.coincap.io/v2/assets/bitcoin',
      { 
        signal: AbortSignal.timeout(5000),
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      const price = parseFloat(data?.data?.priceUsd);
      
      if (!isNaN(price) && price > 0) {
        console.log('[BTC Price] ✅ CoinCap success (fallback):', price);
        return { price, source: 'coincap' };
      }
    }
    
    console.warn('[BTC Price] ⚠️ CoinCap returned invalid data, using cached price');
  } catch (error) {
    console.warn('[BTC Price] ⚠️ CoinCap failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Use cached price from database as last resort
  try {
    const { data: cached, error } = await supabase
      .from('price_snapshots')
      .select('btc_usd, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && cached?.btc_usd) {
      const price = Number(cached.btc_usd);
      const age = Date.now() - new Date(cached.created_at).getTime();
      const hoursOld = Math.floor(age / (1000 * 60 * 60));
      
      console.log(`[BTC Price] ℹ️ Using cached price: $${price} (${hoursOld}h old)`);
      return { price, source: 'cached' };
    }
  } catch (error) {
    console.error('[BTC Price] ❌ Failed to fetch cached price:', error);
  }

  throw new Error('No price source available - all APIs failed and no cached price exists');
}

/**
 * Cron job to fetch and store BTC price
 * Schedule: Every 5 minutes via Vercel Cron or external scheduler
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[BTC Price] ⚠️ Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[BTC Price] 🚀 Starting price fetch...');
    
    const supabase = await createClient();
    
    // Fetch price with fallback logic
    const { price, source } = await fetchBtcPrice(supabase);
    
    // Store the price in database
    const { error: insertError } = await supabase
      .from('price_snapshots')
      .insert({
        btc_usd: price,
        hkd_usd: 0.128, // Approximate HKD/USD rate, can be made dynamic later
        source
      });

    if (insertError) {
      console.error('[BTC Price] ❌ Failed to store price:', insertError);
      throw insertError;
    }

    const duration = Date.now() - startTime;
    
    console.log(`[BTC Price] ✅ Success! Price: $${price} | Source: ${source} | Duration: ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      price,
      source,
      timestamp: new Date().toISOString(),
      duration
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[BTC Price] ❌ Failed:', errorMessage);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        duration
      },
      { status: 500 }
    );
  }
}

/**
 * Manual trigger endpoint for testing
 * POST /api/cron/fetch-prices
 */
export async function POST(request: NextRequest) {
  // Allow manual triggering without auth in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Manual triggering disabled in production' },
      { status: 403 }
    );
  }
  
  return GET(request);
}

