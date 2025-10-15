import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Cron job to update market data (prices, market caps, etc.)
 * Thin wrapper that calls the update-market-data Edge Function
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    console.log('[Cron] Starting market data update...');

    // Call Edge Function to update market data
    const response = await fetch(
      `${supabaseUrl}/functions/v1/update-market-data`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Market data update failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('[Cron] Market data update completed:', { success: data.success });
    
    return NextResponse.json({ 
      success: true, 
      ...data,
      cronTimestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('[Cron] Market data update error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update market data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
} 