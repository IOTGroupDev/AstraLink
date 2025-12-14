# Chart Data Migration

## Problem

Due to a bug in `ChartRepository.update()`, chart data was wrapped multiple times, creating deeply nested structures like `data.data.data.data.data.data.data.planets` instead of `data.planets`.

## Solution

This migration unwraps the nested structures back to the correct format.

## Methods to Run Migration

### Method 1: SQL Script (Fastest)

```bash
# Connect to your database and run:
psql $DATABASE_URL -f backend/migrations/fix-nested-chart-data.sql
```

### Method 2: TypeScript Script (Recommended for Development)

```bash
# From backend directory:
cd backend
npm run ts-node src/scripts/fix-nested-chart-data.ts
```

### Method 3: API Endpoint (Production)

```bash
# Make authenticated POST request:
curl -X POST https://your-api.com/api/v1/chart/admin/fix-nested-data \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "fixed": 15,
  "skipped": 3,
  "total": 18
}
```

## What It Does

1. Scans all charts in the database
2. For each chart with nested data structure:
   - Unwraps `data.data.data...` until finding `planets` object
   - Updates the chart with corrected structure
   - Logs the depth of nesting that was fixed
3. Returns statistics on fixed vs skipped charts

## Safety

- **Non-destructive**: Only updates charts with incorrect nesting
- **Idempotent**: Safe to run multiple times
- **Logged**: All operations are logged for audit trail
- **Max depth limit**: Stops at 20 levels to prevent infinite loops

## After Migration

Once migration is complete:

- New charts will be saved with correct structure (bug is fixed in code)
- Old charts will have correct structure
- Frontend will load data properly

## Verification

Check a chart manually:

```sql
SELECT
  id,
  jsonb_typeof(data) as data_type,
  jsonb_typeof(data->'planets') as has_planets,
  jsonb_typeof(data->'data') as has_nested_data
FROM charts
LIMIT 5;
```

Correct structure should show:

- `data_type`: "object"
- `has_planets`: "object" (not null)
- `has_nested_data`: null (no nested data key)
