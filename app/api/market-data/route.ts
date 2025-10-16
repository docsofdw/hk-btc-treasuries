import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MarketDataResponse {
  ticker: string;
  marketCap: number;
  price: number;
  currency?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tickers = searchParams.get('tickers')?.split(',') || [];
    const venues = searchParams.get('venues')?.split(',') || [];
    
    if (tickers.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No tickers provided' 
      }, { status: 400 });
    }

    // For development, return empty market data to prevent 404 errors
    // In production, this would fetch from a market data API
    const data: Record<string, MarketDataResponse> = {};
    
    tickers.forEach((ticker, index) => {
      if (ticker && ticker.trim()) {
        data[ticker] = {
          ticker: ticker.trim(),
          marketCap: 0,
          price: 0,
          currency: 'USD'
        };
      }
    });

    return NextResponse.json({ 
      success: true, 
      data 
    });
    
  } catch (error) {
    console.error('Error fetching market data:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch market data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

