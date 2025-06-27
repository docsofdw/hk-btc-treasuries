import { createClient } from '@supabase/supabase-js';

export class HKEXParser {
  private supabase: any;
  
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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
    // Simple regex extraction - in production use cheerio
    const linkPattern = /<a[^>]+href="([^"]+\.pdf)"[^>]*>([^<]+)<\/a>/gi;
    const links: Array<{ url: string; title: string; date: string }> = [];
    
    let match;
    while ((match = linkPattern.exec(html)) !== null) {
      links.push({
        url: `https://www1.hkexnews.hk${match[1]}`,
        title: match[2].trim(),
        date: new Date().toISOString() // Extract actual date from HTML
      });
    }
    
    return links;
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