import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Function to acquire advisory lock
async function acquireLock(supabase: any, lockName: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('try_advisory_lock', {
    lock_name: lockName
  });
  
  if (error) {
    console.error('Error acquiring lock:', error);
    return false;
  }
  
  return data === true;
}

async function releaseLock(supabase: any, lockName: string): Promise<void> {
  const { error } = await supabase.rpc('release_advisory_lock', {
    lock_name: lockName
  });
  
  if (error) {
    console.error('Error releasing lock:', error);
  }
}

interface Entity {
  id: string;
  ticker: string;
  legal_name: string;
}

interface SECFiling {
  title: string;
  date: string;
  url: string;
  form: string;
  accessionNumber: string;
  cik?: string;
}

interface FilingContent {
  btc: number | null;
  text: string;
}

// SEC EDGAR API endpoints
const EDGAR_SEARCH_BASE = 'https://efts.sec.gov/LATEST/search-index';
const EDGAR_ARCHIVES_BASE = 'https://www.sec.gov/Archives/edgar/data';

// Map of tickers to CIKs for Chinese companies/ADRs that might hold Bitcoin
const CIK_MAP: Record<string, string> = {
  'NCTY': '0001104657', // The9 Limited
  'CAN': '0001780652',  // Canaan Inc
  'BTDR': '0001917249', // Bitdeer Technologies
  'NA': '0001937240',   // Nano Labs Ltd.
  'BTCM': '0001763912', // BIT Mining Ltd.
  'EBON': '0001799290', // Ebang International
  'BTBT': '0001717081', // Bit Digital Inc
  'RIOT': '0001167419', // Riot Platforms Inc
  'MARA': '0001507605', // Marathon Digital Holdings
  'MSTR': '0001050446', // MicroStrategy Inc
  'TSLA': '0001318605', // Tesla Inc
  'SQ': '0001512673',   // Block Inc
  'COIN': '0001679788', // Coinbase Global Inc
  'HUT': '0001892492',  // Hut 8 Mining Corp
  // Add more as needed
};

const BITCOIN_KEYWORDS = [
  'bitcoin', 'btc', 'digital asset', 'cryptocurrency', 'crypto asset',
  'virtual currency', 'digital currency', 'blockchain asset'
];

async function searchSECFilings(ticker: string, cik: string, searchAllFilings = false): Promise<SECFiling[]> {
  try {
    // Calculate date range (last 6 months)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 180 * 24 * 60 * 60 * 1000);
    
    const searchParams = {
      dateRange: 'custom',
      startdt: startDate.toISOString().split('T')[0],
      enddt: endDate.toISOString().split('T')[0],
      ciks: [cik],
      forms: ['8-K', '10-Q', '10-K', '20-F', '6-K', 'S-1', 'S-3', 'DEF 14A'],
      from: 0,
      size: 100
    };
    
    const response = await fetch(EDGAR_SEARCH_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HK-BTC-Treasuries research@example.com', // Replace with your contact
        'Accept': 'application/json',
      },
      body: JSON.stringify(searchParams)
    });
    
    if (!response.ok) {
      console.error(`SEC search failed for ${ticker}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const filings: SECFiling[] = [];
    
    for (const hit of data.hits?.hits || []) {
      const filing = hit._source;
      
      const displayNames = filing.display_names?.join(' ') || '';
      const hasKeywords = BITCOIN_KEYWORDS.some(keyword => 
        displayNames.toLowerCase().includes(keyword) ||
        filing.form?.toLowerCase().includes(keyword)
      );
      
      // For known entities, include all filings OR Bitcoin-related ones
      // For unknown entities, only Bitcoin-related filings  
      const shouldInclude = searchAllFilings || hasKeywords || isLikelyBitcoinFiling(filing.form, displayNames);
      
      if (shouldInclude) {
        const accessionNumber = filing.accession_number?.replace(/-/g, '') || '';
        const fileName = filing.file_name || `${accessionNumber}.txt`;
        
        filings.push({
          title: displayNames || `${filing.form} Filing`,
          date: filing.file_date || filing.period_ending || new Date().toISOString().split('T')[0],
          url: `${EDGAR_ARCHIVES_BASE}/${filing.cik}/${accessionNumber}/${fileName}`,
          form: filing.form || 'Unknown',
          accessionNumber: filing.accession_number || ''
        });
      }
    }
    
    return filings;
  } catch (error) {
    console.error(`Error searching SEC for ${ticker}:`, error);
    return [];
  }
}

function isLikelyBitcoinFiling(form: string, displayNames: string): boolean {
  // 8-K filings often contain material events like Bitcoin purchases
  if (form === '8-K') return true;
  
  // Check for treasury-related terms that might indicate Bitcoin holdings
  const treasuryTerms = ['treasury', 'investment', 'asset', 'purchase', 'acquisition'];
  return treasuryTerms.some(term => displayNames.toLowerCase().includes(term));
}

async function extractFilingContent(url: string): Promise<FilingContent> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HK-BTC-Treasuries research@example.com',
        'Accept': 'text/html,application/xhtml+xml,text/plain',
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch filing: ${response.status}`);
      return { btc: null, text: '' };
    }
    
    let content = await response.text();
    
    // Remove HTML tags and clean up text
    content = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Extract Bitcoin amount using various patterns
    const btcAmount = extractBitcoinAmount(content);
    
    return { 
      btc: btcAmount, 
      text: content.slice(0, 3000) // Limit text for storage
    };
  } catch (error) {
    console.error('Error extracting filing content:', error);
    return { btc: null, text: '' };
  }
}

function extractBitcoinAmount(text: string): number | null {
  const patterns = [
    // Direct purchase statements
    /purchased?\s+(?:approximately\s+)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*bitcoin/i,
    /acquired?\s+(?:approximately\s+)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/i,
    /bought?\s+(?:approximately\s+)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/i,
    
    // Holdings statements
    /(?:holds?|holding)\s+(?:approximately\s+)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/i,
    /bitcoin\s+holdings?\s*(?:of\s*)?(?:approximately\s+)?(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /total\s+bitcoin\s*:\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    
    // General amount patterns
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)(?:\s+(?:purchased|acquired|held))?/i,
    /(?:bitcoin|btc)[:\s]+(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    
    // Value-based extraction (less reliable)
    /bitcoin\s+valued\s+at\s+\$[\d,]+\s+representing\s+(\d+(?:,\d{3})*(?:\.\d+)?)/i,
  ];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(new RegExp(pattern.source, 'gi'))];
    for (const match of matches) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0 && amount < 10000000) { // Sanity check
        return amount;
      }
    }
  }
  
  return null;
}

function determineFilingType(form: string, content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('purchase') || lowerContent.includes('acquired') || lowerContent.includes('bought')) {
    return 'acquisition';
  } else if (lowerContent.includes('sale') || lowerContent.includes('sold') || lowerContent.includes('disposal')) {
    return 'disposal';
  } else if (form === '10-K' || form === '10-Q' || form === '20-F') {
    return 'disclosure';
  } else if (lowerContent.includes('update') || lowerContent.includes('amended')) {
    return 'update';
  }
  
  return 'disclosure';
}

async function searchBroadSECFilings(): Promise<SECFiling[]> {
  try {
    // Search for Bitcoin-related filings across all entities
    const searchParams = {
      q: 'bitcoin OR btc OR "digital asset" OR cryptocurrency',
      dateRange: 'custom',
      startdt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
      enddt: new Date().toISOString().split('T')[0],
      forms: ['8-K', '10-Q', '10-K', '20-F', '6-K'],
      from: 0,
      size: 50
    };
    
    const response = await fetch(EDGAR_SEARCH_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HK-BTC-Treasuries research@example.com',
        'Accept': 'application/json',
      },
      body: JSON.stringify(searchParams)
    });
    
    if (!response.ok) {
      console.error(`SEC broad search failed: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const filings: SECFiling[] = [];
    
    for (const hit of data.hits?.hits || []) {
      const filing = hit._source;
      const displayNames = filing.display_names?.join(' ') || '';
      
      // Only include filings that actually mention Bitcoin
      const hasKeywords = BITCOIN_KEYWORDS.some(keyword => 
        displayNames.toLowerCase().includes(keyword)
      );
      
      if (hasKeywords) {
        const accessionNumber = filing.accession_number?.replace(/-/g, '') || '';
        const fileName = filing.file_name || `${accessionNumber}.txt`;
        
        filings.push({
          title: displayNames || `${filing.form} Filing`,
          date: filing.file_date || filing.period_ending || new Date().toISOString().split('T')[0],
          url: `${EDGAR_ARCHIVES_BASE}/${filing.cik}/${accessionNumber}/${fileName}`,
          form: filing.form || 'Unknown',
          accessionNumber: filing.accession_number || '',
          cik: filing.cik // Add CIK for entity identification
        });
      }
    }
    
    return filings;
  } catch (error) {
    console.error('Error in broad SEC search:', error);
    return [];
  }
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
    
    // Acquire lock to prevent concurrent scans
    const lockName = 'scan-sec-filings';
    const hasLock = await acquireLock(supabase, lockName);
    if (!hasLock) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Another SEC scan is already in progress',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('Acquired lock for SEC filing scan');
    
    // Get entities that might file with SEC (US exchanges and ADRs)
    const { data: entities, error: entitiesError } = await supabase
      .from('entities')
      .select('id, ticker, legal_name')
      .in('listing_venue', ['NASDAQ', 'NYSE'])
      .or('region.eq.ADR,region.eq.China');
    
    if (entitiesError) throw entitiesError;
    
    const results = [];
    let totalScanned = 0;
    let totalFound = 0;
    
    // Phase 1: Scan ALL filings for known entities
    for (const entity of entities || []) {
      const cik = CIK_MAP[entity.ticker];
      if (!cik) {
        console.log(`No CIK found for ${entity.ticker}, skipping`);
        continue;
      }
      
      console.log(`Scanning ALL filings for ${entity.ticker} (CIK: ${cik})`);
      totalScanned++;
      
      try {
        // Search ALL filings for known entities (not just Bitcoin-related)
        const filings = await searchSECFilings(entity.ticker, cik, true);
        
        for (const filing of filings) {
          try {
            const content = await extractFilingContent(filing.url);
            
            // Store all filings from known entities
            const filingType = determineFilingType(filing.form, content.text);
            
            const { error } = await supabase
              .from('raw_filings')
              .upsert({
                entity_id: entity.id,
                btc: content.btc || 0,
                disclosed_at: filing.date,
                pdf_url: filing.url,
                source: 'SEC',
                title: filing.title,
                document_type: filing.form,
                extracted_text: content.text.slice(0, 1000),
                filing_type: filingType,
                verified: false,
                total_holdings: content.btc || null
              }, {
                onConflict: 'entity_id,pdf_url'
              });
            
            if (!error) {
              totalFound++;
              results.push({ 
                entity: entity.ticker, 
                filing: filing.title,
                form: filing.form,
                btc: content.btc,
                type: filingType,
                date: filing.date,
                source: 'known_entity'
              });
            } else {
              console.error(`Error storing filing for ${entity.ticker}:`, error);
            }
            
            // Rate limiting for SEC (be respectful)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (filingError) {
            console.error(`Error processing filing for ${entity.ticker}:`, filingError);
          }
        }
        
        // Additional rate limiting between entities
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (entityError) {
        console.error(`Error scanning ${entity.ticker}:`, entityError);
      }
    }
    
    // Phase 2: Broad search for Bitcoin-related filings from unknown entities
    console.log('Starting broad search for Bitcoin-related SEC filings...');
    try {
      const broadFilings = await searchBroadSECFilings();
      
      for (const filing of broadFilings) {
        try {
          // Check if this CIK is already in our entities or CIK_MAP
          const isKnownEntity = Object.values(CIK_MAP).includes(filing.cik) || 
                               entities?.some(e => CIK_MAP[e.ticker] === filing.cik);
          
          if (!isKnownEntity) {
            const content = await extractFilingContent(filing.url);
            
            if (content.btc && content.btc > 0) {
              // This is a new entity with Bitcoin holdings
              // First, try to get company name from SEC data
              let companyName = `Unknown Company (CIK: ${filing.cik})`;
              
              // Create a placeholder entity for now
              const { data: newEntity, error: entityError } = await supabase
                .from('entities')
                .insert({
                  legal_name: companyName,
                  ticker: `SEC-${filing.cik}`,
                  listing_venue: 'NASDAQ', // Default assumption
                  hq: 'TBD',
                  region: 'US'
                })
                .select()
                .single();
              
              if (!entityError && newEntity) {
                const filingType = determineFilingType(filing.form, content.text);
                
                // Store the filing
                const { error } = await supabase
                  .from('raw_filings')
                  .upsert({
                    entity_id: newEntity.id,
                    btc: content.btc,
                    disclosed_at: filing.date,
                    pdf_url: filing.url,
                    source: 'SEC',
                    title: filing.title,
                    document_type: filing.form,
                    extracted_text: content.text.slice(0, 1000),
                    filing_type: filingType,
                    verified: false,
                    total_holdings: content.btc
                  }, {
                    onConflict: 'entity_id,pdf_url'
                  });
                
                if (!error) {
                  totalFound++;
                  results.push({ 
                    entity: `SEC-${filing.cik}`,
                    filing: filing.title,
                    form: filing.form,
                    btc: content.btc,
                    type: filingType,
                    date: filing.date,
                    source: 'broad_search_new_entity'
                  });
                }
              }
            }
          }
          
          // Rate limiting for broad search
          await new Promise(resolve => setTimeout(resolve, 1500));
          
        } catch (filingError) {
          console.error(`Error processing broad search filing:`, filingError);
        }
      }
    } catch (broadSearchError) {
      console.error('Error in broad search:', broadSearchError);
    }
    
    // Release the lock
    await releaseLock(supabase, lockName);
    console.log('Released lock for SEC filing scan');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        scanned: totalScanned,
        found: totalFound,
        results,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in scan-sec-filings:', error);
    
    // Try to release lock on error
    try {
      if (supabase && lockName) {
        await releaseLock(supabase, lockName);
      }
    } catch (lockError) {
      console.error('Error releasing lock after failure:', lockError);
    }
    
    return new Response(
      JSON.stringify({ 
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