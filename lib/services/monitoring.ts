import type { SupabaseClient } from '@supabase/supabase-js';

interface LogData {
  [key: string]: unknown;
}

interface ErrorWithCode extends Error {
  code?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  message: string;
  data?: LogData;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration: number;
    memory?: number;
  };
}

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  details?: LogData;
}

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: string;
  success: boolean;
  metadata?: LogData;
}

interface AlertDetails {
  [key: string]: unknown;
}

interface Alert {
  type: 'error_rate' | 'performance' | 'health';
  severity: 'low' | 'medium' | 'high';
  message: string;
  details: AlertDetails;
}

export class MonitoringService {
  private logs: LogEntry[] = [];
  private metrics: PerformanceMetric[] = [];
  private maxLogs: number;
  private maxMetrics: number;

  constructor(options: { maxLogs?: number; maxMetrics?: number } = {}) {
    this.maxLogs = options.maxLogs || 1000;
    this.maxMetrics = options.maxMetrics || 5000;
  }

  // Structured logging methods
  debug(service: string, message: string, data?: LogData) {
    this.log('debug', service, message, data);
  }

  info(service: string, message: string, data?: LogData) {
    this.log('info', service, message, data);
  }

  warn(service: string, message: string, data?: LogData) {
    this.log('warn', service, message, data);
  }

  error(service: string, message: string, error?: Error, data?: LogData) {
    this.log('error', service, message, data, error);
  }

  private log(
    level: LogEntry['level'],
    service: string,
    message: string,
    data?: LogData,
    error?: Error
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      data
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as ErrorWithCode).code
      };
    }

    // Log to console with structured format
    const consoleMsg = JSON.stringify(entry);
    switch (level) {
      case 'debug':
        console.debug(consoleMsg);
        break;
      case 'info':
        console.log(consoleMsg);
        break;
      case 'warn':
        console.warn(consoleMsg);
        break;
      case 'error':
        console.error(consoleMsg);
        break;
    }

    // Store in memory (circular buffer)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  // Performance tracking
  async trackPerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: LogData
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;

    try {
      const result = await fn();
      success = true;
      return result;
    } finally {
      const duration = Date.now() - startTime;
      
      const metric: PerformanceMetric = {
        operation,
        duration,
        timestamp: new Date().toISOString(),
        success,
        metadata
      };

      this.metrics.push(metric);
      if (this.metrics.length > this.maxMetrics) {
        this.metrics.shift();
      }

      // Log slow operations
      if (duration > 5000) {
        this.warn('performance', `Slow operation: ${operation} took ${duration}ms`, {
          ...metadata,
          duration
        });
      }
    }
  }

  // Health check methods
  async checkDatabaseHealth(supabase: SupabaseClient): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase
        .from('entities')
        .select('count')
        .limit(1);

      const latency = Date.now() - startTime;

      if (error) {
        return {
          service: 'database',
          status: 'unhealthy',
          latency,
          details: { error: error instanceof Error ? error.message : 'Database error' }
        };
      }

      return {
        service: 'database',
        status: latency > 1000 ? 'degraded' : 'healthy',
        latency,
        details: { connected: true }
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        latency: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  async checkApiHealth(apiName: string, testUrl: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });

      const latency = Date.now() - startTime;

      return {
        service: `api:${apiName}`,
        status: response.ok ? (latency > 2000 ? 'degraded' : 'healthy') : 'unhealthy',
        latency,
        details: { status: response.status }
      };
    } catch (error) {
      return {
        service: `api:${apiName}`,
        status: 'unhealthy',
        latency: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  async performHealthChecks(supabase: SupabaseClient): Promise<HealthCheckResult[]> {
    const checks = [
      this.checkDatabaseHealth(supabase),
      this.checkApiHealth('coindesk', 'https://api.coindesk.com/v1/bpi/currentprice.json'),
      this.checkApiHealth('coingecko', 'https://api.coingecko.com/api/v3/ping')
    ];

    return Promise.all(checks);
  }

  getPerformanceStats(operation?: string): {
    count: number;
    avgDuration: number;
    p95Duration: number;
    successRate: number;
  } {
    const relevantMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return { count: 0, avgDuration: 0, p95Duration: 0, successRate: 0 };
    }

    const durations = relevantMetrics.map(m => m.duration).sort((a, b) => a - b);
    const successCount = relevantMetrics.filter(m => m.success).length;

    return {
      count: relevantMetrics.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p95Duration: durations[Math.floor(durations.length * 0.95)] || 0,
      successRate: successCount / relevantMetrics.length
    };
  }

  getErrorRate(service?: string, timeWindowMs: number = 3600000): number {
    const cutoff = new Date(Date.now() - timeWindowMs).toISOString();
    const recentLogs = this.logs.filter(log => 
      log.timestamp > cutoff && 
      (!service || log.service === service)
    );

    if (recentLogs.length === 0) return 0;

    const errorCount = recentLogs.filter(log => log.level === 'error').length;
    return errorCount / recentLogs.length;
  }

  exportLogs(level?: LogEntry['level'], service?: string): LogEntry[] {
    return this.logs.filter(log => 
      (!level || log.level === level) &&
      (!service || log.service === service)
    );
  }

  exportMetrics(operation?: string): PerformanceMetric[] {
    return operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;
  }

  checkAlerts(): Alert[] {
    const alerts: Alert[] = [];
    const errorRate = this.getErrorRate();
    const perfStats = this.getPerformanceStats();

    // High error rate alert
    if (errorRate > 0.1) {
      alerts.push({
        type: 'error_rate',
        severity: errorRate > 0.25 ? 'high' : 'medium',
        message: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
        details: { errorRate, threshold: 0.1 }
      });
    }

    // Performance degradation alert
    if (perfStats.avgDuration > 5000) {
      alerts.push({
        type: 'performance',
        severity: perfStats.avgDuration > 10000 ? 'high' : 'medium',
        message: `Performance degradation: avg ${perfStats.avgDuration}ms`,
        details: { avgDuration: perfStats.avgDuration, threshold: 5000 }
      });
    }

    return alerts;
  }

  cleanup(retentionMs: number = 24 * 60 * 60 * 1000) {
    const cutoff = new Date(Date.now() - retentionMs).toISOString();
    
    this.logs = this.logs.filter(log => log.timestamp > cutoff);
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
  }
}

// Global monitoring instance
export const monitoring = new MonitoringService(); 