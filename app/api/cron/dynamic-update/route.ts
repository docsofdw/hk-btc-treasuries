import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Cron job to run dynamic AI discovery for new Bitcoin holdings
 * Thin wrapper that calls the dynamic-data-updater Edge Function
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

    console.log('[Cron] Starting dynamic AI discovery...');

    // Call Edge Function for AI-powered discovery
    const response = await fetch(
      `${supabaseUrl}/functions/v1/dynamic-data-updater`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Dynamic update failed: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('[Cron] Dynamic update completed:', { success: data.success });
    
    return NextResponse.json({ 
      success: true, 
      ...data,
      cronTimestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('[Cron] Dynamic update error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to run dynamic update',
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