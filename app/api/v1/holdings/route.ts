import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    
    const supabase = await createClient();
    
    let query = supabase
      .from('latest_snapshot')
      .select('*')
      .order('btc', { ascending: false });
    
    // Filter by ticker if provided
    if (ticker) {
      query = query.eq('ticker', ticker.toUpperCase());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching holdings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch holdings data' },
        { status: 500 }
      );
    }
    
    // Transform the data to match the expected format
    const holdings = data?.map(entity => ({
      id: entity.id,
      company: entity.legal_name,
      ticker: entity.ticker,
      exchange: entity.listing_venue,
      headquarters: entity.hq,
      region: entity.region,
      btcHoldings: entity.btc,
      costBasisUsd: entity.cost_basis_usd,
      lastDisclosed: entity.last_disclosed,
      source: entity.source_url,
      verified: entity.verified || false,
      marketCap: entity.market_cap,
      sharesOutstanding: entity.shares_outstanding,
      dataQuality: entity.data_quality,
      updatedAt: entity.updated_at
    })) || [];
    
    // Calculate summary statistics
    const totalBtc = holdings.reduce((sum, h) => sum + h.btcHoldings, 0);
    const verifiedCount = holdings.filter(h => h.verified).length;
    
    return NextResponse.json({
      success: true,
      data: {
        holdings,
        summary: {
          totalCompanies: holdings.length,
          totalBtc,
          verifiedCount,
          lastUpdated: new Date().toISOString()
        }
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 