# 🛡️ Rate Limiting Setup Guide

## ✅ What Was Implemented

Rate limiting has been successfully added to protect your public API endpoints from abuse!

---

## 📊 Implementation Summary

### **Protected Endpoints:**

| Endpoint | Limit | Window | Status |
|----------|-------|--------|--------|
| `/api/v1/holdings` | 60 req/min | 60 seconds | ✅ Protected |
| `/api/health` | 60 req/min | 60 seconds | ✅ Protected |
| `/api/filings/recent` | 60 req/min | 60 seconds | ✅ Protected |

---

## 🔧 How It Works

### **Two-Tier Approach:**

1. **Production (with Redis):**
   - Uses Upstash Redis for distributed rate limiting
   - Accurate across multiple serverless instances
   - Analytics and monitoring built-in

2. **Development (fallback):**
   - Uses in-memory store when Redis not configured
   - Perfect for local development
   - Automatically cleans up expired records

---

## 📁 Files Created/Modified

### **New File:**
- ✅ `/lib/rate-limit.ts` - Rate limiting configuration and helpers

### **Modified Files:**
- ✅ `/app/api/v1/holdings/route.ts` - Added rate limiting
- ✅ `/app/api/health/route.ts` - Added rate limiting  
- ✅ `/app/api/filings/recent/route.ts` - Added rate limiting

---

## 🧪 Testing

### **Verify Headers:**
```bash
curl -I 'http://localhost:3000/api/v1/holdings?region=HK'
```

**Expected headers:**
```
x-ratelimit-limit: 60
x-ratelimit-remaining: 59
x-ratelimit-reset: 1760490735603
```

### **Test Rate Limit:**
```bash
# Send 61 requests rapidly (exceeds 60/min limit)
for i in {1..61}; do 
  curl -s 'http://localhost:3000/api/v1/holdings?region=HK' | jq '.error'
  sleep 0.1
done

# After 60 requests, you should see:
# "Too many requests. Please try again later."
```

### **Check 429 Response:**
```bash
# After hitting limit
curl -v 'http://localhost:3000/api/v1/holdings?region=HK' 2>&1 | grep -E '(429|rate|retry)'
```

**Expected:**
```
< HTTP/1.1 429 Too Many Requests
< x-ratelimit-limit: 60
< x-ratelimit-remaining: 0
< retry-after: 42
```

---

## 🚀 Production Setup (Optional)

### **Why Use Upstash Redis?**

The in-memory fallback works fine for development, but for production you should use Redis:

**Benefits:**
- ✅ Accurate limits across multiple serverless instances
- ✅ Analytics dashboard
- ✅ Better performance
- ✅ No memory leaks
- ✅ Persistent across deployments

### **Setup Upstash (Free Tier):**

1. **Sign up:** https://upstash.com
2. **Create Redis database:**
   - Click "Create Database"
   - Choose region closest to your users
   - Select "Free" plan
3. **Get credentials:**
   - Copy `UPSTASH_REDIS_REST_URL`
   - Copy `UPSTASH_REDIS_REST_TOKEN`
4. **Add to Vercel:**
   ```bash
   vercel env add UPSTASH_REDIS_REST_URL
   vercel env add UPSTASH_REDIS_REST_TOKEN
   ```

### **Environment Variables:**

Add these to your `.env.local` (development) or Vercel dashboard (production):

```bash
# Upstash Redis for Rate Limiting (optional)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**Important:** If these variables are NOT set, rate limiting automatically falls back to in-memory mode. Your app will still work!

---

## 📈 Rate Limiting Strategy

### **Current Limits:**

```typescript
// Public API endpoints
publicApiLimiter: 60 requests per minute per IP

// Strict endpoints (expensive operations)
strictLimiter: 10 requests per minute per IP
```

### **Why 60 requests/minute?**

- ✅ Generous for legitimate users (1 request/second)
- ✅ Prevents abuse and scraping
- ✅ Works well with CDN caching (most requests cached anyway)
- ✅ Easy to remember and communicate

### **Sliding Window Algorithm:**

```
Time: 0s ───────── 30s ───────── 60s
       |            |             |
Req:   30 ────────► 20 ─────────► 10
       ↓            ↓             ↓
Limit: ✅ OK       ✅ OK         ✅ OK

Time: 0s ───────── 30s ───────── 60s
       |            |             |
Req:   60 ────────► 5 ──────────► 0
       ↓            ↓             ↓
Limit: ✅ OK       🚫 BLOCKED    ✅ OK (reset)
```

**Benefits:**
- Smooths out bursts
- Fairer than fixed windows
- Prevents edge-case abuse

---

## 🔍 Response Headers Explained

### **Success Response (within limit):**
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 60         // Total requests allowed
X-RateLimit-Remaining: 42     // Requests left in window
X-RateLimit-Reset: 1760490795 // Unix timestamp when limit resets
```

### **Rate Limited Response (exceeded):**
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1760490795
Retry-After: 23                // Seconds until retry
```

```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 23
}
```

---

## 🛠️ Customization

### **Change Rate Limits:**

Edit `/lib/rate-limit.ts`:

```typescript
// More generous: 120 requests/minute
export const publicApiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(120, '1 m'),
      analytics: true,
      prefix: 'ratelimit:public',
    })
  : null;

// More strict: 30 requests/minute
export const strictLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      analytics: true,
      prefix: 'ratelimit:strict',
    })
  : null;
```

### **Add Rate Limiting to More Endpoints:**

```typescript
import { publicApiLimiter, getClientIp, addRateLimitHeaders, rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const ip = getClientIp(request);
  const rateLimitResult = await rateLimit(ip, publicApiLimiter, 60, 60 * 1000);
  
  if (!rateLimitResult.success) {
    // Return 429 error
    // ... (copy from existing endpoints)
  }
  
  // ... your endpoint logic
}
```

### **Per-User Rate Limiting:**

Instead of IP-based, use user IDs:

```typescript
import { auth } from '@clerk/nextjs';

export async function GET(request: NextRequest) {
  const { userId } = auth();
  const identifier = userId || getClientIp(request); // Fallback to IP
  
  const rateLimitResult = await rateLimit(identifier, publicApiLimiter, 60, 60 * 1000);
  // ...
}
```

---

## 📊 Monitoring (with Upstash)

Once you set up Upstash Redis, you get analytics:

### **Upstash Dashboard:**
- Total requests
- Blocked requests
- Most active IPs
- Rate limit violations

### **Example Queries:**
```typescript
// Get analytics for last hour
const analytics = await redis.zrange(
  'ratelimit:public:analytics',
  Date.now() - 3600000,
  Date.now(),
  { byScore: true }
);
```

---

## 🚨 Common Issues & Solutions

### **Issue: "Rate limited in development"**
**Solution:** The in-memory store persists during server restart. Just wait 60 seconds or restart the dev server.

### **Issue: "Rate limiting not working across deploys"**
**Solution:** In-memory fallback doesn't work across serverless instances. Use Upstash Redis for production.

### **Issue: "Getting rate limited too quickly"**
**Solution:** Increase the limit in `/lib/rate-limit.ts` or check if you have caching enabled (most requests should be cached).

### **Issue: "Headers not showing up"**
**Solution:** Make sure you're adding `addRateLimitHeaders()` to the response in your endpoint.

---

## 🔒 Security Best Practices

### **✅ DO:**
- Use Redis in production
- Monitor rate limit violations
- Adjust limits based on usage patterns
- Combine with CDN caching
- Return proper Retry-After headers

### **❌ DON'T:**
- Rate limit authenticated admin endpoints (use separate limits)
- Set limits too low (frustrates users)
- Rely on in-memory for production
- Forget to add rate limit headers
- Block legitimate high-traffic users

---

## 📈 Next Steps

1. ✅ **Test locally** - Verify rate limiting works
2. ⏭️ **Deploy to preview** - Test in serverless environment
3. ⏭️ **Set up Upstash** - Add Redis for production
4. ⏭️ **Monitor usage** - Check analytics and adjust limits
5. ⏭️ **Add monitoring** - Track rate limit violations (Phase 5.3)

---

## 🎯 Success Criteria

- [x] Rate limiting added to 3 public endpoints
- [x] Rate limit headers included in responses
- [x] 429 errors return proper Retry-After
- [x] Fallback to in-memory for development
- [x] No linter errors
- [ ] Upstash Redis configured (optional)
- [ ] Rate limits tested in production
- [ ] Analytics dashboard reviewed

---

## 📚 Resources

- [Upstash Rate Limiting Docs](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [Vercel Edge Middleware](https://vercel.com/docs/functions/edge-middleware)
- [HTTP 429 Status Code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

---

## ✨ Summary

**Phase 5.2 is complete!** Your API now has:

✅ Rate limiting on all public endpoints  
✅ Proper HTTP 429 responses  
✅ Rate limit headers (`X-RateLimit-*`)  
✅ Automatic fallback for development  
✅ Production-ready with Upstash (optional)  
✅ Sliding window algorithm  
✅ IP-based limiting  
✅ Clean error messages  

**Your API is now protected from abuse!** 🛡️

