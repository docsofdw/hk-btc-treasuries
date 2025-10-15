import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin endpoint to trigger Edge Functions on-demand
 * Centralized control point for all Supabase Edge Functions
 */

type EdgeFunction = 'scan-hkex' | 'dynamic-update' | 'parse-pdf' | 'update-market-data';

const EDGE_FUNCTION_MAP: Record<EdgeFunction, string> = {
  'scan-hkex': 'scan-hkex-filings',
  'dynamic-update': 'dynamic-data-updater',
  'parse-pdf': 'parse-pdf',
  'update-market-data': 'update-market-data',
};

export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication here (e.g., verify admin session)
    // For now, this is an unprotected admin endpoint
    // In production, you should verify the user is an admin

    const body = await request.json();
    const { function: functionName, payload } = body;

    if (!functionName) {
      return NextResponse.json(
        { error: 'function parameter is required' },
        { status: 400 }
      );
    }

    // Validate function name
    if (!EDGE_FUNCTION_MAP[functionName as EdgeFunction]) {
      return NextResponse.json(
        { 
          error: 'Invalid function name', 
          validFunctions: Object.keys(EDGE_FUNCTION_MAP)
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    const edgeFunctionName = EDGE_FUNCTION_MAP[functionName as EdgeFunction];
    console.log(`[Admin] Triggering Edge Function: ${edgeFunctionName}`);

    // Call the Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${edgeFunctionName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: payload ? JSON.stringify(payload) : undefined,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    console.log(`[Admin] Edge Function completed: ${edgeFunctionName}`, {
      success: data.success || true,
    });

    return NextResponse.json({
      success: true,
      function: functionName,
      edgeFunction: edgeFunctionName,
      result: data,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Admin] Edge Function trigger failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}