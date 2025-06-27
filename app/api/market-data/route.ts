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

// Fetch from Twelve Data API (primary source)
async function fetchFromTwelveData(ticker: string, venue: string): Promise<MarketData | null> {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) {
      console.error('TWELVE_DATA_API_KEY not found');
      return await fetchFromYahoo(ticker, venue); // Fallback to Yahoo
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
      console.error(`Twelve Data error for ${ticker}: ${response.status}`);
      return await fetchFromYahoo(ticker, venue); // Fallback to Yahoo
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      console.error(`Twelve Data API error for ${ticker}:`, data.message);
      return await fetchFromYahoo(ticker, venue); // Fallback to Yahoo
    }
    
    const price = parseFloat(data.close) || 0;
    
    // Try to get market cap from statistics endpoint
    let marketCap = 0;
    try {
      const statsUrl = `https://api.twelvedata.com/statistics?symbol=${formattedTicker}&apikey=${apiKey}`;
      const statsResponse = await fetch(statsUrl);
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.statistics?.market_capitalization) {
          marketCap = parseFloat(statsData.statistics.market_capitalization) || 0;
        }
      }
    } catch (statsError) {
      console.warn(`Could not fetch statistics for ${ticker}:`, statsError);
    }
    
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
    
    // Fetch market data for each ticker with fallback
    const marketDataPromises = tickers.map(async (ticker, index): Promise<MarketData> => {
      const venue = venues[index];
      
      // Try Twelve Data first
      const twelveData = await fetchFromTwelveData(ticker, venue);
      if (twelveData?.marketCap) {
        return twelveData;
      }
      
      // Try fallback if Yahoo fails
      const fallbackData = await fetchFallbackData(ticker);
      if (fallbackData?.marketCap) {
        return fallbackData;
      }
      
      // Return empty data if all sources fail
      return { ticker };
    });
    
    const results = await Promise.all(marketDataPromises);
    
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