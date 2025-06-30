import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

// Configure worker for PDF.js
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
} else {
  // For server-side rendering
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface PDFMetadata {
  [key: string]: unknown;
}

interface PDFParseResult {
  text: string;
  pageCount: number;
  metadata?: PDFMetadata;
  error?: string;
}

export class PDFParser {
  private maxPdfSize: number;
  private timeout: number;

  constructor(options: { maxPdfSize?: number; timeout?: number } = {}) {
    this.maxPdfSize = options.maxPdfSize || 10 * 1024 * 1024; // 10MB default
    this.timeout = options.timeout || 30000; // 30 seconds default
  }

  async parse(buffer: ArrayBuffer): Promise<PDFParseResult> {
    // Validate PDF size
    if (buffer.byteLength > this.maxPdfSize) {
      return {
        text: '',
        pageCount: 0,
        error: `PDF size exceeds limit: ${buffer.byteLength} > ${this.maxPdfSize}`
      };
    }

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<PDFParseResult>((_, reject) => {
        setTimeout(() => reject(new Error('PDF parsing timeout')), this.timeout);
      });

      // Race between parsing and timeout
      const result = await Promise.race([
        this.parsePDF(buffer),
        timeoutPromise
      ]);

      return result;
    } catch (error) {
      console.error('PDF parsing error:', error);
      return {
        text: '',
        pageCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async parsePDF(buffer: ArrayBuffer): Promise<PDFParseResult> {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
      cMapPacked: true
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const textParts: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: TextItem | TextMarkedContent) => {
            // Only TextItem has str property, TextMarkedContent doesn't
            if ('str' in item) {
              return item.str;
            }
            return '';
          })
          .filter(text => text.length > 0)
          .join(' ')
          .trim();

        if (pageText) {
          textParts.push(`Page ${pageNum}:\n${pageText}`);
        }
      } catch (pageError) {
        console.error(`Error parsing page ${pageNum}:`, pageError);
      }
    }

    // Try to get metadata
    let metadata: PDFMetadata = {};
    try {
      const pdfMetadata = await pdf.getMetadata();
      metadata = (pdfMetadata.info as PDFMetadata) || {};
    } catch (metadataError) {
      console.warn('Could not extract PDF metadata:', metadataError);
    }

    return {
      text: textParts.join('\n\n'),
      pageCount,
      metadata
    };
  }

  async parseFromUrl(url: string): Promise<PDFParseResult> {
    try {
      // Validate URL
      const validatedUrl = this.validateUrl(url);
      if (!validatedUrl) {
        return {
          text: '',
          pageCount: 0,
          error: 'Invalid or untrusted URL'
        };
      }

      // Fetch PDF with proper headers
      const response = await fetch(validatedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BitcoinTreasuries/1.0)',
          'Accept': 'application/pdf,*/*'
        },
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        return {
          text: '',
          pageCount: 0,
          error: `Failed to fetch PDF: ${response.status} ${response.statusText}`
        };
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('pdf')) {
        console.warn(`Unexpected content type: ${contentType}`);
      }

      const buffer = await response.arrayBuffer();
      return await this.parse(buffer);
    } catch (error) {
      console.error('Error fetching/parsing PDF:', error);
      return {
        text: '',
        pageCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private validateUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      
      // Only allow HTTPS URLs
      if (parsed.protocol !== 'https:') {
        console.error('Only HTTPS URLs are allowed');
        return null;
      }

      // Whitelist of allowed domains for PDFs
      const allowedDomains = [
        'hkexnews.hk',
        'www1.hkexnews.hk',
        'sec.gov',
        'www.sec.gov',
        'edgar.sec.gov',
        'bitcoin-treasuries.com',
        // Add more trusted domains as needed
      ];

      const hostname = parsed.hostname.toLowerCase();
      if (!allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
        console.error(`Domain not whitelisted: ${hostname}`);
        return null;
      }

      return url;
    } catch (error) {
      console.error('Invalid URL:', error);
      return null;
    }
  }
}

// Fallback parser using simpler approach if pdfjs fails
export class SimplePDFParser {
  async parse(buffer: ArrayBuffer): Promise<PDFParseResult> {
    try {
      // Convert buffer to string and extract readable text
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const text = decoder.decode(buffer);
      
      // Simple text extraction patterns
      const streamPattern = /stream([\s\S]*?)endstream/g;
      const textPattern = /\((.*?)\)/g;
      
      const extractedTexts: string[] = [];
      let match;
      
      // Extract text from PDF streams
      while ((match = streamPattern.exec(text)) !== null) {
        const streamContent = match[1];
        let textMatch;
        
        while ((textMatch = textPattern.exec(streamContent)) !== null) {
          const content = textMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\');
            
          if (content.trim()) {
            extractedTexts.push(content);
          }
        }
      }
      
      return {
        text: extractedTexts.join(' ').trim(),
        pageCount: (text.match(/\/Type\s*\/Page[^s]/g) || []).length,
        metadata: {}
      };
    } catch (error) {
      return {
        text: '',
        pageCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 