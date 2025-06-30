import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface Filing {
  id: string;
  company: string;
  ticker: string;
  filing_type: 'acquisition' | 'disposal' | 'disclosure' | 'update';
  btc_amount: number | null;
  total_holdings: number | null;
  pdf_url: string;
  date: string;
  verified: boolean;
  title?: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Query the materialized view directly
    const { data, error } = await supabase
      .from('mv_recent_hkex_filings')
      .select('*')
      .order('date', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch filings', message: error.message },
        { status: 500 }
      );
    }
    
    // Transform to match the Filing interface
    const filings: Filing[] = (data || []).map(row => ({
      id: row.id.toString(),
      company: row.company,
      ticker: row.ticker,
      filing_type: row.filing_type || 'disclosure',
      btc_amount: row.btc_amount ? parseFloat(row.btc_amount) : null,
      total_holdings: row.total_holdings ? parseFloat(row.total_holdings) : null,
      pdf_url: row.pdf_url,
      date: row.date,
      verified: row.verified || false,
      title: row.title || undefined
    }));
    
    return NextResponse.json({ filings });
    
  } catch (error) {
    console.error('Error fetching HKEX filings:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch filings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 