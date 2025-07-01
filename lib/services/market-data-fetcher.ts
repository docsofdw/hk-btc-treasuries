import { RateLimiter } from '../rate-limiter';

// Configure rate limiters for each API - More conservative limits
const rateLimiters = {
  finnhub: new RateLimiter({ maxRequests: 50, windowMs: 60 * 1000, name: 'Finnhub' }),
  alphaVantage: new RateLimiter({ maxRequests: 4, windowMs: 60 * 1000, name: 'AlphaVantage' }),
  twelveData: new RateLimiter({ maxRequests: 6, windowMs: 60 * 1000, name: 'TwelveData' }), // Reduced from 8 to 6
  yahoo: new RateLimiter({ maxRequests: 50, windowMs: 60 * 60 * 1000, name: 'Yahoo' }), // More conservative
  polygon: new RateLimiter({ maxRequests: 4, windowMs: 60 * 1000, name: 'Polygon' })
};

interface MarketData {
  price: number;
  marketCap: number;
  sharesOutstanding: number;
  ticker: string;
  lastUpdated: string;
  source: string;
}

interface CacheEntry {
  data: MarketData;
  timestamp: number;
}

class MarketDataCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number;

  constructor(ttlMinutes: number = 30) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(ticker: string): MarketData | null {
    const entry = this.cache.get(ticker);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(ticker);
      return null;
    }

    return entry.data;
  }

  set(ticker: string, data: MarketData): void {
    this.cache.set(ticker, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export class MarketDataFetcher {
  private cache: MarketDataCache;
  private apiKeys: Record<string, string>;

  constructor(apiKeys: Record<string, string>) {
    this.cache = new MarketDataCache();
    this.apiKeys = apiKeys;
  }

  async fetchMarketData(ticker: string): Promise<MarketData | null> {
    // Check cache first
    const cached = this.cache.get(ticker);
    if (cached) {
      console.log(`Using cached data for ${ticker} (source: ${cached.source})`);
      return cached;
    }

    // Try each API in order of preference
    const apis = [
      { name: 'finnhub', fetch: () => this.fetchFinnhub(ticker) },
      { name: 'polygon', fetch: () => this.fetchPolygon(ticker) },
      { name: 'twelveData', fetch: () => this.fetchTwelveData(ticker) },
      { name: 'alphaVantage', fetch: () => this.fetchAlphaVantage(ticker) },
      { name: 'yahoo', fetch: () => this.fetchYahoo(ticker) }
    ];

    for (const api of apis) {
      try {
        console.log(`Trying ${api.name} for ${ticker}...`);
        const data = await api.fetch();
        
        if (data && data.marketCap > 0) {
          this.cache.set(ticker, data);
          console.log(`Successfully fetched ${ticker} from ${api.name}`);
          return data;
        }
      } catch (error) {
        console.error(`${api.name} failed for ${ticker}:`, error);
      }
    }

    console.error(`All APIs failed for ${ticker}`);
    return null;
  }

  private async fetchFinnhub(ticker: string): Promise<MarketData | null> {
    const apiKey = this.apiKeys.finnhub;
    if (!apiKey) return null;

    // Wait for rate limit
    await rateLimiters.finnhub.waitForSlot('api');

    const [quoteResponse, profileResponse] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`)
    ]);

    if (!quoteResponse.ok || !profileResponse.ok) {
      throw new Error(`Finnhub API error: ${quoteResponse.status} ${profileResponse.status}`);
    }

    const quote = await quoteResponse.json();
    const profile = await profileResponse.json();

    return {
      price: quote.c || 0,
      marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1000000 : 0,
      sharesOutstanding: profile.shareOutstanding ? profile.shareOutstanding * 1000000 : 0,
      ticker,
      lastUpdated: new Date().toISOString(),
      source: 'finnhub'
    };
  }

  private async fetchPolygon(ticker: string): Promise<MarketData | null> {
    const apiKey = this.apiKeys.polygon;
    if (!apiKey) return null;

    await rateLimiters.polygon.waitForSlot('api');

    const [snapshotResponse, detailsResponse] = await Promise.all([
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${apiKey}`),
      fetch(`https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${apiKey}`)
    ]);

    if (!snapshotResponse.ok || !detailsResponse.ok) {
      throw new Error(`Polygon API error: ${snapshotResponse.status} ${detailsResponse.status}`);
    }

    const snapshot = await snapshotResponse.json();
    const details = await detailsResponse.json();

    const price = snapshot.ticker?.day?.c || snapshot.ticker?.prevDay?.c || 0;
    const sharesOutstanding = details.results?.share_class_shares_outstanding || 0;

    return {
      price,
      marketCap: details.results?.market_cap || (price * sharesOutstanding),
      sharesOutstanding,
      ticker,
      lastUpdated: new Date().toISOString(),
      source: 'polygon'
    };
  }

  private async fetchTwelveData(ticker: string): Promise<MarketData | null> {
    const apiKey = this.apiKeys.twelveData;
    if (!apiKey) return null;

    await rateLimiters.twelveData.waitForSlot('api');

    // Format ticker for international markets
    let formattedTicker = ticker;
    if (ticker.includes('.HK')) {
      formattedTicker = ticker.replace('.HK', ':HKEX');
    } else if (ticker.includes('.SZ')) {
      formattedTicker = ticker.replace('.SZ', ':SZSE');
    }

    // Try quote endpoint first with error handling
    try {
      const quoteResponse = await fetch(`https://api.twelvedata.com/quote?symbol=${formattedTicker}&apikey=${apiKey}`);
      
      if (!quoteResponse.ok) {
        if (quoteResponse.status === 429) {
          console.warn(`TwelveData rate limited for ${ticker}, skipping...`);
          throw new Error(`Rate limited`);
        }
        throw new Error(`TwelveData API error: ${quoteResponse.status}`);
      }

      const quote = await quoteResponse.json();
      
      // Check for API error messages
      if (quote.status === 'error') {
        console.warn(`TwelveData API error for ${ticker}:`, quote.message);
        throw new Error(quote.message);
      }

      const price = parseFloat(quote.close) || 0;
      
      // Try to get market cap from statistics endpoint with error handling
      let marketCap = 0;
      let sharesOutstanding = 0;
      
      try {
        const statsResponse = await fetch(`https://api.twelvedata.com/statistics?symbol=${formattedTicker}&apikey=${apiKey}`);
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          if (stats.statistics && !stats.status) {
            marketCap = parseFloat(stats.statistics.market_capitalization) || 0;
            sharesOutstanding = parseFloat(stats.statistics.shares_outstanding) || 0;
          }
        }
      } catch (statsError) {
        console.warn(`Could not fetch statistics for ${ticker}, using price only`);
      }

      return {
        price,
        marketCap: marketCap || (price * sharesOutstanding),
        sharesOutstanding,
        ticker,
        lastUpdated: new Date().toISOString(),
        source: 'twelveData'
      };
    } catch (error) {
      console.error(`TwelveData error for ${ticker}:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  private async fetchAlphaVantage(ticker: string): Promise<MarketData | null> {
    const apiKey = this.apiKeys.alphaVantage;
    if (!apiKey) return null;

    await rateLimiters.alphaVantage.waitForSlot('api');

    const [overviewResponse, quoteResponse] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`),
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`)
    ]);

    if (!overviewResponse.ok || !quoteResponse.ok) {
      throw new Error(`AlphaVantage API error: ${overviewResponse.status} ${quoteResponse.status}`);
    }

    const overview = await overviewResponse.json();
    const quote = await quoteResponse.json();

    const price = parseFloat(quote['Global Quote']?.['05. price']) || 0;
    const marketCap = parseFloat(overview.MarketCapitalization) || 0;
    const sharesOutstanding = parseFloat(overview.SharesOutstanding) || 0;

    return {
      price,
      marketCap,
      sharesOutstanding,
      ticker,
      lastUpdated: new Date().toISOString(),
      source: 'alphaVantage'
    };
  }

  private async fetchYahoo(ticker: string): Promise<MarketData | null> {
    await rateLimiters.yahoo.waitForSlot('api');

    // Try multiple Yahoo endpoints
    const endpoints = [
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,summaryDetail`,
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) continue;

        const data = await response.json();

        // Parse based on endpoint type
        if (endpoint.includes('quoteSummary')) {
          const price = data.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw || 0;
          const marketCap = data.quoteSummary?.result?.[0]?.summaryDetail?.marketCap?.raw || 0;
          const sharesOutstanding = data.quoteSummary?.result?.[0]?.summaryDetail?.sharesOutstanding?.raw || 0;

          return {
            price,
            marketCap,
            sharesOutstanding,
            ticker,
            lastUpdated: new Date().toISOString(),
            source: 'yahoo'
          };
        } else {
          const result = data.chart?.result?.[0];
          if (!result) continue;

          return {
            price: result.meta?.regularMarketPrice || 0,
            marketCap: result.meta?.marketCap || 0,
            sharesOutstanding: result.meta?.sharesOutstanding || 0,
            ticker,
            lastUpdated: new Date().toISOString(),
            source: 'yahoo'
          };
        }
      } catch (error) {
        console.error(`Yahoo endpoint ${endpoint} failed:`, error);
      }
    }

    throw new Error('All Yahoo endpoints failed');
  }

  async batchFetchMarketData(tickers: string[]): Promise<Map<string, MarketData | null>> {
    const results = new Map<string, MarketData | null>();
    
    // Process in smaller batches to avoid overwhelming the APIs
    const batchSize = 3; // Reduced from 5 to 3
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      
      // Process batch sequentially to avoid rate limits
      for (const ticker of batch) {
        try {
          const data = await this.fetchMarketData(ticker);
          results.set(ticker, data);
          
          // Add delay between individual requests within batch
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to fetch ${ticker}:`, error);
          results.set(ticker, null);
        }
      }

      // Longer delay between batches
      if (i + batchSize < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }
} 