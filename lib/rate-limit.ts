import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create Redis instance (only if UPSTASH_REDIS_REST_URL exists)
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Public API rate limit: 60 requests per minute per IP
export const publicApiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'ratelimit:public',
    })
  : null;

// Strict limiter for expensive operations: 10 requests per minute
export const strictLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:strict',
    })
  : null;

// Simple in-memory store for development (when Redis not available)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup old entries every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of memoryStore.entries()) {
      if (value.resetTime < now) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export async function fallbackRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const now = Date.now();
  const record = memoryStore.get(identifier);
  
  // Clean up expired records
  if (record && record.resetTime < now) {
    memoryStore.delete(identifier);
  }
  
  const current = memoryStore.get(identifier);
  
  if (!current) {
    memoryStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }
  
  if (current.count >= limit) {
    return { success: false, limit, remaining: 0, reset: current.resetTime };
  }
  
  current.count++;
  return { success: true, limit, remaining: limit - current.count, reset: current.resetTime };
}

// Helper to get client IP from request
export function getClientIp(request: Request): string {
  // Vercel provides this header
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'anonymous';
}

// Helper to add rate limit headers to response
export function addRateLimitHeaders(
  headers: Headers,
  rateLimit: {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }
): void {
  headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
  headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  headers.set('X-RateLimit-Reset', rateLimit.reset.toString());
}

// Rate limiting wrapper with automatic fallback
export async function rateLimit(
  identifier: string,
  limiter: typeof publicApiLimiter | typeof strictLimiter,
  fallbackLimit: number,
  fallbackWindow: number
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Use Redis-based limiter if available
  if (limiter) {
    try {
      return await limiter.limit(identifier);
    } catch (error) {
      console.warn('Redis rate limiter failed, falling back to memory:', error);
      // Fall through to memory-based limiter
    }
  }
  
  // Use in-memory fallback
  return await fallbackRateLimit(identifier, fallbackLimit, fallbackWindow);
}

