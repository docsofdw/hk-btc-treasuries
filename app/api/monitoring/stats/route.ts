import { NextResponse } from 'next/server';
import * as monitoring from '@/lib/monitoring';

/**
 * Monitoring stats endpoint
 * Returns performance metrics and error logs
 * 
 * For internal monitoring dashboards
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const stats = {
      timestamp: new Date().toISOString(),
      performance: {
        stats: monitoring.getPerformanceStats(),
        recent: monitoring.getPerformanceMetrics(limit),
      },
      errors: {
        recent: monitoring.getRecentErrors(limit),
        rate: monitoring.getErrorRate(),
      },
      system: await monitoring.checkSystemHealth(),
      alerts: monitoring.checkAlerts(),
    };

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get stats',
      },
      { status: 500 }
    );
  }
}

