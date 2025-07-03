import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TreasuryManager } from '@/lib/services/treasury-manager';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.ticker || !data.legalName) {
      return NextResponse.json(
        { error: 'Missing required fields: ticker and legalName' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const treasuryManager = new TreasuryManager(supabase);
    
    const result = await treasuryManager.addOrUpdateEntity({
      ticker: data.ticker,
      legalName: data.legalName,
      btc: data.btc || 0,
      costBasisUsd: data.costBasisUsd,
      sourceUrl: data.sourceUrl || '',
      lastDisclosed: data.lastDisclosed || new Date().toISOString(),
      exchange: data.exchange,
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Manual treasury update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update treasury' },
      { status: 500 }
    );
  }
} 