# Bitcoin Treasury Tracking System - Technical Architecture

This document provides a comprehensive technical overview of the Bitcoin treasury tracking system, including the parsing/scraping process, data flow, and system architecture.

## 🏗️ System Overview

The Bitcoin Treasury Tracking System automatically monitors and tracks Bitcoin holdings of publicly traded companies by scanning regulatory filings, parsing documents, and extracting Bitcoin-related information.

### Key Components

1. **Filing Scanners** - Monitor regulatory websites for new filings
2. **PDF Parsers** - Extract text from filing documents
3. **Bitcoin Extractors** - Identify Bitcoin amounts and transaction types
4. **Market Data Fetchers** - Get current stock prices and market caps
5. **Database Layer** - Store and manage all data
6. **Monitoring System** - Track health and performance

## 🔄 Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Regulatory      │────│ Filing Scanners  │────│ Raw Filings DB  │
│ Websites        │    │ (HKEX, SEC)      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Market Data     │────│ PDF Parser       │────│ Extracted Data  │
│ APIs            │    │ + Bitcoin        │    │ Processing      │
└─────────────────┘    │ Extractor        │    └─────────────────┘
                       └──────────────────┘            │
                                                       ▼
                              ┌─────────────────────────────────┐
                              │ Final Database (Entities +      │
                              │ Holdings + Market Data)         │
                              └─────────────────────────────────┘
```

## 📂 Database Schema

### Core Tables

```sql
-- Companies that hold Bitcoin
entities (
  id UUID PRIMARY KEY,
  legal_name TEXT,
  ticker TEXT UNIQUE,
  listing_venue TEXT,
  region TEXT,
  hq TEXT,
  market_cap BIGINT,
  shares_outstanding BIGINT,
  stock_price DECIMAL,
  market_data_source TEXT,
  market_data_updated_at TIMESTAMPTZ
)

-- Raw regulatory filings
raw_filings (
  id UUID PRIMARY KEY,
  entity_id UUID REFERENCES entities(id),
  title TEXT,
  pdf_url TEXT,
  disclosed_at TIMESTAMPTZ,
  source TEXT, -- 'HKEX', 'SEC', etc.
  filing_type TEXT, -- 'acquisition', 'disposal', 'update'
  btc DECIMAL,
  btc_delta DECIMAL,
  btc_total DECIMAL,
  extracted_text TEXT,
  detected_in TEXT,
  verified BOOLEAN
)

-- Historical holdings snapshots
holdings_snapshots (
  id UUID PRIMARY KEY,
  entity_id UUID REFERENCES entities(id),
  btc DECIMAL,
  btc_usd_value DECIMAL,
  cost_basis_usd DECIMAL,
  last_disclosed TIMESTAMPTZ,
  source_url TEXT,
  data_source TEXT
)

-- Audit trail
audit_logs (
  id UUID PRIMARY KEY,
  action TEXT,
  entity_id UUID,
  user_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
)
```

## 🔍 Filing Scanner Process

### 1. HKEX Scanner (`supabase/functions/scan-hkex-filings/`)

**Purpose**: Monitors Hong Kong Exchange for Bitcoin-related announcements

**Process**:
1. **Known Entity Scanning**: For each tracked HK entity, scan ALL recent filings
2. **Broad Keyword Search**: Search across all companies for Bitcoin keywords
3. **Filing Detection**: Uses multi-language keywords (English + Chinese)
4. **Entity Creation**: Automatically creates new entities for unknown companies

**Keywords Monitored**:
```javascript
const BITCOIN_KEYWORDS = [
  'bitcoin', 'btc', 'digital asset', 'cryptocurrency', 'crypto asset',
  'virtual currency', 'digital currency', 'blockchain asset',
  '比特币', '數字資產', '加密货币', '虛擬資產', '數位資產', '數碼資產'
];
```

**Rate Limiting**: 2-second delays between requests to respect HKEX servers

### 2. SEC Scanner (Similar pattern for US filings)

**Purpose**: Monitors SEC EDGAR database for US company filings

**Process**:
1. Scan 10-K, 10-Q, 8-K filings for tracked US entities
2. Full-text search for Bitcoin mentions
3. Parse structured EDGAR data

## 📄 PDF Parsing System

### Architecture Overview

The PDF parsing system uses a multi-layered approach for maximum reliability:

```
┌─────────────────┐
│ PDF URL Input   │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ URL Validation  │ ← Security check (whitelist domains)
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Primary Parser  │ ← pdfjs-dist (modern, reliable)
│ (PDFParser)     │
└─────────┬───────┘
          │ (if fails)
          ▼
┌─────────────────┐
│ Fallback Parser │ ← Simple text extraction
│ (SimplePDFParser)│
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Text Output     │
└─────────────────┘
```

### 1. PDFParser (`lib/parsers/pdf-parser.ts`)

**Features**:
- Uses `pdfjs-dist` for reliable parsing in Deno/Node
- 10MB file size limit
- 30-second timeout protection
- Page-by-page text extraction
- Metadata extraction

**Security**:
- Domain whitelist for PDF sources
- HTTPS-only enforcement
- Resource limits (size/time)

**Whitelisted Domains**:
```typescript
const allowedDomains = [
  'hkexnews.hk',
  'www1.hkexnews.hk', 
  'sec.gov',
  'www.sec.gov',
  'edgar.sec.gov',
  'bitcoin-treasuries.com'
];
```

### 2. SimplePDFParser (Fallback)

**When Used**: If primary parser fails
**Method**: Regex-based text extraction from PDF streams
**Limitations**: Less reliable but works for simple PDFs

## 🪙 Bitcoin Extraction Engine

### Overview (`lib/parsers/bitcoin-extractor.ts`)

The Bitcoin extraction engine uses advanced regex patterns to identify Bitcoin amounts and transaction types in regulatory text.

### Pattern Matching

```javascript
const patterns = {
  // Acquisition patterns
  purchased: /(?:purchased?|acquired?|bought)\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/gi,
  
  // Disposal patterns  
  sold: /(?:sold|disposed?\s+of|divested)\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/gi,
  
  // Total holdings
  totalHoldings: /(?:total\s+(?:bitcoin|btc)\s+holdings?|now\s+holds?|current\s+holdings?)\s*(?:of|:)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/gi,
  
  // General amounts
  btcAmount: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|btc)/gi
};
```

### Extraction Logic

1. **Transaction Detection**: First looks for specific transaction verbs
2. **Amount Parsing**: Extracts numeric values with comma handling
3. **Context Analysis**: Determines if it's acquisition, disposal, or update
4. **Fallback Matching**: Uses general patterns if specific ones fail

### Filing Type Classification

```javascript
function determineFilingType(btcDelta, btcTotal, isDisposal) {
  if (btcDelta) {
    return isDisposal ? 'disposal' : 'acquisition';
  } else if (btcTotal) {
    return 'update';
  }
  return 'disclosure';
}
```

## 📊 Market Data Integration

### Multi-API Approach (`lib/services/market-data-fetcher.ts`)

The system uses multiple financial data APIs with intelligent fallbacks:

**API Priority Order**:
1. **Finnhub** (60 req/min) - Primary for US stocks
2. **Polygon** (5 req/min) - High-quality data
3. **Twelve Data** (8 req/min) - International markets
4. **Alpha Vantage** (5 req/min) - Fallback
5. **Yahoo Finance** (100 req/hour) - Last resort

### Caching Strategy

```typescript
class MarketDataCache {
  private ttl = 30 * 60 * 1000; // 30 minutes
  
  get(ticker: string): MarketData | null {
    // Returns cached data if within TTL
  }
  
  set(ticker: string, data: MarketData): void {
    // Stores with timestamp
  }
}
```

### Batch Processing

- Processes up to 5 tickers simultaneously
- 1-second delays between batches
- Continues processing even if individual tickers fail

## 🔄 Complete Process Flow

### 1. Filing Discovery
```
HKEX Scanner → New Filing Detected → Raw Filing Record Created
```

### 2. PDF Processing
```
PDF URL → Security Validation → Download → Parse → Extract Text
```

### 3. Bitcoin Extraction
```
Raw Text → Pattern Matching → Amount Extraction → Classification → Database Update
```

### 4. Market Data Enrichment
```
Entity Ticker → API Calls → Market Cap/Price → Entity Update
```

### 5. Data Aggregation
```
Raw Filings → Holdings Calculation → Materialized Views → Public API
```

## 🛠️ API Endpoints

### Core Endpoints

**`GET /api/v1/holdings`**
- Returns aggregated Bitcoin holdings data
- Powers the main dashboard
- Cached and optimized for performance

**`POST /supabase/functions/scan-hkex-filings`**
- Triggers HKEX filing scan
- Can be called manually or via cron
- Returns scan results and statistics

**`POST /supabase/functions/parse-pdf`**
- Parses a specific PDF filing
- Input: `{ url, filingId }`
- Returns extracted Bitcoin data

**`POST /supabase/functions/update-market-data`**
- Updates market data for all entities
- Uses the new multi-API fetcher
- Returns success/failure statistics

### Health & Monitoring

**`GET /api/health`**
- System health check
- Tests database connectivity
- Checks external API availability
- Returns performance metrics

## 🔐 Security Features

### Input Validation
- All URLs validated against whitelist
- Ticker format validation (`/^[A-Z0-9]+(\.[A-Z]+)?$/`)
- Bitcoin amounts validated as positive numbers
- Text sanitization using DOMPurify

### Rate Limiting
```typescript
const rateLimiters = {
  hkex: new RateLimiter({ maxRequests: 100, windowMs: 60 * 60 * 1000 }),
  sec: new RateLimiter({ maxRequests: 500, windowMs: 60 * 60 * 1000 }),
  pdfParsing: new RateLimiter({ maxRequests: 100, windowMs: 60 * 60 * 1000 })
};
```

### Database Security
- Row Level Security (RLS) policies
- Service role for automated operations
- User permissions for manual operations
- Audit logging for all changes

## 📈 Monitoring & Observability

### Structured Logging
```typescript
monitoring.info('service-name', 'Operation completed', {
  ticker: 'AAPL',
  duration: 1500,
  result: 'success'
});
```

### Performance Tracking
- Operation duration measurement
- Success rate calculation
- P95 latency monitoring
- Automatic slow operation detection

### Health Checks
- Database connectivity tests
- External API availability
- Service degradation detection
- Alert generation for issues

### Metrics Collection
- API response times
- Error rates by service
- Cache hit rates
- Processing volumes

## 🔄 Cron Jobs & Automation

### Scheduled Operations

**Market Data Updates** (Every 4 hours)
```
0 */4 * * * → Update market caps and stock prices
```

**HKEX Filing Scans** (Every 2 hours during business days)
```
0 */2 * * 1-5 → Scan for new HKEX filings
```

**SEC Filing Scans** (Daily)
```
0 6 * * * → Scan for new SEC filings
```

**Data Refresh** (Daily)
```
0 2 * * * → Refresh materialized views and aggregations
```

## 🧪 Testing Strategy

### Unit Tests
- Bitcoin extraction patterns
- PDF parsing edge cases
- Market data API responses
- Database operations

### Integration Tests
- End-to-end filing processing
- API endpoint functionality
- Error handling scenarios

### Performance Tests
- Large PDF processing
- Batch market data fetching
- Database query optimization

## 🚀 Deployment Considerations

### Environment Variables
```env
# Database
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Market Data APIs
FINNHUB_API_KEY=
POLYGON_API_KEY=
TWELVE_DATA_API_KEY=
ALPHA_VANTAGE_API_KEY=

# Monitoring
LOG_LEVEL=info
CACHE_TTL=1800
```

### Scaling Considerations
- Supabase Edge Functions auto-scale
- Database connection pooling
- API rate limit management
- Cache warming strategies

### Backup & Recovery
- Daily database backups
- Point-in-time recovery
- Audit log retention
- Configuration backup

## 🔧 Maintenance & Operations

### Regular Tasks
1. Monitor API key usage and limits
2. Review error logs and failure patterns
3. Update entity listings as companies change tickers
4. Verify parsing accuracy with manual spot checks

### Troubleshooting
1. Check `/api/health` for system status
2. Review structured logs for specific errors
3. Verify external API connectivity
4. Check database connection and performance

### Performance Optimization
1. Monitor cache hit rates
2. Optimize database queries
3. Review API usage patterns
4. Tune batch processing sizes

This system provides comprehensive, automated tracking of Bitcoin holdings across multiple regulatory jurisdictions while maintaining high reliability, security, and performance standards. 