import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Seed data for MVP
    const seedData = [
      {
        ticker: "1357.HK",
        legalName: "Meitu, Inc.",
        listingVenue: "HKEX",
        hq: "Xiamen, China",
        btc: 940,
        costBasisUsd: 49500000,
        lastDisclosed: "2021-03-17",
        source: "https://www1.hkexnews.hk/listedco/listconews/sehk/2021/0317/2021031700406.pdf",
        region: "China"
      },
      {
        ticker: "0434.HK",
        legalName: "Boyaa Interactive International Limited",
        listingVenue: "HKEX",
        hq: "Shenzhen, China",
        btc: 2641,
        costBasisUsd: 142720000,
        lastDisclosed: "2024-04-15",
        source: "https://www1.hkexnews.hk/listedco/listconews/sehk/2024/0415/2024041500483.pdf",
        region: "China"
      }
    ];

    let insertedCount = 0;

    for (const data of seedData) {
      // Check if entity exists
      const { data: existing } = await supabase
        .from('entities')
        .select('id')
        .eq('ticker', data.ticker)
        .single();
      
      let entityId = existing?.id;
      
      if (!entityId) {
        // Create new entity
        const { data: newEntity, error: entityError } = await supabase
          .from('entities')
          .insert({
            legal_name: data.legalName,
            ticker: data.ticker,
            listing_venue: data.listingVenue,
            hq: data.hq,
            region: data.region
          })
          .select()
          .single();
        
        if (entityError) throw entityError;
        entityId = newEntity.id;
      }
      
      // Add holding snapshot (always add new snapshot for history)
      const { error: snapshotError } = await supabase
        .from('holdings_snapshots')
        .insert({
          entity_id: entityId,
          btc: data.btc,
          cost_basis_usd: data.costBasisUsd,
          last_disclosed: data.lastDisclosed,
          source_url: data.source,
          data_source: 'filing'
        });
      
      if (snapshotError) throw snapshotError;
      insertedCount++;
    }

    return new Response(
      JSON.stringify({ success: true, count: insertedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function determineVenue(ticker: string): string {
  if (ticker.includes('.HK')) return 'HKEX';
  if (ticker.includes('.SZ')) return 'SZSE';
  if (ticker.includes('.SH')) return 'SSE';
  if (!ticker.includes('.')) return 'NASDAQ';
  return 'NYSE';
}

function determineHQ(company: string, ticker: string): string {
  const companyLower = company.toLowerCase();
  if (ticker.includes('.HK') || companyLower.includes('hong kong')) return 'Hong Kong';
  if (companyLower.includes('beijing')) return 'Beijing, China';
  if (companyLower.includes('shanghai')) return 'Shanghai, China';
  if (companyLower.includes('shenzhen')) return 'Shenzhen, China';
  return 'China';
} 