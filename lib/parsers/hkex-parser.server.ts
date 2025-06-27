import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

// This should ONLY be used in server contexts
export class HKEXParserServer {
  private supabase: SupabaseClient;
  
  constructor() {
    // Check we're on server
    if (typeof window !== 'undefined') {
      throw new Error('HKEXParserServer can only be used on the server');
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  
  async searchFilings(ticker: string, companyName: string) {
    // Remove .HK suffix for search
    const stockCode = ticker.replace('.HK', '');
    
    try {
      // Search HKEX for filings
      const searchUrl = `https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=en&stock=${stockCode}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BitcoinTreasuries/1.0)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HKEX search failed: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Parse HTML to find PDF links
      const pdfLinks = this.extractPDFLinks(html);
      
      // Filter for Bitcoin-related documents
      const bitcoinDocs = pdfLinks.filter(link => 
        link.title.toLowerCase().includes('bitcoin') ||
        link.title.toLowerCase().includes('digital asset') ||
        link.title.toLowerCase().includes('cryptocurrency') ||
        link.title.toLowerCase().includes('virtual asset')
      );
      
      return bitcoinDocs;
    } catch (error) {
      console.error(`Error searching HKEX for ${ticker}:`, error);
      return [];
    }
  }
  
  private extractPDFLinks(html: string): Array<{ url: string; title: string; date: string }> {
    const $ = cheerio.load(html);
    const links: Array<{ url: string; title: string; date: string }> = [];
    
    // HKEX search results typically have PDFs in table rows
    $('table tr').each((_, row) => {
      const $row = $(row);
      const $pdfLink = $row.find('a[href$=".pdf"]');
      
      if ($pdfLink.length > 0) {
        const href = $pdfLink.attr('href');
        const title = $pdfLink.text().trim();
        
        // Try to extract date from the row (usually in a separate td)
        const dateText = $row.find('td').eq(0).text().trim();
        
        if (href) {
          links.push({
            url: href.startsWith('http') ? href : `https://www1.hkexnews.hk${href}`,
            title: title || 'Untitled Document',
            date: this.parseHKEXDate(dateText) || new Date().toISOString()
          });
        }
      }
    });
    
    return links;
  }
  
  private parseHKEXDate(dateStr: string): string | null {
    // HKEX dates are typically in format "DD/MM/YYYY"
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const [_, day, month, year] = match;
      return new Date(`${year}-${month}-${day}`).toISOString();
    }
    return null;
  }
  
  async processCompany(ticker: string, entityId: string) {
    const filings = await this.searchFilings(ticker, '');
    
    for (const filing of filings) {
      try {
        // Check if filing already exists
        const { data: existing } = await this.supabase
          .from('raw_filings')
          .select('id')
          .eq('entity_id', entityId)
          .eq('pdf_url', filing.url)
          .single();
          
        if (existing) {
          console.log(`Filing already exists: ${filing.url}`);
          continue;
        }
        
        // Insert raw filing for manual verification
        const { error } = await this.supabase
          .from('raw_filings')
          .insert({
            entity_id: entityId,
            btc: 0, // Will be updated after PDF parsing
            disclosed_at: filing.date,
            pdf_url: filing.url,
            source: 'HKEX',
            title: filing.title,
            verified: false, // Manual verification required
            detected_in: 'title'
          });
          
        if (error) {
          console.error('Error inserting filing:', error);
        } else {
          console.log(`Inserted filing: ${filing.title}`);
        }
      } catch (error) {
        console.error(`Error processing filing ${filing.url}:`, error);
      }
    }
  }
} 