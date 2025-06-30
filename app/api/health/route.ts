import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { monitoring } from '@/lib/services/monitoring';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Perform health checks
    const healthChecks = await monitoring.performHealthChecks(supabase);
    
    // Get system metrics
    const performanceStats = monitoring.getPerformanceStats();
    const errorRate = monitoring.getErrorRate();
    const alerts = monitoring.checkAlerts();
    
    // Determine overall health status
    const unhealthyServices = healthChecks.filter(check => check.status === 'unhealthy');
    const degradedServices = healthChecks.filter(check => check.status === 'degraded');
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0 || errorRate > 0.05) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }
    
    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: healthChecks,
      metrics: {
        performance: performanceStats,
        errorRate: {
          rate: errorRate,
          percentage: (errorRate * 100).toFixed(2) + '%'
        }
      },
      alerts,
      uptime: process.uptime()
    };
    
    // Set appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
} 