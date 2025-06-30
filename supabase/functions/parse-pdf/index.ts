import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFParser, SimplePDFParser } from '../../../lib/parsers/pdf-parser.ts'
import { DatabaseHelpers, ValidationSchemas } from '../../../lib/services/database-helpers.ts'
import { monitoring } from '../../../lib/services/monitoring.ts'
import { extractBitcoinInfo, determineFilingType } from '../../../lib/parsers/bitcoin-extractor.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PDFParseRequest {
  url: string;
  filingId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const dbHelpers = new DatabaseHelpers(supabase);
    const pdfParser = new PDFParser();
    
    const { url, filingId }: PDFParseRequest = await req.json();
    
    // Validate input
    const validated = dbHelpers.validateInput(
      { url, filingId },
      { url: ValidationSchemas.url }
    );
    
    if (!filingId) {
      throw new Error('Missing required field: filingId');
    }
    
    monitoring.info('parse-pdf', `Starting PDF parse: ${url} for filing ${filingId}`);
    
    // Parse PDF with monitoring
    const parseResult = await monitoring.trackPerformance(
      'pdf_parse',
      async () => {
        const result = await pdfParser.parseFromUrl(validated.url);
        
        // If main parser fails, try simple parser
        if (result.error && result.text.length === 0) {
          monitoring.warn('parse-pdf', 'Primary parser failed, trying fallback', { error: result.error });
          
          const response = await fetch(validated.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; BitcoinTreasuries/1.0)',
              'Accept': 'application/pdf,*/*',
            }
          });
          
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const simplePdfParser = new SimplePDFParser();
            return await simplePdfParser.parse(buffer);
          }
        }
        
        return result;
      },
      { url: validated.url, filingId }
    );
    
    if (parseResult.error && parseResult.text.length === 0) {
      throw new Error(`PDF parsing failed: ${parseResult.error}`);
    }
    
    if (parseResult.text.length < 100) {
      monitoring.warn('parse-pdf', 'PDF has insufficient text', { 
        textLength: parseResult.text.length,
        url: validated.url 
      });
    }
    
    // Extract Bitcoin information
    const bitcoinInfo = extractBitcoinInfo(parseResult.text);
    
    // Determine filing type
    const filingType = determineFilingType(bitcoinInfo.btcDelta, bitcoinInfo.btcTotal, bitcoinInfo.isDisposal);
    
    // Sanitize extracted text
    const sanitizedText = dbHelpers.sanitizeText(parseResult.text.slice(0, 10000));
    
    // Update the filing record
    const updateData: any = {
      extracted_text: sanitizedText,
      filing_type: filingType,
      detected_in: 'body',
      updated_at: new Date().toISOString()
    };
    
    if (bitcoinInfo.btcDelta !== null) {
      updateData.btc_delta = bitcoinInfo.btcDelta;
      updateData.btc = Math.abs(bitcoinInfo.btcDelta); // Store absolute value in btc field for compatibility
    }
    
    if (bitcoinInfo.btcTotal !== null) {
      updateData.btc_total = bitcoinInfo.btcTotal;
      updateData.total_holdings = bitcoinInfo.btcTotal;
      if (!bitcoinInfo.btcDelta) {
        updateData.btc = bitcoinInfo.btcTotal; // Use total if no delta
      }
    }
    
    const { error: updateError } = await monitoring.trackPerformance(
      'update_filing',
      async () => {
        const result = await supabase
          .from('raw_filings')
          .update(updateData)
          .eq('id', filingId);
        
        if (result.error) throw result.error;
        return result;
      },
      { filingId }
    );
    
    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    const duration = Date.now() - startTime;
    monitoring.info('parse-pdf', `Successfully parsed PDF for filing ${filingId}`, {
      btcDelta: bitcoinInfo.btcDelta,
      btcTotal: bitcoinInfo.btcTotal,
      filingType,
      pageCount: parseResult.pageCount,
      duration
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        filingId,
        extracted: {
          btcDelta: bitcoinInfo.btcDelta,
          btcTotal: bitcoinInfo.btcTotal,
          filingType,
          pageCount: parseResult.pageCount,
          detectedIn: 'body',
          textLength: parseResult.text.length
        },
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    monitoring.error('parse-pdf', 'PDF parsing failed', error as Error, { filingId });
    
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