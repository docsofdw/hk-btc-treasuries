import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import * as pdfParse from 'https://esm.sh/pdf-parse@1.1.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PDFParseRequest {
  url: string;
  filingId: string;
}

interface BitcoinInfo {
  btcDelta: number | null;
  btcTotal: number | null;
  isDisposal: boolean;
}

async function extractBitcoinInfo(text: string): Promise<BitcoinInfo> {
  // Patterns for different types of Bitcoin mentions
  const patterns = {
    // Acquisitions
    purchased: /(?:purchased?|acquired?|bought)\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/gi,
    
    // Disposals (negative)
    sold: /(?:sold|disposed?\s+of|divested)\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/gi,
    
    // Total holdings
    totalHoldings: /(?:total\s+(?:bitcoin|btc)\s+holdings?|now\s+holds?|current\s+holdings?)\s*(?:of|:)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/gi,
    
    // Alternative patterns
    btcAmount: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/gi,
  };
  
  let btcDelta = null;
  let btcTotal = null;
  let isDisposal = false;
  
  // Check for specific transaction types first
  const disposalMatch = text.match(patterns.sold);
  if (disposalMatch && disposalMatch.length > 0) {
    const match = disposalMatch[0].match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
    if (match) {
      btcDelta = -parseFloat(match[1].replace(/,/g, ''));
      isDisposal = true;
    }
  }
  
  if (!btcDelta) {
    const acquisitionMatch = text.match(patterns.purchased);
    if (acquisitionMatch && acquisitionMatch.length > 0) {
      const match = acquisitionMatch[0].match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
      if (match) {
        btcDelta = parseFloat(match[1].replace(/,/g, ''));
      }
    }
  }
  
  // Check for total holdings
  const totalMatch = text.match(patterns.totalHoldings);
  if (totalMatch && totalMatch.length > 0) {
    const match = totalMatch[0].match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
    if (match) {
      btcTotal = parseFloat(match[1].replace(/,/g, ''));
    }
  }
  
  // If no specific patterns found, look for any Bitcoin amounts
  if (!btcDelta && !btcTotal) {
    const amountMatches = [...text.matchAll(patterns.btcAmount)];
    if (amountMatches.length > 0) {
      // Use the largest amount found as it's likely the most relevant
      const amounts = amountMatches.map(match => parseFloat(match[1].replace(/,/g, '')));
      btcTotal = Math.max(...amounts);
    }
  }
  
  return { btcDelta, btcTotal, isDisposal };
}

function determineFilingType(btcDelta: number | null, btcTotal: number | null, isDisposal: boolean): string {
  if (btcDelta) {
    return isDisposal ? 'disposal' : 'acquisition';
  } else if (btcTotal) {
    return 'update';
  }
  return 'disclosure';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { url, filingId }: PDFParseRequest = await req.json();
    
    if (!url || !filingId) {
      throw new Error('Missing required fields: url and filingId');
    }
    
    console.log(`Parsing PDF: ${url} for filing ${filingId}`);
    
    // Fetch PDF with proper headers
    const pdfResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BitcoinTreasuries/1.0)',
        'Accept': 'application/pdf,*/*',
      }
    });
    
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    
    if (pdfBuffer.byteLength === 0) {
      throw new Error('Empty PDF response');
    }
    
    // Parse PDF
    const data = await pdfParse.default(Buffer.from(pdfBuffer));
    
    if (!data.text || data.text.length < 100) {
      throw new Error('PDF parsing failed or returned insufficient text');
    }
    
    // Extract Bitcoin information
    const { btcDelta, btcTotal, isDisposal } = await extractBitcoinInfo(data.text);
    
    // Determine filing type
    const filingType = determineFilingType(btcDelta, btcTotal, isDisposal);
    
    // Update the filing record
    const updateData: any = {
      extracted_text: data.text.slice(0, 10000), // Store first 10k chars
      filing_type: filingType,
      detected_in: 'body',
      updated_at: new Date().toISOString()
    };
    
    if (btcDelta !== null) {
      updateData.btc_delta = btcDelta;
      updateData.btc = Math.abs(btcDelta); // Store absolute value in btc field for compatibility
    }
    
    if (btcTotal !== null) {
      updateData.btc_total = btcTotal;
      updateData.total_holdings = btcTotal;
      if (!btcDelta) {
        updateData.btc = btcTotal; // Use total if no delta
      }
    }
    
    const { error: updateError } = await supabase
      .from('raw_filings')
      .update(updateData)
      .eq('id', filingId);
    
    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    console.log(`Successfully parsed PDF for filing ${filingId}:`, {
      btcDelta,
      btcTotal,
      filingType,
      pageCount: data.numpages
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        filingId,
        extracted: {
          btcDelta,
          btcTotal,
          filingType,
          pageCount: data.numpages,
          detectedIn: 'body',
          textLength: data.text.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('PDF parse error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 