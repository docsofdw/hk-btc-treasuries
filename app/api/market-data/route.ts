import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface MarketData {
  ticker: string;
  marketCap?: number;
  price?: number;
  currency?: string;
}

// Helper to format tickers for Yahoo Finance
function formatTickerForYahoo(ticker: string, venue: string): string {
  // Yahoo Finance uses .HK suffix for Hong Kong stocks
  if (venue === 'HKEX' && !ticker.includes('.')) {
    return `${ticker}.HK`;
  }
  // Remove any existing suffix for ADRs
  if (venue === 'NASDAQ' || venue === 'NYSE') {
    return ticker.replace('.HK', '');
  }
  // Chinese stocks on US exchanges (ADRs) don't need special formatting
  return ticker;
}

// Mock data for demonstration - in production, use real API
const MOCK_MARKET_CAPS: Record<string, number> = {
  '0434.HK': 282687358, // Boyaa Interactive
  '1357.HK': 100615720, // Meitu
  'NCTY': 9847496, // The9 Limited
  '3000058.SZ': 4281520, // BlueFocus
  '1723.HK': 2870759, // Moon Nation
};

// Rate limiting tracking
const lastTwelveDataCall = { timestamp: 0, count: 0 };
const TWELVE_DATA_LIMIT = 6; // Conservative limit
const TWELVE_DATA_WINDOW = 60 * 1000; // 1 minute

// Fetch from Twelve Data API (primary source) with rate limiting
async function fetchFromTwelveData(ticker: string, venue: string): Promise<MarketData | null> {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) {
      console.error('TWELVE_DATA_API_KEY not found');
      return await fetchFromYahoo(ticker, venue); // Fallback to Yahoo
    }
    
    // Check rate limiting
    const now = Date.now();
    if (now - lastTwelveDataCall.timestamp < TWELVE_DATA_WINDOW) {
      if (lastTwelveDataCall.count >= TWELVE_DATA_LIMIT) {
        console.warn(`Twelve Data rate limit reached, skipping ${ticker}`);
        return await fetchFromYahoo(ticker, venue);
      }
      lastTwelveDataCall.count++;
    } else {
      lastTwelveDataCall.timestamp = now;
      lastTwelveDataCall.count = 1;
    }
    
    // Convert ticker format for Twelve Data
    let formattedTicker = ticker;
    if (ticker.includes('.HK')) {
      formattedTicker = ticker.replace('.HK', '');
    } else if (ticker.includes('.SZ')) {
      formattedTicker = ticker.replace('.SZ', '');
    }
    
    const quoteUrl = `https://api.twelvedata.com/quote?symbol=${formattedTicker}&apikey=${apiKey}`;
    console.log(`Fetching from Twelve Data: ${formattedTicker}`);
    
    const response = await fetch(quoteUrl);
    
    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`Twelve Data rate limited for ${ticker}, falling back to Yahoo`);
      } else {
        console.error(`Twelve Data error for ${ticker}: ${response.status}`);
      }
      return await fetchFromYahoo(ticker, venue); // Fallback to Yahoo
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      console.error(`Twelve Data API error for ${ticker}:`, data.message);
      return await fetchFromYahoo(ticker, venue); // Fallback to Yahoo
    }
    
    const price = parseFloat(data.close) || 0;
    
    // Skip statistics endpoint to reduce API calls and avoid rate limits
    // Focus on getting basic price data
    const marketCap = 0; // Will be calculated or fetched from fallback if needed
    
    return {
      ticker,
      marketCap: marketCap,
      price: price,
      currency: 'USD'
    };
    
  } catch (error) {
    console.error(`Twelve Data error for ${ticker}:`, error);
    return await fetchFromYahoo(ticker, venue); // Fallback to Yahoo
  }
}

// Fallback: Fetch from Yahoo Finance with CORS proxy
async function fetchFromYahoo(ticker: string, venue: string): Promise<MarketData | null> {
  const formattedTicker = formatTickerForYahoo(ticker, venue);
  
  try {
    // Use CORS proxy to bypass browser CORS restrictions
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${formattedTicker}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`;
    
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`Yahoo Finance error for ${ticker}: ${response.status}`);
      
      // Fallback to mock data for demonstration if Yahoo fails
      const mockCap = MOCK_MARKET_CAPS[ticker] || MOCK_MARKET_CAPS[formattedTicker];
      if (mockCap) {
        return {
          ticker,
          marketCap: mockCap,
          price: undefined,
          currency: 'USD'
        };
      }
      return null;
    }
    
    const data = await response.json();
    const quote = data.chart?.result?.[0]?.meta;
    
    if (!quote) {
      console.error(`No quote data for ${ticker}`);
      return null;
    }
    
    return {
      ticker,
      marketCap: quote.marketCap || 0,
      price: quote.regularMarketPrice || 0,
      currency: quote.currency || 'USD'
    };
    
  } catch (error) {
    console.error(`Yahoo Finance error for ${ticker}:`, error);
    
    // Fallback to mock data if API fails
    const mockCap = MOCK_MARKET_CAPS[ticker] || MOCK_MARKET_CAPS[formattedTicker];
    if (mockCap) {
      return {
        ticker,
        marketCap: mockCap,
        price: undefined,
        currency: 'USD'
      };
    }
    return null;
  }
}

// Fallback: Use a simple calculation based on shares outstanding if available
// In a real app, you might use Alpha Vantage, IEX Cloud, or another API here
async function fetchFallbackData(ticker: string): Promise<MarketData | null> {
  // For now, just return null - in production you'd implement another API
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get('tickers');
    const venuesParam = searchParams.get('venues');
    
    if (!tickersParam || !venuesParam) {
      return NextResponse.json({ error: 'Missing tickers or venues parameter' }, { status: 400 });
    }
    
    const tickers = tickersParam.split(',');
    const venues = venuesParam.split(',');
    
    if (tickers.length !== venues.length) {
      return NextResponse.json({ error: 'Tickers and venues arrays must have same length' }, { status: 400 });
    }
    
    // Fetch market data for each ticker with fallback - process sequentially to avoid rate limits
    const results: MarketData[] = [];
    
    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      const venue = venues[i];
      
      try {
        // Try Twelve Data first
        const twelveData = await fetchFromTwelveData(ticker, venue);
        if (twelveData?.price) {
          results.push(twelveData);
        } else {
          // Try fallback if Twelve Data fails
          const fallbackData = await fetchFallbackData(ticker);
          if (fallbackData?.marketCap) {
            results.push(fallbackData);
          } else {
            // Return empty data if all sources fail
            results.push({ ticker });
          }
        }
        
        // Add delay between requests to avoid overwhelming APIs
        if (i < tickers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Failed to fetch ${ticker}:`, error);
        results.push({ ticker });
      }
    }
    
    // Create a map for easy lookup
    const marketDataMap = results.reduce((acc, data) => {
      acc[data.ticker] = data;
      return acc;
    }, {} as Record<string, MarketData>);
    
    // Log success rate for monitoring
    const successCount = results.filter(r => r.marketCap).length;
    console.log(`Market data fetch: ${successCount}/${results.length} successful`);
    
    return NextResponse.json({
      success: true,
      data: marketDataMap,
      timestamp: new Date().toISOString(),
      stats: {
        total: results.length,
        successful: successCount
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('Market data API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
} 