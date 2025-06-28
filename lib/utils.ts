import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate official stock exchange URL for a given ticker and listing venue
 * Uses reliable financial data providers since direct exchange APIs may not be publicly accessible
 */
export function getOfficialExchangeUrl(ticker: string, listingVenue: string): string {
  switch (listingVenue) {
    case 'HKEX':
      // Hong Kong stocks - use Yahoo Finance for HK stocks (most reliable)
      return `https://finance.yahoo.com/quote/${ticker}`;
    
    case 'NASDAQ':
      // NASDAQ - use official NASDAQ quote page
      return `https://www.nasdaq.com/market-activity/stocks/${ticker.toLowerCase()}`;
    
    case 'NYSE':
      // NYSE - use Yahoo Finance as it's more reliable than NYSE direct links
      return `https://finance.yahoo.com/quote/${ticker}`;
    
    case 'SZSE':
      // Shenzhen Stock Exchange - use Yahoo Finance for Chinese stocks
      return `https://finance.yahoo.com/quote/${ticker}`;
    
    case 'SSE':
      // Shanghai Stock Exchange - use Yahoo Finance for Chinese stocks
      return `https://finance.yahoo.com/quote/${ticker}`;
    
    default:
      // Default to Yahoo Finance for reliable international coverage
      return `https://finance.yahoo.com/quote/${ticker}`;
  }
}

/**
 * Generate HKEX announcements page URL for Hong Kong listed companies
 * Uses stockId mapping for known companies, provides search page with guidance for others
 */
export function getHKEXAnnouncementsUrl(ticker: string): string {
  // Remove .HK suffix for HKEX search
  let stockCode = ticker.replace('.HK', '');
  
  // Always pad to 5 digits with leading zeros (standard HKEX format)
  stockCode = stockCode.padStart(5, '0');
  
  // Mapping of stock codes to HKEX stockIds (only confirmed mappings)
  const stockIdMapping: Record<string, string> = {
    '00434': '95959',   // BOYAA (confirmed)
    '01723': '198697',  // MOON INC (confirmed)
    '01357': '148851',  // MEITU (confirmed)
    '08005': '5209',    // YUXING INFOTECH (confirmed)
    '00863': '130186',  // BC Technology Group (confirmed)
    '01499': '129699',  // QH-International Holdings Ltd (confirmed)
    '01415': '120456',  // Hype Digital Inc (confirmed)
    '01611': '147570',  // Mobile Internet (confirmed)
  };
  
  const stockId = stockIdMapping[stockCode];
  
  if (stockId) {
    // Direct link using stockId for confirmed companies
    return `https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=en&market=SEHK&stockId=${stockId}&category=0`;
  } else {
    // For other companies, link to search page
    // Users will need to enter the stock code in the search box
    return `https://www1.hkexnews.hk/search/titlesearch.xhtml`;
  }
}
