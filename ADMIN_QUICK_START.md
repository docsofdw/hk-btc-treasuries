# 🚀 Quick Start: Admin Dashboard

## 🔒 Authentication Required

All admin routes are now protected with HTTP Basic Authentication for security.

### Admin Credentials
- **Username**: `admin`
- **Password**: `vqdLLs1534lq5k`

**Important**: Keep these credentials secure! You'll be prompted to enter them when accessing any `/admin` route.

---

## Easy Access to Your Admin Panel

### 1. **Direct Access**
- **Local Development**: `http://localhost:3000/admin-dashboard`
- **Production**: `https://your-domain.com/admin-dashboard`
- Your browser will prompt for username/password on first access

### 2. **Navigation Links**
- Purple **🔧 Admin** button in the main site navigation
- Available on both mobile and desktop
- Requires authentication on first click

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
- ✅ **Secure** with HTTP Basic Authentication
- ✅ **Simple** one-click operations  
- ✅ **Automated** with optional 6-hour scanning
- ✅ **Streamlined** with confidence scoring
- ✅ **Monitoring** with real-time stats

Navigate to the admin dashboard and start discovering Bitcoin treasuries!

---

## 🔐 Security Notes

### Environment Variable Setup
The authentication is configured via the `ADMIN_BASIC_AUTH` environment variable:

**Local Development** (`.env.local`):
```bash
ADMIN_BASIC_AUTH="Basic YWRtaW46dnFkTExzMTUzNGxxNWs="
```

**Production** (Vercel/Deployment):
- Go to your hosting dashboard → Environment Variables
- Add `ADMIN_BASIC_AUTH` with value: `Basic YWRtaW46dnFkTExzMTUzNGxxNWs=`
- Deploy to all environments (Production, Preview, Development)

### Changing the Password
To change the admin password:
1. Generate new base64 string: `echo -n 'admin:NEW_PASSWORD' | base64`
2. Update `ADMIN_BASIC_AUTH` in `.env.local`: `Basic <new-base64-string>`
3. Update environment variables in production
4. Restart your server