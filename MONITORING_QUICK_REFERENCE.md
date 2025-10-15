# 🔍 Monitoring Quick Reference

## Endpoints

```bash
# Full health check with metrics
curl 'http://localhost:3000/api/health'

# Quick readiness check (for load balancers)
curl 'http://localhost:3000/api/readyz'

# Detailed monitoring stats
curl 'http://localhost:3000/api/monitoring/stats'
```

---

## Usage in Code

### Track API Performance
```typescript
import { trackApiCall } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const data = await fetchData();
    trackApiCall('/api/endpoint', start, 200);
    return NextResponse.json(data);
  } catch (error) {
    trackApiCall('/api/endpoint', start, 500);
    throw error;
  }
}
```

### Log Errors
```typescript
import { logError } from '@/lib/monitoring';

try {
  await operation();
} catch (error) {
  logError(error as Error, { context: 'additional info' });
  throw error;
}
```

### Wrap Operations
```typescript
import { withPerformanceTracking } from '@/lib/monitoring';

const result = await withPerformanceTracking(
  'operation_name',
  async () => await performOperation(),
  { metadata: 'optional' }
);
```

---

## Alert Thresholds

| Alert | Threshold | Severity |
|-------|-----------|----------|
| High error rate | > 10% | Critical |
| Slow response | > 2s avg | Warning |
| High memory | > 90% | Critical |

---

## Health Check Response

```json
{
  "status": "healthy|degraded|unhealthy",
  "services": [
    {"service": "database", "status": "healthy", "latency": 42},
    {"service": "redis", "status": "not_configured"},
    {"service": "api", "status": "healthy"}
  ],
  "system": {"memory": {...}, "uptime": 1296.86},
  "metrics": {"performance": {...}, "errorRate": {...}},
  "alerts": [],
  "uptime": 1296.856
}
```

---

## Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Healthy/Degraded | OK |
| 429 | Rate limited | Wait and retry |
| 503 | Unhealthy | Check logs |

---

## Functions Available

```typescript
// From @/lib/monitoring
trackPerformance(name, duration, metadata?)
trackApiCall(endpoint, startTime, status, metadata?)
logError(error, context?)
getPerformanceMetrics(limit = 20)
getRecentErrors(limit = 20)
getPerformanceStats()
checkSystemHealth()
performHealthChecks(supabase)
getErrorRate()
checkAlerts()
withPerformanceTracking(name, fn, metadata?)
clearOldMetrics(olderThanMs = 3600000)
```

---

## Production Checklist

- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Monitor `/api/health` every 60s
- [ ] Set up alerts for critical thresholds
- [ ] Enable Vercel Analytics
- [ ] Test error boundary
- [ ] Review monitoring stats regularly

---

## Common Issues

**No metrics showing:**
- Make API calls first to generate metrics

**Alerts firing unnecessarily:**
- Adjust thresholds in `lib/monitoring.ts`

**High memory alert:**
- Check for memory leaks
- Consider scaling up

**Rate limited:**
- Wait 60 seconds or adjust limits

---

## Next Steps

1. Test endpoints in production
2. Set up external monitoring
3. Build monitoring dashboard (optional)
4. Add Sentry when available
5. Complete Phase 5.4 (SEO)!

