// Alternative APIs for real market data (production ready)

// 1. Alpha Vantage (Free tier: 5 API requests per minute, 500 per day)
async function fetchAlphaVantage(ticker: string): Promise<any> {
  const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY');
  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    marketCap: parseFloat(data.MarketCapitalization) || 0,
    sharesOutstanding: parseFloat(data.SharesOutstanding) || 0
  };
}

// 2. IEX Cloud (Free tier: 50,000 requests/month)
async function fetchIEXCloud(ticker: string): Promise<any> {
  const apiKey = Deno.env.get('IEX_CLOUD_API_KEY');
  const url = `https://cloud.iexapis.com/stable/stock/${ticker}/stats?token=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    marketCap: data.marketcap || 0,
    sharesOutstanding: data.sharesOutstanding || 0
  };
}

// 3. Twelve Data (Free tier: 800 requests/day)
async function fetchTwelveData(ticker: string): Promise<any> {
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  const url = `https://api.twelvedata.com/statistics?symbol=${ticker}&apikey=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    marketCap: data.statistics?.market_capitalization || 0,
    sharesOutstanding: data.statistics?.shares_outstanding || 0
  };
}

// 4. Financial Modeling Prep (Free tier: 250 requests/day)
async function fetchFMP(ticker: string): Promise<any> {
  const apiKey = Deno.env.get('FMP_API_KEY');
  const url = `https://financialmodelingprep.com/api/v3/market-capitalization/${ticker}?apikey=${apiKey}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return {
    marketCap: data[0]?.marketCap || 0
  };
}

// Usage example:
export async function fetchRealMarketData(ticker: string): Promise<any> {
  try {
    // Try Alpha Vantage first (most reliable for international stocks)
    return await fetchAlphaVantage(ticker);
  } catch (error) {
    console.error('Alpha Vantage failed, trying IEX Cloud:', error);
    try {
      return await fetchIEXCloud(ticker);
    } catch (error2) {
      console.error('IEX Cloud failed, trying Twelve Data:', error2);
      return await fetchTwelveData(ticker);
    }
  }
} 