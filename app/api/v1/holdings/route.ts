import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { publicApiLimiter, getClientIp, addRateLimitHeaders, rateLimit } from '@/lib/rate-limit';

interface SnapshotData {
  entity_id: string;
  btc: number;
  created_at: string;
}

/**
 * Helper function to calculate BTC deltas for entities
 * Fetches the last 2 snapshots for each entity and calculates the difference
 * 
 * TODO: Optimize this to avoid N+1 queries. Consider:
 * - Using a window function in the materialized view
 * - Batching snapshot queries
 * - Caching results
 */
async function calculateDeltas(supabase: Awaited<ReturnType<typeof createClient>>, entityIds: string[]): Promise<Map<string, number | null>> {
  const deltaMap = new Map<string, number | null>();
  
  // Batch fetch all snapshots for all entities in a single query
  const { data: allSnapshots, error } = await supabase
    .from('holdings_snapshots')
    .select('entity_id, btc, created_at')
    .in('entity_id', entityIds)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching snapshots for delta calculation:', error);
    // Return empty map - deltas will be null
    return deltaMap;
  }
  
  // Group snapshots by entity_id and calculate deltas
  const snapshotsByEntity = new Map<string, SnapshotData[]>();
  
  for (const snapshot of allSnapshots || []) {
    const entityId = snapshot.entity_id;
    if (!snapshotsByEntity.has(entityId)) {
      snapshotsByEntity.set(entityId, []);
    }
    snapshotsByEntity.get(entityId)!.push(snapshot);
  }
  
  // Calculate delta for each entity (latest - previous)
  for (const [entityId, snapshots] of snapshotsByEntity.entries()) {
    if (snapshots.length >= 2) {
      // Snapshots are already sorted by created_at DESC
      const latest = snapshots[0];
      const previous = snapshots[1];
      const delta = Number(latest.btc) - Number(previous.btc);
      deltaMap.set(entityId, delta);
    } else {
      // Not enough snapshots to calculate delta
      deltaMap.set(entityId, null);
    }
  }
  
  return deltaMap;
}

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimit(ip, publicApiLimiter, 60, 60 * 1000);
    
    // Return 429 if rate limit exceeded
    if (!rateLimitResult.success) {
      const headers = new Headers();
      addRateLimitHeaders(headers, rateLimitResult);
      headers.set('Retry-After', Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString());
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: Object.fromEntries(headers.entries())
        }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    
    const supabase = await createClient();
    
    // Fetch latest BTC/USD price
    const { data: priceData, error: priceError } = await supabase
      .from('price_snapshots')
      .select('btc_usd, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (priceError) {
      console.error('Error fetching BTC price:', priceError);
      return NextResponse.json(
        { error: 'Failed to fetch BTC price data' },
        { status: 500 }
      );
    }
    
    const btcUsdRate = Number(priceData.btc_usd);
    const pricedAt = priceData.created_at;
    
    // Query entities with holdings
    let query = supabase
      .from('latest_snapshot')
      .select('*')
      .order('btc', { ascending: false });
    
    // Filter by region if provided
    if (region) {
      query = query.eq('region', region.toUpperCase());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching holdings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch holdings data' },
        { status: 500 }
      );
    }
    
    // Filter entities with BTC holdings
    const entitiesWithBtc = data?.filter(entity => entity.btc !== null && entity.btc > 0) || [];
    
    // Calculate deltas for all entities in batch
    const entityIds = entitiesWithBtc.map(entity => entity.id);
    const deltaMap = await calculateDeltas(supabase, entityIds);
    
    // Transform the data to match the expected format
    const holdings = entitiesWithBtc.map(entity => {
        const btcHoldings = entity.btc;
        const usdValue = btcHoldings ? btcHoldings * btcUsdRate : null;
        const deltaBtc = deltaMap.get(entity.id) ?? null;
        
        // Generate a placeholder ticker from legal_name if not available
        const ticker = entity.legal_name 
          ? entity.legal_name.substring(0, 4).toUpperCase() 
          : 'N/A';
        
        return {
          id: entity.id,
          company: entity.legal_name,
          ticker: ticker,
          exchange: 'HKEX', // Default to HKEX for HK entities
          headquarters: entity.hq,
          region: entity.region,
          btcHoldings,
          usdValue,
          deltaBtc, // NEW: Delta since last snapshot
          costBasisUsd: entity.cost_basis_usd,
          lastDisclosed: entity.last_disclosed,
          source: entity.source_url,
          verified: entity.verified || false,
          marketCap: entity.market_cap,
          sharesOutstanding: entity.shares_outstanding,
          dataQuality: entity.data_quality,
          updatedAt: entity.updated_at,
          managerProfile: entity.manager_profile,
          companyType: entity.company_type
        };
      });
    
    // Calculate summary statistics
    const totalBtc = holdings.reduce((sum, h) => sum + (h.btcHoldings || 0), 0);
    const totalUsd = holdings.reduce((sum, h) => sum + (h.usdValue || 0), 0);
    const verifiedCount = holdings.filter(h => h.verified).length;
    
    // Prepare response headers with caching and rate limiting
    const responseHeaders = new Headers({
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'CDN-Cache-Control': 'public, max-age=300',
      'Vercel-CDN-Cache-Control': 'max-age=300',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    // Add rate limit headers
    addRateLimitHeaders(responseHeaders, rateLimitResult);
    
    return NextResponse.json({
      success: true,
      data: {
        holdings,
        summary: {
          totalCompanies: holdings.length,
          totalBtc,
          totalUsd,
          verifiedCount,
          pricedAt,
          btcUsdRate,
          lastUpdated: new Date().toISOString()
        }
      }
    }, {
      headers: Object.fromEntries(responseHeaders.entries())
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 