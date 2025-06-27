interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
  name?: string;
}

interface RequestRecord {
  timestamp: number;
  key: string;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private options: RateLimiterOptions;
  
  constructor(options: RateLimiterOptions) {
    this.options = options;
  }
  
  /**
   * Check if a request is allowed under the rate limit
   * @param key - Unique identifier for the rate limit (e.g., IP, user ID, service name)
   * @returns true if request is allowed, false if rate limited
   */
  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(
      time => now - time < this.options.windowMs
    );
    
    if (validRequests.length >= this.options.maxRequests) {
      console.warn(`Rate limit exceeded for ${this.options.name || 'service'}: ${key} (${validRequests.length}/${this.options.maxRequests})`);
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    console.log(`Rate limit check for ${this.options.name || 'service'}: ${key} (${validRequests.length}/${this.options.maxRequests})`);
    return true;
  }
  
  /**
   * Wait until a slot is available for the request
   * @param key - Unique identifier for the rate limit
   * @param maxWaitMs - Maximum time to wait before giving up (default: 5 minutes)
   */
  async waitForSlot(key: string, maxWaitMs: number = 5 * 60 * 1000): Promise<boolean> {
    const startTime = Date.now();
    
    while (!(await this.checkLimit(key))) {
      if (Date.now() - startTime > maxWaitMs) {
        console.error(`Rate limiter timeout for ${this.options.name || 'service'}: ${key}`);
        return false;
      }
      
      // Calculate wait time based on oldest request in window
      const requests = this.requests.get(key) || [];
      const oldestRequest = Math.min(...requests);
      const waitTime = Math.max(1000, oldestRequest + this.options.windowMs - Date.now());
      
      console.log(`Rate limited, waiting ${waitTime}ms for ${this.options.name || 'service'}: ${key}`);
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 5000)));
    }
    
    return true;
  }
  
  /**
   * Get current usage for a key
   */
  getCurrentUsage(key: string): { current: number; max: number; resetTime: number } {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(time => now - time < this.options.windowMs);
    
    const resetTime = validRequests.length > 0 
      ? Math.min(...validRequests) + this.options.windowMs
      : now;
    
    return {
      current: validRequests.length,
      max: this.options.maxRequests,
      resetTime
    };
  }
  
  /**
   * Clear all rate limit data (useful for testing)
   */
  clear(): void {
    this.requests.clear();
  }
}

// Pre-configured rate limiters for different services
export const rateLimiters = {
  hkex: new RateLimiter({ 
    maxRequests: 100, 
    windowMs: 60 * 60 * 1000, // 100 requests per hour
    name: 'HKEX'
  }),
  
  sec: new RateLimiter({ 
    maxRequests: 500, 
    windowMs: 60 * 60 * 1000, // 500 requests per hour
    name: 'SEC'
  }),
  
  yahoo: new RateLimiter({
    maxRequests: 2000,
    windowMs: 60 * 60 * 1000, // 2000 requests per hour
    name: 'Yahoo Finance'
  }),
  
  alphaVantage: new RateLimiter({
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 requests per minute
    name: 'Alpha Vantage'
  }),
  
  pdfParsing: new RateLimiter({
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 100 PDFs per hour
    name: 'PDF Parsing'
  })
};

/**
 * Utility function to make rate-limited API calls
 */
export async function rateLimitedFetch(
  url: string, 
  limiter: RateLimiter, 
  options: RequestInit = {},
  retries: number = 3
): Promise<Response> {
  const key = new URL(url).hostname;
  
  // Wait for rate limit slot
  const allowed = await limiter.waitForSlot(key);
  if (!allowed) {
    throw new Error(`Rate limit timeout for ${url}`);
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BitcoinTreasuries/1.0)',
          ...options.headers,
        },
      });
      
      if (response.status === 429) {
        // Rate limited by server, wait and retry
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
        console.warn(`Server rate limited (429), waiting ${waitTime}ms before retry ${attempt}/${retries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      console.warn(`Fetch attempt ${attempt}/${retries} failed for ${url}:`, error instanceof Error ? error.message : String(error));
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  throw new Error(`All ${retries} fetch attempts failed for ${url}`);
} 