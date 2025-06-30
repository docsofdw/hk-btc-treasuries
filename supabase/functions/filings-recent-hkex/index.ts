import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface Filing {
  id: string;
  company: string;
  ticker: string;
  filing_type: 'acquisition' | 'disposal' | 'disclosure' | 'update';
  btc_amount: number | null;
  total_holdings: number | null;
  pdf_url: string;
  date: string;
  verified: boolean;
  title?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Query the materialized view
    const { data, error } = await supabase
      .from('mv_recent_hkex_filings')
      .select('*')
      .order('date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Transform to match the Filing interface
    const filings: Filing[] = (data || []).map(row => ({
      id: row.id.toString(),
      company: row.company,
      ticker: row.ticker,
      filing_type: row.filing_type || 'disclosure',
      btc_amount: row.btc_amount ? parseFloat(row.btc_amount) : null,
      total_holdings: row.total_holdings ? parseFloat(row.total_holdings) : null,
      pdf_url: row.pdf_url,
      date: row.date,
      verified: row.verified || false,
      title: row.title || undefined
    }));

    return new Response(
      JSON.stringify({ filings }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 