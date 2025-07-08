# 🚀 Quick Start: Admin Dashboard

## Easy Access to Your Admin Panel

Your admin dashboard is now easily accessible without any authentication:

### 1. **Direct Access**
- **URL**: `http://localhost:3000/admin-dashboard` (for development)
- **Production**: `https://your-domain.com/admin-dashboard`

### 2. **Navigation Links**
- Purple **🔧 Admin** button in the main site navigation
- Available on both mobile and desktop

## ⚡ Quick Operations

### Run Manual Scan
1. Click **"Run Manual Scan"** button
2. Wait for results (10-20 seconds)
3. Review findings with confidence scores
4. Select high-confidence findings (80%+)
5. Click **"Approve Selected"** to add to database

### Monitor Performance
- **Dashboard shows**: Total companies, BTC holdings, last scan time
- **Auto-refresh**: Click "Refresh Stats" to update numbers
- **Auto-scan**: Toggle to enable 6-hour automatic scanning

## 🔧 API Endpoints (Simplified)

All admin operations use simple endpoints:

```bash
# Run a scan
POST /api/admin/dynamic-scan

# Get admin stats  
GET /api/admin/stats

# Approve a finding
POST /api/admin/approve-finding
```

## 🎯 Testing Automated Searches

### 1. **Test the Edge Function**
```bash
# Test via curl (replace with your Supabase URL)
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  https://your-project.supabase.co/functions/v1/dynamic-data-updater
```

### 2. **Test via Admin Dashboard**
- Go to `/admin-dashboard`
- Click "Run Manual Scan"
- Should see results within 20 seconds

### 3. **Expected Results**
The scanner should find companies like:
- **Meitu (1357.HK)** - ~940 BTC
- **Boyaa Interactive (0434.HK)** - ~290 BTC
- **Other HKEX/Asian companies**

## ⚙️ Setup Checklist

### Required Environment Variables
```bash
# In Supabase secrets
PERPLEXITY_API_KEY=your-perplexity-key
FIRECRAWL_API_KEY=your-firecrawl-key

# In your .env.local
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Verify Setup
1. ✅ Admin dashboard loads at `/admin-dashboard`
2. ✅ "Run Manual Scan" button works
3. ✅ Stats display correctly
4. ✅ Can approve findings to database

## 🔍 Troubleshooting

### No Results Found
- Check API keys in Supabase secrets
- Review edge function logs: `supabase functions logs dynamic-data-updater`

### Error Messages
- **"Perplexity API key not configured"**: Set the secret in Supabase
- **"Edge function error"**: Check function deployment
- **"Failed to approve finding"**: Check database permissions

### Performance Issues
- Scans take 10-20 seconds (normal)
- Multiple concurrent scans may slow down
- Rate limiting: 1 second between Perplexity queries

## 🎉 You're Ready!

Your admin panel is now:
- ✅ **Accessible** without authentication
- ✅ **Simple** one-click operations  
- ✅ **Automated** with optional 6-hour scanning
- ✅ **Streamlined** with confidence scoring
- ✅ **Monitoring** with real-time stats

Navigate to the admin dashboard and start discovering Bitcoin treasuries!