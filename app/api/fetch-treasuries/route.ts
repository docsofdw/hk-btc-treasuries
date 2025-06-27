import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'edge';
export const revalidate = 300; // 5 minutes

export async function GET() {
  try {
    const supabase = await createClient();
    
    // First, try to get data from materialized view
    const { data: snapshotData, error: snapshotError } = await supabase
      .from('latest_snapshot')
      .select('*')
      .order('btc', { ascending: false });
    
    if (snapshotData && snapshotData.length > 0) {
      console.log('Available fields in latest_snapshot:', Object.keys(snapshotData[0] || {}));
      
      // Get cost basis data from holdings_snapshots since it might not be in the view
      const { data: holdingsData } = await supabase
        .from('holdings_snapshots')
        .select('entity_id, cost_basis_usd');
      
      const costBasisMap = new Map(
        holdingsData?.map(h => [h.entity_id, h.cost_basis_usd]) || []
      );
      
      const entities = snapshotData.map(row => ({
        id: row.id,
        legalName: row.legal_name,
        ticker: row.ticker,
        listingVenue: row.listing_venue,
        hq: row.hq,
        btc: row.btc ? parseFloat(row.btc) : 0,
        costBasisUsd: row.cost_basis_usd ? parseFloat(row.cost_basis_usd) : null,
        lastDisclosed: row.last_disclosed,
        source: row.source_url,
        dataSource: row.data_quality,
        verified: row.verified,
        region: row.region,
        marketCap: row.market_cap ? parseFloat(row.market_cap) : null,
        sharesOutstanding: row.shares_outstanding ? parseFloat(row.shares_outstanding) : null
      }));
      
      return NextResponse.json({ 
        entities,
        metadata: {
          total: entities.length,
          verified: entities.filter(e => e.verified).length,
          lastUpdated: new Date().toISOString()
        }
      });
    }
    
    // Fallback to regular tables if view is empty
    const { data: holdings } = await supabase
      .from('holdings_snapshots')
      .select(`
        *,
        entities!inner(*)
      `)
      .order('btc', { ascending: false });
    
    const entities = holdings?.map(holding => ({
      id: holding.entity_id,
      legalName: holding.entities.legal_name,
      ticker: holding.entities.ticker,
      listingVenue: holding.entities.listing_venue,
      hq: holding.entities.hq,
      btc: parseFloat(holding.btc),
      costBasisUsd: holding.cost_basis_usd ? parseFloat(holding.cost_basis_usd) : null,
      lastDisclosed: holding.last_disclosed,
      source: holding.source_url,
      dataSource: holding.data_source,
      verified: false,
      region: holding.entities.region
    })) || [];
    
    return NextResponse.json({ 
      entities,
      metadata: {
        total: entities.length,
        verified: 0,
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching treasuries:', error);
    return NextResponse.json({ entities: [], error: 'Failed to fetch data' });
  }
} 