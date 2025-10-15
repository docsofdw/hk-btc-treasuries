# Delta Calculation Implementation Summary

## Overview
Successfully implemented backend logic to calculate Bitcoin holding deltas between snapshots and display them in the frontend.

## ✅ Implementation Complete

### 1. Backend API Endpoint (`/app/api/v1/holdings/route.ts`)

**Added `calculateDeltas()` Helper Function:**
```typescript
async function calculateDeltas(supabase: any, entityIds: string[]): Promise<Map<string, number | null>>
```

**Key Features:**
- **Batch Query Optimization**: Fetches all snapshots for all entities in a single database query (avoids N+1 problem)
- **Efficient Processing**: Groups snapshots by entity_id and calculates deltas in memory
- **Error Handling**: Returns null deltas if snapshot data is unavailable
- **Formula**: `delta = latest.btc - previous.btc`

**Data Flow:**
1. Fetch entities from `latest_snapshot` materialized view
2. Extract all entity IDs
3. Batch query `holdings_snapshots` table for last 2 snapshots per entity
4. Calculate delta for each entity
5. Include `deltaBtc` in API response

### 2. TypeScript Types (`/types/treasury.ts`)

**Added to `TreasuryEntity` interface:**
```typescript
deltaBtc?: number | null; // Change since previous snapshot
```

**Type Safety:**
- Optional field (not all entities may have multiple snapshots)
- Nullable (entities with only 1 snapshot will have null)
- Number type for positive/negative values

### 3. Frontend Display (`/components/treasuries/EnhancedTreasuryTable.tsx`)

**Desktop Table Column:**
- Shows delta with green (+) for increases, red (-) for decreases
- Shows "—" placeholder when delta is unavailable
- Uses `numeral` formatting for thousands separators
- Column header with info tooltip explaining "Change since previous disclosure"

**Mobile Card View:**
- Delta displayed in expandable card details section
- Same color coding (green/red) as desktop
- Tooltip with explanation
- Gracefully handles null/undefined values

**Color Coding:**
- Green (`text-green-600`): Positive delta (BTC increased) ✅
- Red (`text-red-600`): Negative delta (BTC decreased)
- Gray (`text-gray-600`): Zero delta (no change)
- Light gray (`text-gray-400`): "—" when no data available

### 4. Data Transformation (`/app/(unauthenticated)/(marketing)/page.tsx`)

**Updated `fetcher()` function to map API response:**
```typescript
deltaBtc: h.deltaBtc ?? null, // NEW: Delta since last snapshot
```

Ensures the delta value flows from API → Component state → Display

## Database Schema

**Holdings Snapshots Table Structure:**
```sql
CREATE TABLE holdings_snapshots (
  id BIGSERIAL PRIMARY KEY,
  entity_id UUID REFERENCES entities(id),
  btc DECIMAL(12, 4) NOT NULL,
  cost_basis_usd DECIMAL(15, 2),
  last_disclosed DATE NOT NULL,
  source_url TEXT NOT NULL,
  data_source TEXT CHECK (data_source IN ('export', 'filing', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_holdings_entity_id ON holdings_snapshots(entity_id);
CREATE INDEX idx_holdings_created_at ON holdings_snapshots(created_at DESC);
```

**Query Strategy:**
- Uses indexes on `entity_id` and `created_at` for efficient lookups
- Orders by `created_at DESC` to get most recent snapshots first
- Limits to 2 snapshots per entity for delta calculation

## Performance Considerations

### Current Implementation ✅
- **Single batch query** for all snapshots (good!)
- **In-memory grouping** and calculation (fast!)
- **No N+1 queries** - avoided by batching all entity IDs

### Future Optimizations (TODO)
Consider these optimizations if performance becomes an issue:

1. **Materialized View with Window Function**
   ```sql
   CREATE MATERIALIZED VIEW latest_snapshot_with_delta AS
   SELECT 
     e.*,
     latest.btc,
     latest.btc - LAG(latest.btc) OVER (
       PARTITION BY e.id 
       ORDER BY latest.created_at
     ) as delta_btc
   FROM entities e
   LEFT JOIN holdings_snapshots latest ON ...
   ```

2. **Redis Caching**
   - Cache delta calculations for 5-10 minutes
   - Invalidate on new snapshot insertions

3. **Computed Column**
   - Store delta in the `latest_snapshot` materialized view
   - Update during view refresh

## Testing

### Manual Test Steps

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Check API response:**
   ```bash
   curl http://localhost:3000/api/v1/holdings?region=HK | jq '.data.holdings[0].deltaBtc'
   ```

3. **Verify frontend display:**
   - Navigate to http://localhost:3000
   - Check "Δ Since Last" column in desktop table
   - Expand mobile card to see delta in details

### Expected Behavior

**Entities with 2+ snapshots:**
- Should show numeric delta (e.g., `+1,000` or `-500`)
- Color coded appropriately

**Entities with 1 snapshot:**
- Should show "—" (null delta)
- This is normal for newly added entities

**Entities with no change:**
- Should show `0` in gray

## API Response Format

**Before:**
```json
{
  "success": true,
  "data": {
    "holdings": [{
      "id": "uuid",
      "company": "Company Name",
      "btcHoldings": 5000,
      // ... other fields
    }]
  }
}
```

**After (with delta):**
```json
{
  "success": true,
  "data": {
    "holdings": [{
      "id": "uuid",
      "company": "Company Name",
      "btcHoldings": 5000,
      "deltaBtc": 150,  // ← NEW FIELD
      // ... other fields
    }]
  }
}
```

## Edge Cases Handled

1. **No snapshots**: Returns null delta ✅
2. **Only 1 snapshot**: Returns null delta ✅
3. **Exactly 2 snapshots**: Calculates delta correctly ✅
4. **More than 2 snapshots**: Uses 2 most recent ✅
5. **Database error**: Returns empty delta map, nulls for all entities ✅
6. **Frontend undefined/null**: Shows "—" placeholder ✅

## Files Modified

1. ✅ `/app/api/v1/holdings/route.ts` - Added delta calculation logic
2. ✅ `/types/treasury.ts` - Added `deltaBtc` field to interface
3. ✅ `/app/(unauthenticated)/(marketing)/page.tsx` - Updated data mapping
4. ✅ `/components/treasuries/EnhancedTreasuryTable.tsx` - Display delta in UI

## Build Status

✅ **No compilation errors**
✅ **No linter errors in modified files**
✅ **TypeScript types valid**

## What's Next?

The delta calculation is now live! 🎉

**To populate deltas for existing entities:**
1. Entities need at least 2 snapshots in `holdings_snapshots` table
2. New snapshots are created when:
   - Admin manually updates holdings
   - Automated scraper finds new filings
   - Data refresh runs

**To test with real data:**
1. Trigger a data refresh or manual update for an entity
2. This will create a new snapshot
3. The delta will automatically appear on the next page load

## Notes

- Delta is calculated from the **two most recent snapshots**, not from a fixed time period
- If you want "delta since last week", you'd need a different approach (query snapshots by date range)
- Current implementation is optimized for "what changed since the last disclosure"

