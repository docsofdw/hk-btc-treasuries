import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  // Verify this is a Vercel cron job request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Fetch current Bitcoin price
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (!response.ok) {
      throw new Error('Failed to fetch BTC price');
    }
    
    const data = await response.json();
    const btcPrice = data.bitcoin?.usd;
    
    if (!btcPrice) {
      throw new Error('Invalid price data');
    }
    
    // Store in Supabase
    const supabase = await createClient();
    const { error } = await supabase
      .from('price_history')
      .insert({
        asset: 'BTC',
        price_usd: btcPrice,
        timestamp: new Date().toISOString()
      });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ 
      success: true, 
      price: btcPrice,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    );
  }
} 