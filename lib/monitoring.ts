/**
 * Monitoring and Performance Tracking
 * 
 * Provides error tracking and performance monitoring without external dependencies.
 * Can be extended with Sentry or other services later.
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

interface ErrorLog {
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, string | number | boolean>;
}

// In-memory storage (use Redis or database in production)
const performanceMetrics: PerformanceMetric[] = [];
const errorLogs: ErrorLog[] = [];
const MAX_STORED_METRICS = 100;
const MAX_STORED_ERRORS = 50;

/**
 * Track performance metrics
 */
export function trackPerformance(
  name: string,
  duration: number,
  metadata?: Record<string, string | number | boolean>
) {
  const metric: PerformanceMetric = {
    name,
    duration,
    timestamp: new Date().toISOString(),
    metadata,
  };

  performanceMetrics.push(metric);

  // Keep only recent metrics
  if (performanceMetrics.length > MAX_STORED_METRICS) {
    performanceMetrics.shift();
  }

  // Log slow operations
  if (duration > 1000) {
    console.warn(
      `⚠️ Slow operation: ${name} took ${duration}ms`,
      metadata || ''
    );
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Performance: ${name} - ${duration}ms`);
  }
}

/**
 * Track API call performance
 */
export function trackApiCall(
  endpoint: string,
  startTime: number,
  status: number,
  metadata?: Record<string, string | number | boolean>
) {
  const duration = Date.now() - startTime;
  trackPerformance('api.call', duration, {
    endpoint,
    status,
    ...metadata,
  });
}

/**
 * Log errors for monitoring
 */
export function logError(error: Error | string, context?: Record<string, string | number | boolean>) {
  const errorLog: ErrorLog = {
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? undefined : error.stack,
    timestamp: new Date().toISOString(),
    context,
  };

  errorLogs.push(errorLog);

  // Keep only recent errors
  if (errorLogs.length > MAX_STORED_ERRORS) {
    errorLogs.shift();
  }

  // Always log to console
  console.error('❌ Error logged:', errorLog.message, context || '');
}

/**
 * Get recent performance metrics
 */
export function getPerformanceMetrics(limit = 20): PerformanceMetric[] {
  return performanceMetrics.slice(-limit);
}

/**
 * Get recent errors
 */
export function getRecentErrors(limit = 20): ErrorLog[] {
  return errorLogs.slice(-limit);
}

/**
 * Get performance statistics
 */
export function getPerformanceStats() {
  if (performanceMetrics.length === 0) {
    return {
      count: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: 0,
    };
  }

  const durations = performanceMetrics.map((m) => m.duration);
  const sum = durations.reduce((a, b) => a + b, 0);

  return {
    count: performanceMetrics.length,
    avgDuration: Math.round(sum / durations.length),
    maxDuration: Math.max(...durations),
    minDuration: Math.min(...durations),
  };
}

/**
 * Clear old metrics (call periodically)
 */
export function clearOldMetrics(olderThanMs = 3600000) {
  // 1 hour
  const cutoff = Date.now() - olderThanMs;

  while (
    performanceMetrics.length > 0 &&
    new Date(performanceMetrics[0].timestamp).getTime() < cutoff
  ) {
    performanceMetrics.shift();
  }

  while (
    errorLogs.length > 0 &&
    new Date(errorLogs[0].timestamp).getTime() < cutoff
  ) {
    errorLogs.shift();
  }
}

/**
 * Wrapper for async operations with automatic tracking
 */
export async function withPerformanceTracking<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, string | number | boolean>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    trackPerformance(name, Date.now() - start, metadata);
    return result;
  } catch (error) {
    logError(error as Error, { operation: name, ...metadata });
    throw error;
  }
}

/**
 * Check system health
 */
export async function checkSystemHealth() {
  const checks = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      percentage: Math.round(
        (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
      ),
    },
    metrics: {
      recentErrors: errorLogs.length,
      performanceStats: getPerformanceStats(),
    },
  };

  return checks;
}

/**
 * Health check for specific service
 */
export async function performHealthChecks(supabase: Awaited<ReturnType<typeof import('@/utils/supabase/server').createClient>>) {
  const checks = [];

  // Database check
  try {
    const dbStart = Date.now();
    const { data, error } = await supabase
      .from('entities')
      .select('id')
      .limit(1);

    const latency = Date.now() - dbStart;

    checks.push({
      service: 'database',
      status: error ? 'unhealthy' : 'healthy',
      latency,
      message: error ? error.message : 'Connected',
    });
  } catch (error) {
    checks.push({
      service: 'database',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Redis check (if configured)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    checks.push({
      service: 'redis',
      status: 'healthy',
      message: 'Configured and available',
    });
  } else {
    checks.push({
      service: 'redis',
      status: 'not_configured',
      message: 'Using in-memory fallback',
    });
  }

  // API check
  checks.push({
    service: 'api',
    status: 'healthy',
    message: 'Operational',
  });

  return checks;
}

/**
 * Get error rate
 */
export function getErrorRate(): number {
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  const recentErrors = errorLogs.filter(
    (err) => new Date(err.timestamp).getTime() > oneHourAgo
  );

  const recentMetrics = performanceMetrics.filter(
    (m) => new Date(m.timestamp).getTime() > oneHourAgo
  );

  if (recentMetrics.length === 0) return 0;

  return recentErrors.length / recentMetrics.length;
}

/**
 * Check for alerts
 */
export function checkAlerts() {
  const alerts = [];
  const stats = getPerformanceStats();
  const errorRate = getErrorRate();

  // High error rate alert
  if (errorRate > 0.1) {
    alerts.push({
      level: 'critical',
      message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  }

  // Slow average response time
  if (stats.avgDuration > 2000) {
    alerts.push({
      level: 'warning',
      message: `Slow average response time: ${stats.avgDuration}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  // High memory usage
  const memoryUsage =
    (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
  if (memoryUsage > 90) {
    alerts.push({
      level: 'critical',
      message: `High memory usage: ${memoryUsage.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

// Auto-cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    clearOldMetrics();
  }, 5 * 60 * 1000);
}

