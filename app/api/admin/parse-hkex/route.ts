import { NextRequest, NextResponse } from 'next/server';
import { HKEXParser } from '@/lib/parsers/hkex-parser';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { ticker, entityId } = await request.json();
    
    if (!ticker || !entityId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const parser = new HKEXParser();
    await parser.processCompany(ticker, entityId);
    
    // Refresh materialized view
    const supabase = createClient();
    await supabase.rpc('refresh_latest_snapshot');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
  }
} 