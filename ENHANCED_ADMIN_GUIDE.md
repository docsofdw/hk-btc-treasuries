# Enhanced Admin Dashboard Guide

## 🔒 Authentication Required

All admin routes (`/admin*`, `/admin-dashboard`) are protected with HTTP Basic Authentication.

### Admin Credentials
- **Username**: `admin`
- **Password**: `vqdLLs1534lq5k`

**Security Note**: Your browser will cache these credentials during your session. Keep them secure and only share with authorized administrators.

---

## Overview

Your Bitcoin treasury scanner now includes a significantly enhanced admin dashboard with better automation, monitoring, and data visualization capabilities.

## New Features

### 1. **Tabbed Interface**
- **Dashboard**: Overview with quick stats and recent activity
- **Scan Results**: Enhanced scanning controls with real-time progress
- **Monitoring**: System health and API usage tracking
- **Automation**: Automated scanning configuration

### 2. **Enhanced Data Display**
- **Confidence Filtering**: Filter findings by confidence score (50%, 70%, 80%+)
- **Expandable Details**: Click to see full details for each finding
- **Better Visualization**: Card-based layout with clear status indicators
- **Progress Tracking**: Real-time scan progress bars

### 3. **System Monitoring**
- **API Usage Tracking**: Monitor Perplexity, Firecrawl, and HKEX API limits
- **Error Tracking**: Recent system errors and warnings
- **Performance Metrics**: Success rates and execution times
- **Health Dashboard**: Overall system status

### 4. **Automation Controls**
- **Scheduler Management**: Enable/disable auto-scanning
- **Scraper Orchestration**: Centralized control of all scrapers
- **Configuration Management**: Easy scraper settings updates
- **Performance Optimization**: Automatic schedule adjustments

## How to Use

### Getting Started

1. **Access the Enhanced Dashboard**
   ```
   Navigate to: http://localhost:3000/admin-dashboard
   ```
   You'll be prompted to enter your admin credentials (username: `admin`, password: `vqdLLs1534lq5k`)

2. **Run the Database Migration**
   ```bash
   npx drizzle-kit push
   # OR if using Supabase CLI:
   supabase db push
   ```

3. **Enable New Components**
   The required UI components (tabs, progress, scroll-area) have been installed.

### Dashboard Tab

- **Quick Stats**: See total companies, BTC holdings, and system status at a glance
- **Recent Activity**: Monitor the last 10 system activities
- **System Health**: Check if scrapers are active and functioning

### Scan Results Tab

- **Run AI Discovery Scan**: Execute manual scans with progress tracking
- **Filter Results**: Use confidence threshold to focus on high-quality findings
- **Expand Details**: Click the arrow to see full finding information
- **Bulk Approval**: Select multiple findings and approve them at once

### Monitoring Tab

- **System Status**: Real-time scraper health monitoring
- **API Usage**: Track usage against rate limits for all services
- **Error Tracking**: Recent errors and system warnings

### Automation Tab

- **Auto-Scan Toggle**: Enable continuous scanning every 6 hours
- **Configuration**: Manage scraper settings and search parameters

## API Enhancements

### New Endpoints

1. **Scraper Control**: `/api/admin/scraper-control`
   - GET: Status, health, logs, recommendations
   - POST: Run scrapers, update configs, optimize

2. **Enhanced Stats**: `/api/admin/stats` (updated)
   - Now includes system health and recent activity
   - Falls back gracefully if enhanced features unavailable

### Database Enhancements

- **Scraper Logs Table**: Track all scraper executions
- **Performance Functions**: Calculate success rates and metrics
- **Automatic Cleanup**: Maintain reasonable log sizes

## Key Improvements

### 1. **Better Data Parsing**
- Enhanced company name validation
- Improved confidence scoring
- Better duplicate detection
- Multi-language support (Chinese, Japanese, Korean)

### 2. **Streamlined Operations**
- One-click scan execution
- Real-time progress feedback
- Bulk operations for findings
- Automated error recovery

### 3. **Comprehensive Monitoring**
- System health dashboards
- API usage tracking
- Performance metrics
- Error alerting

### 4. **Easy Automation**
- Simple toggle controls
- Intelligent scheduling
- Performance-based optimization
- Configuration management

## Migration Steps

### 1. **Replace Current Dashboard**
   ```bash
   # Backup current dashboard
   mv app/admin-dashboard/page.tsx app/admin-dashboard/page-backup.tsx
   
   # Use enhanced version
   mv app/admin-dashboard/enhanced-page.tsx app/admin-dashboard/page.tsx
   ```

### 2. **Apply Database Migration**
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or apply the SQL directly
   psql -d your_database -f supabase/migrations/012_scraper_orchestration.sql
   ```

### 3. **Update Environment Variables** (if needed)
   ```bash
   # Ensure you have these set:
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   PERPLEXITY_API_KEY=your_perplexity_key
   FIRECRAWL_API_KEY=your_firecrawl_key
   ```

## Troubleshooting

### Common Issues

1. **"Enhanced stats function not available"**
   - Run the database migration: `npx drizzle-kit push`
   - Check Supabase console for function existence

2. **Missing UI Components**
   - Install with: `npx shadcn@latest add tabs progress scroll-area`

3. **API Errors**
   - Check environment variables are set
   - Verify API keys are valid
   - Check network connectivity

### Performance Tips

1. **Optimize Scan Frequency**
   - Start with 6-hour intervals
   - Adjust based on API limits
   - Monitor success rates

2. **Manage Data Growth**
   - Run log cleanup regularly: `SELECT cleanup_scraper_logs();`
   - Monitor database size
   - Archive old findings

## Next Steps

1. **Test the Enhanced Dashboard**
   - Run a manual scan
   - Check monitoring metrics
   - Enable automation

2. **Configure Scraper Settings**
   - Adjust confidence thresholds
   - Update search queries
   - Optimize schedules

3. **Monitor Performance**
   - Watch API usage
   - Track success rates
   - Review error logs

## Support

The enhanced system includes:
- ✅ Comprehensive error handling
- ✅ Graceful fallbacks
- ✅ Performance monitoring
- ✅ Automated optimization
- ✅ Easy configuration management

Your scraper system is now production-ready with enterprise-level monitoring and automation capabilities.

---

## 🔐 Security Configuration

### Authentication Setup

The admin panel uses HTTP Basic Authentication configured via middleware.

**Local Development** (`.env.local`):
```bash
ADMIN_BASIC_AUTH="Basic YWRtaW46dnFkTExzMTUzNGxxNWs="
```

**Production Deployment**:
1. Go to your hosting provider (Vercel, etc.)
2. Navigate to Environment Variables
3. Add:
   - **Key**: `ADMIN_BASIC_AUTH`
   - **Value**: `Basic YWRtaW46dnFkTExzMTUzNGxxNWs=`
   - **Environments**: Production, Preview, Development
4. Redeploy your application

### Protected Routes

The following routes require authentication:
- `/admin` - Main admin page
- `/admin/*` - All admin sub-routes
- `/admin-dashboard` - Enhanced admin dashboard
- `/admin-dashboard/*` - All dashboard sub-routes

### Changing Admin Password

To update the password:
```bash
# Generate new credentials (replace NEW_PASSWORD)
echo -n 'admin:NEW_PASSWORD' | base64

# Update .env.local
ADMIN_BASIC_AUTH="Basic <new-base64-string>"

# Update production environment variables
# Restart/redeploy application
```

### Best Practices

1. **Never commit credentials** - `.env.local` is gitignored
2. **Use strong passwords** - Minimum 12 characters with mixed case, numbers, symbols
3. **Rotate regularly** - Change password every 90 days
4. **Limit access** - Only share credentials with authorized team members
5. **Monitor access** - Review server logs for unauthorized attempts