import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    // For MVP, just ensure we have fresh data
    const supabase = await createClient();
    
    // Check if we have recent data
    const { data: latestExport } = await supabase
      .from('raw_exports')
      .select('downloaded_at')
      .order('downloaded_at', { ascending: false })
      .limit(1)
      .single();
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (!latestExport || new Date(latestExport.downloaded_at) < oneHourAgo) {
      // Trigger edge function
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-export`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger edge function');
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in fetch-treasuries cron:', error);
    return NextResponse.json(
      { error: 'Failed to check/fetch data' },
      { status: 500 }
    );
  }
} 