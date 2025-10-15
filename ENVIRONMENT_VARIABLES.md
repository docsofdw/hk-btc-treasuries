# 🔐 Environment Variables Guide

## Required Variables

### **Clerk Authentication**
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```
Get these from: https://dashboard.clerk.com

---

### **Supabase Database**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Get these from: https://supabase.com/dashboard → Project Settings → API

---

### **Stripe Payments**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```
Get these from: https://dashboard.stripe.com/apikeys

---

## Optional Variables (Recommended)

### **Upstash Redis for Rate Limiting**
```bash
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**Status:** ⚠️ Optional but recommended for production  
**Purpose:** Distributed rate limiting across serverless instances  
**Fallback:** In-memory rate limiting (works but not recommended for production)  
**Get from:** https://upstash.com (free tier available)

**Setup instructions:**
1. Sign up at Upstash
2. Create a new Redis database
3. Copy REST URL and token
4. Add to Vercel environment variables

---

### **External APIs** (Future use)
```bash
PERPLEXITY_API_KEY=your-key
FIRECRAWL_API_KEY=your-key
```

**Status:** 🔮 Not currently used  
**Purpose:** Future AI-powered features

---

## Setup Instructions

### **Local Development:**

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in required values

3. Restart dev server:
   ```bash
   npm run dev
   ```

---

### **Production (Vercel):**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables

2. Add all required variables

3. For Upstash Redis (recommended):
   ```bash
   vercel env add UPSTASH_REDIS_REST_URL
   vercel env add UPSTASH_REDIS_REST_TOKEN
   ```

4. Redeploy:
   ```bash
   vercel --prod
   ```

---

## Verification

### **Check if variables are loaded:**

```typescript
// In any API route or server component
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('Redis URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '⚠️ Using fallback');
```

### **Test endpoints:**

```bash
# Should return data (not auth error)
curl 'http://localhost:3000/api/v1/holdings?region=HK'

# Should show rate limit headers
curl -I 'http://localhost:3000/api/v1/holdings?region=HK' | grep -i rate
```

---

## Security Notes

- ✅ Never commit `.env.local` to git (already in `.gitignore`)
- ✅ Use different values for development vs production
- ✅ Rotate secrets regularly
- ✅ Use Vercel's environment variable encryption
- ⚠️ `NEXT_PUBLIC_*` variables are exposed to the browser

---

## Troubleshooting

### **"Missing environment variable" error**
**Solution:** Make sure variable is in `.env.local` and restart dev server

### **"Rate limiting not working across deploys"**
**Solution:** Add Upstash Redis env vars to Vercel

### **"Supabase auth error"**
**Solution:** Check that all 3 Supabase variables are set correctly

---

## Quick Reference

| Variable | Required | Public | Purpose |
|----------|----------|--------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Yes | ✅ Yes | Auth UI |
| `CLERK_SECRET_KEY` | ✅ Yes | ❌ No | Auth API |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | ✅ Yes | Database connection |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | ✅ Yes | Public queries |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | ❌ No | Admin queries |
| `STRIPE_SECRET_KEY` | ✅ Yes | ❌ No | Payments |
| `UPSTASH_REDIS_REST_URL` | ⚠️ Optional | ❌ No | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | ⚠️ Optional | ❌ No | Rate limiting |

