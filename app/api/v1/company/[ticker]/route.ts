import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const supabase = await createClient();

    // Fetch company/entity data with listings
    const { data: entities, error: entityError } = await supabase
      .from('latest_snapshot')
      .select('*')
      .limit(1000); // Get all entities first
    
    if (entityError) {
      console.error('Error fetching entity:', entityError);
      return NextResponse.json(
        { error: 'Failed to fetch company data' },
        { status: 500 }
      );
    }

    // Get all entity IDs to fetch listings
    const entityIds = entities?.map(e => e.id) || [];
    
    // Fetch listings for all entities
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('entity_id, ticker, exchange')
      .eq('is_primary', true)
      .in('entity_id', entityIds);
    
    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
    }

    // Create a map of entity_id to ticker
    const tickerMap = new Map();
    listings?.forEach(listing => {
      tickerMap.set(listing.entity_id, listing.ticker);
    });

    // Find the entity that matches the requested ticker
    const entity = entities?.find(e => tickerMap.get(e.id) === ticker);
    
    if (!entity) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get the ticker and exchange info
    const listingInfo = listings?.find(l => l.entity_id === entity.id);

    // Fetch raw filings for this entity (primary source)
    const { data: rawFilings, error: filingsError } = await supabase
      .from('raw_filings')
      .select('*')
      .eq('entity_id', entity.id)
      .order('disclosed_at', { ascending: false });
    
    if (filingsError) {
      console.error('Error fetching filings:', filingsError);
    }

    // Fetch all holdings snapshots for this entity to calculate changes
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('holdings_snapshots')
      .select('*')
      .eq('entity_id', entity.id)
      .order('last_disclosed', { ascending: false });
    
    if (snapshotsError) {
      console.error('Error fetching snapshots:', snapshotsError);
    }

    // Use snapshots as primary source (they have the actual BTC data)
    // Then enrich with raw_filing metadata (titles, categories)
    let filings: Array<{
      id: string;
      date: string;
      btc: number;
      totalHoldings: number;
      btcChange: number | null;
      category: string;
      title?: string;
      pdfUrl: string;
      verified: boolean;
    }>;
    
    if (snapshots && snapshots.length > 0) {
      // Deduplicate snapshots by date first
      const uniqueSnapshots = new Map();
      snapshots.forEach(snapshot => {
        const dateKey = new Date(snapshot.last_disclosed).toISOString().split('T')[0];
        if (!uniqueSnapshots.has(dateKey)) {
          uniqueSnapshots.set(dateKey, snapshot);
        }
      });
      
      const uniqueSnapshotsArray = Array.from(uniqueSnapshots.values());
      
      // Map snapshots and try to match with raw filings for metadata
      filings = uniqueSnapshotsArray.map((snapshot, index) => {
        const previousSnapshot = uniqueSnapshotsArray[index + 1];
        const btcChange = previousSnapshot 
          ? Number(snapshot.btc) - Number(previousSnapshot.btc)
          : null;

        // Try to find matching raw filing for this date (within 7 days)
        const snapshotDate = new Date(snapshot.last_disclosed);
        const matchingFiling = rawFilings?.find(f => {
          const filingDate = new Date(f.disclosed_at);
          const daysDiff = Math.abs((snapshotDate.getTime() - filingDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff <= 7;
        });

        return {
          id: snapshot.id.toString(),
          date: snapshot.last_disclosed,
          btc: Number(snapshot.btc),
          totalHoldings: Number(snapshot.btc),
          btcChange,
          category: matchingFiling?.filing_type || 'Disclosure',
          title: matchingFiling?.title || undefined,
          pdfUrl: matchingFiling?.pdf_url || snapshot.source_url || '#',
          verified: matchingFiling?.verified || entity.verified || false,
        };
      });
    } else {
      filings = [];
    }

    // Calculate delta from last two filings
    let deltaBtc: number | null = null;
    if (filings.length >= 2) {
      deltaBtc = filings[0].btc - filings[1].btc;
    }

    // Format company data
    const company = {
      id: entity.id,
      legalName: entity.legal_name,
      ticker: listingInfo?.ticker || ticker,
      listingVenue: listingInfo?.exchange || 'HKEX',
      hq: entity.hq,
      btc: Number(entity.btc),
      deltaBtc,
      costBasisUsd: entity.cost_basis_usd ? Number(entity.cost_basis_usd) : undefined,
      lastDisclosed: entity.last_disclosed,
      source: entity.source_url,
      verified: entity.verified || false,
      marketCap: entity.market_cap ? Number(entity.market_cap) : undefined,
      region: entity.region,
      managerProfile: entity.manager_profile,
      companyType: entity.company_type,
    };

    return NextResponse.json({
      success: true,
      company,
      filings,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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

