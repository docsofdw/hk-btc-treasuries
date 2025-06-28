import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface Filing {
  id: string;
  company: string;
  ticker: string;
  type: 'acquisition' | 'disposal' | 'disclosure' | 'update';
  btcAmount: number;
  totalHoldings: number;
  source: string;
  date: string;
  verified: boolean;
  exchange: string;
  documentType?: string;
  title?: string;
  summary?: string;
  listingVenue: string;
}

interface RawFilingData {
  id: number;
  btc: string | number;
  disclosed_at: string;
  pdf_url: string;
  source: string;
  title: string | null;
  filing_type: string | null;
  document_type: string | null;
  total_holdings: string | number | null;
  verified: boolean;
  summary: string | null;
  extracted_text: string | null;
  entities: {
    legal_name: string;
    ticker: string;
    listing_venue: string;
  } | {
    legal_name: string;
    ticker: string;
    listing_venue: string;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source'); // 'raw' to use raw_filings table
    const limit = parseInt(searchParams.get('limit') || '20');
    const verified = searchParams.get('verified'); // 'true' to filter verified only
    const exchange = searchParams.get('exchange'); // Filter by specific exchange
    
    const supabase = await createClient();
    
    if (source === 'raw') {
      // Fetch from raw_filings table
      let query = supabase
        .from('raw_filings')
        .select(`
          id,
          btc,
          disclosed_at,
          pdf_url,
          source,
          title,
          filing_type,
          document_type,
          total_holdings,
          verified,
          summary,
          extracted_text,
          entities!inner(
            legal_name,
            ticker,
            listing_venue
          )
        `)
        .in('source', ['HKEX', 'SEC'])
        .order('disclosed_at', { ascending: false });
      
      // Apply filters
      if (verified === 'true') {
        query = query.eq('verified', true);
      }
      
      if (exchange) {
        query = query.eq('source', exchange);
      }
      
      query = query.limit(limit);
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      const filings: Filing[] = data?.map((filing: RawFilingData) => {
        const entity = Array.isArray(filing.entities) ? filing.entities[0] : filing.entities;
        return {
        id: filing.id.toString(),
        company: entity.legal_name,
        ticker: entity.ticker,
        type: (filing.filing_type as Filing['type']) || 'disclosure',
        btcAmount: parseFloat(filing.btc?.toString() || '0'),
        totalHoldings: parseFloat(filing.total_holdings?.toString() || filing.btc?.toString() || '0'),
        source: filing.pdf_url,
        date: filing.disclosed_at,
        verified: filing.verified || false,
        exchange: filing.source, // HKEX or SEC
        documentType: filing.document_type || undefined,
        title: filing.title || undefined,
        summary: filing.summary || filing.extracted_text?.slice(0, 200) || undefined,
        listingVenue: entity.listing_venue
      };
      }) || [];
      
      return NextResponse.json({ filings });
      
    } else {
      // Return empty array instead of mock data
      return NextResponse.json({ filings: [] });
    }
    
  } catch (error) {
    console.error('Error fetching filings:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch filings',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// Support POST for more complex queries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters = {}, limit = 20, offset = 0 } = body;
    
    const supabase = await createClient();
    
    let query = supabase
      .from('raw_filings')
      .select(`
        id,
        btc,
        disclosed_at,
        pdf_url,
        source,
        title,
        filing_type,
        document_type,
        total_holdings,
        verified,
        summary,
        extracted_text,
        entities!inner(
          legal_name,
          ticker,
          listing_venue
        )
      `)
      .order('disclosed_at', { ascending: false });
    
    // Apply filters
    if (filters.source) {
      query = query.in('source', Array.isArray(filters.source) ? filters.source : [filters.source]);
    }
    
    if (filters.verified !== undefined) {
      query = query.eq('verified', filters.verified);
    }
    
    if (filters.filing_type) {
      query = query.in('filing_type', Array.isArray(filters.filing_type) ? filters.filing_type : [filters.filing_type]);
    }
    
    if (filters.ticker) {
      query = query.eq('entities.ticker', filters.ticker);
    }
    
    if (filters.date_from) {
      query = query.gte('disclosed_at', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte('disclosed_at', filters.date_to);
    }
    
    query = query.range(offset, offset + limit - 1);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const filings: Filing[] = data?.map((filing: RawFilingData) => {
      const entity = Array.isArray(filing.entities) ? filing.entities[0] : filing.entities;
      return {
      id: filing.id.toString(),
      company: entity.legal_name,
      ticker: entity.ticker,
      type: (filing.filing_type as Filing['type']) || 'disclosure',
      btcAmount: parseFloat(filing.btc?.toString() || '0'),
      totalHoldings: parseFloat(filing.total_holdings?.toString() || filing.btc?.toString() || '0'),
      source: filing.pdf_url,
      date: filing.disclosed_at,
      verified: filing.verified || false,
      exchange: filing.source,
      documentType: filing.document_type || undefined,
      title: filing.title || undefined,
      summary: filing.summary || filing.extracted_text?.slice(0, 200) || undefined,
      listingVenue: entity.listing_venue
    };
    }) || [];
    
    return NextResponse.json({ filings, total: filings.length });
    
  } catch (error) {
    console.error('Error in POST filings:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch filings',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 