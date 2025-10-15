import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { ticker, marketCap, price } = await request.json();
    
    if (!ticker || !marketCap) {
      return NextResponse.json({ error: 'Ticker and market cap are required' }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    // Update the entity with new market data
    const { error: updateError } = await supabase
      .from('entities')
      .update({
        market_cap: parseInt(marketCap),
        market_data_updated_at: new Date().toISOString()
      })
      .eq('ticker', ticker);
    
    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update entity' }, { status: 500 });
    }
    
    // ✅ No manual refresh needed! Triggers automatically update latest_snapshot
    
    return NextResponse.json({
      success: true,
      message: `Updated ${ticker} with market cap $${Number(marketCap).toLocaleString()}`,
      ticker,
      marketCap: parseInt(marketCap)
    });
    
  } catch (error) {
    console.error('Manual update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 