import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,hkd'
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch prices');
    }

    const data = await response.json();
    const btcUsd = data.bitcoin?.usd || 0;
    const hkdUsd = 7.8; // Fixed rate for now, or use data.bitcoin?.hkd if available

    // Store in Supabase
    const supabase = await createClient();
    const { error } = await supabase
      .from('price_snapshots')
      .insert({
        btc_usd: btcUsd,
        hkd_usd: hkdUsd,
      });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      btc_usd: btcUsd,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Price fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' }, 
      { status: 500 }
    );
  }
} 