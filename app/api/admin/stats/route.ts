import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get total companies
    const { count: totalCompanies } = await supabase
      .from('entities')
      .select('*', { count: 'exact', head: true });

    // Get total BTC holdings
    const { data: btcData } = await supabase
      .from('entities')
      .select('estimated_btc')
      .not('estimated_btc', 'is', null);

    const totalBTC = btcData?.reduce((sum, entity) => sum + (entity.estimated_btc || 0), 0) || 0;

    // Get last scan time from recent raw_filings
    const { data: lastScanData } = await supabase
      .from('raw_filings')
      .select('created_at')
      .eq('source', 'dynamic_scanner')
      .order('created_at', { ascending: false })
      .limit(1);

    const lastScanTime = lastScanData?.[0]?.created_at 
      ? new Date(lastScanData[0].created_at).toLocaleString()
      : null;

    // Get pending approvals (unverified filings from dynamic scanner)
    const { count: pendingApprovals } = await supabase
      .from('raw_filings')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'dynamic_scanner')
      .eq('verified', false);

    // Get scans today
    const today = new Date().toISOString().split('T')[0];
    const { count: scansToday } = await supabase
      .from('raw_filings')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'dynamic_scanner')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    return NextResponse.json({
      totalCompanies: totalCompanies || 0,
      totalBTC: totalBTC,
      lastScanTime: lastScanTime,
      pendingApprovals: pendingApprovals || 0,
      scansToday: scansToday || 0,
    });

  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load stats' },
      { status: 500 }
    );
  }
}