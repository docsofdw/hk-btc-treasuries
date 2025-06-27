import { NextRequest, NextResponse } from 'next/server';

interface ScanResult {
  success: boolean;
  scanned: number;
  found: number;
  results: Array<{
    entity: string;
    filing: string;
    btc?: number | null;
    type?: string;
    date?: string;
  }>;
  timestamp: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.FILING_CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    console.log('Starting automated filing scan...');
    
    // Scan HKEX filings
    const hkexPromise = fetch(
      `${supabaseUrl}/functions/v1/scan-hkex-filings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HKEX scan failed: ${response.status}`);
      }
      return response.json() as Promise<ScanResult>;
    }).catch((error) => ({
      success: false,
      scanned: 0,
      found: 0,
      results: [],
      timestamp: new Date().toISOString(),
      error: error.message
    }));
    
    // Scan SEC filings
    const secPromise = fetch(
      `${supabaseUrl}/functions/v1/scan-sec-filings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error(`SEC scan failed: ${response.status}`);
      }
      return response.json() as Promise<ScanResult>;
    }).catch((error) => ({
      success: false,
      scanned: 0,
      found: 0,
      results: [],
      timestamp: new Date().toISOString(),
      error: error.message
    }));
    
    // Wait for both scans to complete
    const [hkexData, secData] = await Promise.all([hkexPromise, secPromise]);
    
    // Log results for monitoring
    console.log('HKEX scan results:', {
      success: hkexData.success,
      scanned: hkexData.scanned,
      found: hkexData.found,
      error: hkexData.error
    });
    
    console.log('SEC scan results:', {
      success: secData.success,
      scanned: secData.scanned,
      found: secData.found,
      error: secData.error
    });
    
    // Calculate combined stats
    const totalScanned = hkexData.scanned + secData.scanned;
    const totalFound = hkexData.found + secData.found;
    const combinedResults = [...hkexData.results, ...secData.results];
    
    // Determine overall success
    const overallSuccess = hkexData.success || secData.success; // At least one succeeded
    
    const response = {
      success: overallSuccess,
      timestamp: new Date().toISOString(),
      summary: {
        totalScanned,
        totalFound,
        hkexScanned: hkexData.scanned,
        hkexFound: hkexData.found,
        secScanned: secData.scanned,
        secFound: secData.found
      },
      hkex: hkexData,
      sec: secData,
      newFilings: combinedResults.slice(0, 10), // Include first 10 for monitoring
      errors: [
        ...(hkexData.error ? [`HKEX: ${hkexData.error}`] : []),
        ...(secData.error ? [`SEC: ${secData.error}`] : [])
      ]
    };
    
    // Return appropriate status code
    const statusCode = overallSuccess ? 200 : 500;
    
    return NextResponse.json(response, { status: statusCode });
    
  } catch (error) {
    console.error('Cron scan failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Scan failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
} 