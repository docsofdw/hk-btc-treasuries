import { SupabaseClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

export class HKEXParser {
  private supabase: SupabaseClient;
  
  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }
  
  async searchFilings(ticker: string, companyName: string) {
    // Remove .HK suffix for search
    const stockCode = ticker.replace('.HK', '');
    
    try {
      // Search HKEX for filings
      const searchUrl = `https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=en&stock=${stockCode}`;
      const response = await fetch(searchUrl);
      const html = await response.text();
      
      // Parse HTML to find PDF links (simplified - in production use cheerio)
      const pdfLinks = this.extractPDFLinks(html);
      
      // Filter for Bitcoin-related documents
      const bitcoinDocs = pdfLinks.filter(link => 
        link.title.toLowerCase().includes('bitcoin') ||
        link.title.toLowerCase().includes('digital asset') ||
        link.title.toLowerCase().includes('cryptocurrency')
      );
      
      return bitcoinDocs;
    } catch (error) {
      console.error(`Error searching HKEX for ${ticker}:`, error);
      return [];
    }
  }
  
  async parsePDF(pdfUrl: string): Promise<{ btc: number; text: string } | null> {
    try {
      // For MVP, we'll use a simple approach
      // In production, use pdf-parse or a PDF parsing service
      console.log(`Would parse PDF at: ${pdfUrl}`);
      
      // Simulate parsing - replace with actual PDF parsing
      return {
        btc: 0,
        text: 'PDF parsing not implemented in MVP'
      };
    } catch (error) {
      console.error('Error parsing PDF:', error);
      return null;
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
        const dateText = $row.find('td').eq(0).text().trim(); // Adjust based on actual structure
        
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
      const parsed = await this.parsePDF(filing.url);
      
      if (parsed && parsed.btc > 0) {
        // Insert into raw_filings
        const { error } = await this.supabase
          .from('raw_filings')
          .upsert({
            entity_id: entityId,
            btc: parsed.btc,
            disclosed_at: filing.date,
            pdf_url: filing.url,
            source: 'HKEX',
            extracted_text: parsed.text,
            verified: false // Manual verification required
          });
          
        if (error) {
          console.error('Error inserting filing:', error);
        }
      }
    }
  }
} 