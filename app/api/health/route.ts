import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as monitoring from '@/lib/monitoring';
import { publicApiLimiter, getClientIp, addRateLimitHeaders, rateLimit } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    // Apply rate limiting (health checks get same limits as other public APIs)
    const ip = getClientIp(request);
    const rateLimitResult = await rateLimit(ip, publicApiLimiter, 60, 60 * 1000);
    
    if (!rateLimitResult.success) {
      const headers = new Headers();
      addRateLimitHeaders(headers, rateLimitResult);
      headers.set('Retry-After', Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString());
      
      return NextResponse.json(
        { 
          status: 'rate_limited',
          error: 'Too many requests',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: Object.fromEntries(headers.entries())
        }
      );
    }
    
    const supabase = await createClient();
    
    // Perform health checks
    const healthChecks = await monitoring.performHealthChecks(supabase);
    
    // Get system metrics
    const systemHealth = await monitoring.checkSystemHealth();
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
      system: systemHealth,
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
    
    // Prepare response headers
    const responseHeaders = new Headers({
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      'CDN-Cache-Control': 'public, max-age=30',
    });
    
    // Add rate limit headers
    addRateLimitHeaders(responseHeaders, rateLimitResult);
    
    return NextResponse.json(response, { 
      status: statusCode,
      headers: Object.fromEntries(responseHeaders.entries())
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
        }
      }
    );
  }
} 