import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Readiness check endpoint
 * Returns 200 if the service is ready to accept requests
 * Returns 503 if the service is not ready
 * 
 * Used by load balancers and Kubernetes for health checks
 */
export async function GET() {
  try {
    // Quick database check
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('entities')
      .select('id')
      .limit(1);

    // PGRST116 = no rows returned, which is OK (means table exists but is empty)
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json(
      { 
        status: 'ready',
        timestamp: new Date().toISOString()
      },
      { 
        status: 200,
        headers: { 
          'Cache-Control': 'no-store, must-revalidate',
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'not_ready', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { 
        status: 503,
        headers: { 
          'Cache-Control': 'no-store, must-revalidate',
        }
      }
    );
  }
}

