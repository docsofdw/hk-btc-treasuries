import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface Entity {
  id: string;
  ticker: string;
  legal_name: string;
}

interface Filing {
  title: string;
  date: string;
  url: string;
  type: string;
  stockCode?: string;
}

interface ParsedFiling {
  btc: number | null;
  text: string;
}

// Bitcoin keywords regex for detection (case-insensitive)
// Used to flag Bitcoin-related announcements
const BITCOIN_KEYWORDS_REGEX = /(bitcoin|btc|cryptocurrency|crypto[\s-]?asset|digital[\s-]?asset|virtual[\s-]?asset|virtual[\s-]?currency|digital[\s-]?currency|blockchain[\s-]?asset|比特币|數字資產|加密货币|加密貨幣|虛擬資產|數位資產|數碼資產|加密資產)/i;

// Helper function to check if content is Bitcoin-related
function isBitcoinRelated(title: string, summary?: string, extractedText?: string): boolean {
  return (
    BITCOIN_KEYWORDS_REGEX.test(title) ||
    (summary && BITCOIN_KEYWORDS_REGEX.test(summary)) ||
    (extractedText && BITCOIN_KEYWORDS_REGEX.test(extractedText))
  );
}

async function searchHKEXFilings(ticker: string, fromDate: string, searchAllFilings = false): Promise<Filing[]> {
  const stockCode = ticker.replace('.HK', '');
  
  try {
    // Use HKEX's search API endpoint
    const searchUrl = `https://www1.hkexnews.hk/listedco/listconews/advancedsearch/search_active_main.aspx`;
    
    const formData = new FormData();
    formData.append('lang', 'en');
    formData.append('stock_code', stockCode);
    formData.append('date_from', fromDate);
    formData.append('date_to', new Date().toISOString().split('T')[0]);
    formData.append('stock_name', '');
    formData.append('news_type', '');
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BTCTreasuriesBot/1.0)',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HKEX search failed: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const filings: Filing[] = [];
    
    // Parse HKEX search results
    // NEW: Fetch ALL announcements (no early filtering)
    $('.news-item, tr').each((i, el) => {
      const $el = $(el);
      const titleElement = $el.find('.news-title, a[href*=".pdf"]').first();
      const title = titleElement.text().trim();
      
      if (!title) return;
      
      const dateText = $el.find('.news-date, td').eq(0).text().trim();
      const pdfLink = $el.find('a[href*=".pdf"]').attr('href') || titleElement.attr('href');
      
      if (pdfLink) {
        filings.push({
          title,
          date: parseHKEXDate(dateText) || new Date().toISOString(),
          url: pdfLink.startsWith('http') ? pdfLink : `https://www1.hkexnews.hk${pdfLink}`,
          type: determineFilingType(title)
        });
      }
    });
    
    return filings;
  } catch (error) {
    console.error(`Error searching HKEX for ${ticker}:`, error);
    return [];
  }
}

async function searchBroadHKEXFilings(fromDate: string): Promise<Filing[]> {
  try {
    // Search for Bitcoin-related announcements across all companies
    const searchUrl = `https://www1.hkexnews.hk/listedco/listconews/advancedsearch/search_active_main.aspx`;
    
    const filings: Filing[] = [];
    
    // Search with different Bitcoin keywords
    for (const keyword of ['bitcoin', 'btc', '比特币']) {
      const formData = new FormData();
      formData.append('lang', 'en');
      formData.append('stock_code', '');
      formData.append('date_from', fromDate);
      formData.append('date_to', new Date().toISOString().split('T')[0]);
      formData.append('stock_name', '');
      formData.append('news_type', '');
      formData.append('search_text', keyword);
      
      const response = await fetch(searchUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BTCTreasuriesBot/1.0)',
        }
      });
      
      if (!response.ok) continue;
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Parse search results
      $('.news-item, tr').each((i, el) => {
        const $el = $(el);
        const titleElement = $el.find('.news-title, a[href*=".pdf"]').first();
        const title = titleElement.text().trim();
        
        if (!title) return;
        
        const dateText = $el.find('.news-date, td').eq(0).text().trim();
        const pdfLink = $el.find('a[href*=".pdf"]').attr('href') || titleElement.attr('href');
        const stockCode = $el.find('.stock-code, td').eq(1).text().trim();
        
        if (pdfLink && stockCode) {
          // Check if this is from a company we don't already track
          const existingFiling = filings.find(f => f.url === pdfLink);
          if (!existingFiling) {
            filings.push({
              title,
              date: parseHKEXDate(dateText) || new Date().toISOString(),
              url: pdfLink.startsWith('http') ? pdfLink : `https://www1.hkexnews.hk${pdfLink}`,
              type: determineFilingType(title),
              stockCode: stockCode // Add stock code for entity identification
            });
          }
        }
      });
      
      // Rate limiting between keyword searches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return filings;
  } catch (error) {
    console.error('Error in broad HKEX search:', error);
    return [];
  }
}

function parseHKEXDate(dateStr: string): string | null {
  const patterns = [
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i
  ];
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      if (pattern.source.includes('Jan|Feb')) {
        // Month name format
        const day = match[1];
        const monthMap: Record<string, string> = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const month = monthMap[match[2]];
        const year = match[3];
        return new Date(`${year}-${month}-${day.padStart(2, '0')}`).toISOString();
      } else if (pattern.source.includes('DD/MM')) {
        const [_, day, month, year] = match;
        return new Date(`${year}-${month}-${day}`).toISOString();
      } else {
        const [_, year, month, day] = match;
        return new Date(`${year}-${month}-${day}`).toISOString();
      }
    }
  }
  return null;
}

// Enhanced filing type determination
function determineFilingType(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  // Check for acquisition/purchase keywords (English and Chinese)
  if (
    lowerTitle.includes('acquisition') || 
    lowerTitle.includes('purchase') || 
    lowerTitle.includes('acquired') ||
    lowerTitle.includes('买入') ||
    lowerTitle.includes('買入') ||
    lowerTitle.includes('收购') ||
    lowerTitle.includes('收購')
  ) {
    return 'acquisition';
  }
  
  // Check for disposal/sale keywords (English and Chinese)
  if (
    lowerTitle.includes('disposal') || 
    lowerTitle.includes('sale') || 
    lowerTitle.includes('sold') ||
    lowerTitle.includes('卖出') ||
    lowerTitle.includes('賣出') ||
    lowerTitle.includes('出售')
  ) {
    return 'disposal';
  }
  
  // Check for update/revision keywords (English and Chinese)
  if (
    lowerTitle.includes('update') || 
    lowerTitle.includes('revised') ||
    lowerTitle.includes('更新') ||
    lowerTitle.includes('修订') ||
    lowerTitle.includes('修訂')
  ) {
    return 'update';
  }
  
  // Default to disclosure
  return 'disclosure';
}

async function extractBTCAmount(text: string): Promise<ParsedFiling> {
  // Enhanced patterns to match Bitcoin amounts in various formats
  const patterns = [
    /(?:purchased|acquired|bought|holds?|holding)\s+(?:approximately\s+)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)(?:\s+(?:purchased|acquired|bought|held))?/i,
    /(?:bitcoin|btc)[:\s]+(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /total\s+(?:bitcoin|btc)\s+holdings?\s*:?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s+(?:units?\s+of\s+)?bitcoin/i,
  ];
  
  let btcAmount: number | null = null;
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0) {
        btcAmount = amount;
        break;
      }
    }
  }
  
  return {
    btc: btcAmount,
    text: text.slice(0, 2000) // Limit text length for storage
  };
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
    const lockName = 'scan-hkex-filings';
    const hasLock = await acquireLock(supabase, lockName);
    if (!hasLock) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Another HKEX scan is already in progress',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('Acquired lock for HKEX filing scan');
    
    // Get HKEX entities to scan
    const { data: entities, error: entitiesError } = await supabase
      .from('entities')
      .select('id, ticker, legal_name')
      .eq('listing_venue', 'HKEX');
    
    if (entitiesError) throw entitiesError;
    
    const results = [];
    let totalScanned = 0;
    let totalFound = 0;
    
    // Phase 1: Scan ALL announcements for known entities and flag Bitcoin-related ones
    // This captures every company announcement, not just Bitcoin-related filings
    for (const entity of entities || []) {
      console.log(`Scanning ALL announcements for ${entity.ticker} (${entity.legal_name})`);
      totalScanned++;
      
      try {
        // Check last scan date for incremental updates
        const { data: lastFiling } = await supabase
          .from('raw_filings')
          .select('disclosed_at')
          .eq('entity_id', entity.id)
          .eq('source', 'HKEX')
          .order('disclosed_at', { ascending: false })
          .limit(1)
          .single();
        
        const fromDate = lastFiling?.disclosed_at 
          ? new Date(new Date(lastFiling.disclosed_at).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 week overlap
          : '2020-01-01'; // Default start date
        
        // Search ALL filings for known entities (not just Bitcoin-related)
        const filings = await searchHKEXFilings(entity.ticker, fromDate, true);
        
        for (const filing of filings) {
          try {
            // Extract Bitcoin amounts from title and content
            const parsed = await extractBTCAmount(filing.title);
            
            // Check if this filing is Bitcoin-related
            const bitcoinRelated = isBitcoinRelated(filing.title, undefined, parsed.text);
            
            // Store ALL filings from known entities with bitcoin_related flag
            const { error } = await supabase
              .from('raw_filings')
              .upsert({
                entity_id: entity.id,
                btc: parsed.btc || 0,
                disclosed_at: filing.date,
                pdf_url: filing.url,
                source: 'HKEX',
                title: filing.title,
                filing_type: filing.type,
                extracted_text: parsed.text,
                verified: false,
                total_holdings: parsed.btc || null,
                bitcoin_related: bitcoinRelated  // NEW: Flag Bitcoin-related announcements
              }, {
                onConflict: 'entity_id,pdf_url'
              });
            
            if (!error) {
              totalFound++;
              results.push({ 
                entity: entity.ticker, 
                filing: filing.title,
                btc: parsed.btc,
                type: filing.type,
                date: filing.date,
                source: 'known_entity',
                bitcoin_related: bitcoinRelated
              });
            } else {
              console.error(`Error storing filing for ${entity.ticker}:`, error);
            }
          } catch (filingError) {
            console.error(`Error processing filing for ${entity.ticker}:`, filingError);
          }
        }
        
        // Rate limiting to be respectful to HKEX servers
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (entityError) {
        console.error(`Error scanning ${entity.ticker}:`, entityError);
      }
    }
    
    // Phase 2: Broad search for Bitcoin-related filings from unknown entities
    console.log('Starting broad search for Bitcoin-related filings...');
    try {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 7 days
      const broadFilings = await searchBroadHKEXFilings(fromDate);
      
      for (const filing of broadFilings) {
        try {
          // Check if this stock code is already in our entities
          const stockCode = filing.stockCode?.replace(/^0+/, ''); // Remove leading zeros
          const { data: existingEntity } = await supabase
            .from('entities')
            .select('id, ticker')
            .or(`ticker.eq.${stockCode}.HK,ticker.eq.${stockCode}`)
            .single();
          
          if (!existingEntity) {
            // This is a new entity - extract Bitcoin amounts
            const parsed = await extractBTCAmount(filing.title);
            
            if (parsed.btc && parsed.btc > 0) {
              // Create a placeholder entity for now
              const { data: newEntity, error: entityError } = await supabase
                .from('entities')
                .insert({
                  legal_name: `Unknown Entity ${stockCode}`,
                  ticker: `${stockCode}.HK`,
                  listing_venue: 'HKEX',
                  hq: 'TBD',
                  region: 'HK'
                })
                .select()
                .single();
              
              if (!entityError && newEntity) {
                // Check if Bitcoin-related
                const bitcoinRelated = isBitcoinRelated(filing.title, undefined, parsed.text);
                
                // Store the filing with bitcoin_related flag
                const { error } = await supabase
                  .from('raw_filings')
                  .upsert({
                    entity_id: newEntity.id,
                    btc: parsed.btc,
                    disclosed_at: filing.date,
                    pdf_url: filing.url,
                    source: 'HKEX',
                    title: filing.title,
                    filing_type: filing.type,
                    extracted_text: parsed.text,
                    verified: false,
                    total_holdings: parsed.btc,
                    bitcoin_related: bitcoinRelated  // NEW: Flag Bitcoin-related announcements
                  }, {
                    onConflict: 'entity_id,pdf_url'
                  });
                
                if (!error) {
                  totalFound++;
                  results.push({ 
                    entity: `${stockCode}.HK`,
                    filing: filing.title,
                    btc: parsed.btc,
                    type: filing.type,
                    date: filing.date,
                    source: 'broad_search_new_entity',
                    bitcoin_related: bitcoinRelated
                  });
                }
              }
            }
          }
        } catch (filingError) {
          console.error(`Error processing broad search filing:`, filingError);
        }
      }
    } catch (broadSearchError) {
      console.error('Error in broad search:', broadSearchError);
    }
    
    // Release the lock
    await releaseLock(supabase, lockName);
    console.log('Released lock for HKEX filing scan');
    
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
    console.error('Error in scan-hkex-filings:', error);
    
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