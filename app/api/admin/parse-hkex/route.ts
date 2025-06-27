import { NextRequest, NextResponse } from 'next/server';
import { HKEXParser } from '@/lib/parsers/hkex-parser';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs'; // Use nodejs runtime for server-side operations

export async function POST(request: NextRequest) {
  try {
    // Basic auth check - you can enhance this with proper auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { ticker, entityId } = await request.json();
    
    if (!ticker || !entityId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create Supabase client server-side
    const supabase = await createClient();
    
    // Pass the client to the parser
    const parser = new HKEXParser(supabase);
    await parser.processCompany(ticker, entityId);
    
    // Refresh materialized view
    await supabase.rpc('refresh_latest_snapshot');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
  }
} 