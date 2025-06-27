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
