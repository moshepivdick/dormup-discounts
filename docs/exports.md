# Raw Data Export Documentation

## Overview

The Raw Data Export feature allows admins to export event data (page views, QR codes, redemptions) as CSV or XLSX files. Exports are stored in Supabase Storage with job status tracking.

## Setup

### 1. Database Migration

Run the migration SQL file:

```bash
# In Supabase SQL Editor or via psql
psql $DATABASE_URL < APPLY_EXPORT_JOB_MIGRATION.sql
```

Or manually execute `APPLY_EXPORT_JOB_MIGRATION.sql` in Supabase Dashboard → SQL Editor.

### 2. Supabase Storage Bucket

Create a private bucket named `exports`:

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `exports`
4. Public: **OFF** (private)
5. Click "Create bucket"

### 3. Environment Variables

Add to `.env` (and Vercel):

```bash
# Optional: Customize export limits
MAX_EXPORT_DAYS=31                    # Maximum date range (default: 31)
XLSX_MAX_ROWS=10000                   # XLSX row limit (default: 10000)
EXPORT_HASH_SALT=your-secret-salt     # Salt for user_id hashing (optional)
```

**Important**: Set `EXPORT_HASH_SALT` in production for consistent user_id hashing.

### 4. Generate Prisma Client

After migration:

```bash
npx prisma generate
```

## API Endpoints

### POST /api/admin/exports/events

Create a new export job.

**Request Body:**
```json
{
  "format": "csv" | "xlsx",
  "from": "YYYY-MM-DD",
  "to": "YYYY-MM-DD",
  "partnerId": "uuid" (optional),
  "types": ["PAGE_VIEW", "QR_GENERATED", "QR_REDEEMED"] (optional),
  "tz": "Europe/Rome" (optional, default: "Europe/Rome")
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "PENDING",
    "message": "Export job created. Poll GET /api/admin/exports/jobs/:id for status."
  }
}
```

**Errors:**
- `403`: Not admin
- `400`: Invalid parameters or date range exceeds MAX_EXPORT_DAYS
- `503`: ExportJob table missing (run migration)

### GET /api/admin/exports/jobs

List last 20 export jobs.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "created_at": "ISO string",
      "completed_at": "ISO string" | null,
      "status": "PENDING" | "READY" | "FAILED",
      "format": "csv" | "xlsx",
      "from_date": "YYYY-MM-DD",
      "to_date": "YYYY-MM-DD",
      "partner_id": "uuid" | null,
      "event_types": ["PAGE_VIEW"],
      "row_count": 1234 | null,
      "error_message": "string" | null,
      "download_url": "signed URL" | null
    }
  ]
}
```

### GET /api/admin/exports/jobs/:id

Get export job details and signed download URL.

**Response:**
Same structure as job item in list endpoint, plus `filters_json`.

## Export File Format

### Columns (CSV/XLSX)

1. `event_id` - Unique event identifier
2. `event_type` - `PAGE_VIEW` | `QR_GENERATED` | `QR_REDEEMED`
3. `created_at_utc` - ISO 8601 UTC timestamp
4. `created_at_local` - Europe/Rome timestamp
5. `partner_id` - Partner UUID (if applicable)
6. `partner_name` - Partner email (for reference)
7. `user_id_hash` - Hashed user ID (SHA256 with salt, first 16 chars)
8. `discount_id` - Discount use ID (for QR events)
9. `metadata_json` - JSON string with event details
10. `source` - Source table: `venue_view` | `discount_use`

### Privacy

- **NO PII**: Emails, names, phone numbers are NOT included
- `user_id_hash` is a stable, irreversible hash (SHA256 with salt)
- Only aggregated partner names (email) are included for filtering

## Limits & Constraints

- **Date Range**: Max 31 days (configurable via `MAX_EXPORT_DAYS`)
- **XLSX**: Max 10,000 rows (configurable via `XLSX_MAX_ROWS`)
- **CSV**: No hard limit (streaming)
- **Vercel**: Serverless function timeout (10s free, 60s pro) - exports run async

## Job Lifecycle

1. **PENDING**: Job created, file generation in progress
2. **READY**: File uploaded to storage, ready to download
3. **FAILED**: Error occurred (check `error_message`)

Jobs run asynchronously - the API returns immediately with job ID. Poll `/api/admin/exports/jobs/:id` or use the UI auto-refresh.

## Storage Paths

Files are stored at:
```
exports/events_raw/YYYY-MM/{jobId}.{csv|xlsx}
```

Example:
```
exports/events_raw/2026-01/abc-123-def-456.csv
```

## Verification

Run the verification script:

```bash
npx tsx scripts/verify-exports.ts
```

This checks:
- ExportJob table exists
- Environment variables are set
- Recent jobs are visible

## Troubleshooting

### "Bucket 'exports' not found"

Create the bucket in Supabase Dashboard → Storage (see Setup #2).

### "XLSX export too large"

Narrow the date range or use CSV format. Adjust `XLSX_MAX_ROWS` if needed.

### Job stuck in PENDING

Check Vercel function logs for errors. Jobs may fail silently if async error handling fails.

### "ExportJob table does not exist"

Run migration: `APPLY_EXPORT_JOB_MIGRATION.sql`

### Export generation timeout

Large exports may exceed Vercel function timeout. Consider:
- Narrowing date range
- Filtering by partner
- Using CSV instead of XLSX

## Security

- **Admin-only**: All endpoints require `is_admin=true` or admin JWT cookie
- **No PII**: Raw user emails/names never exported
- **Signed URLs**: Download URLs expire after 1 hour
- **Private Storage**: Bucket must be private (not public)

## Performance

- **Chunked Queries**: Events are queried in batches of 2,000
- **Streaming CSV**: Large CSV files are streamed (memory-safe)
- **In-Memory XLSX**: XLSX files are generated in memory (limited to 10k rows)
- **Async Processing**: File generation happens after API response

## Example Usage

### Via Admin UI

1. Go to `/admin/reports`
2. Click "Exports" tab
3. Select date range, partner, event types, format
4. Click "Create Raw Export"
5. Wait for job to complete (auto-refresh)
6. Click "Download" when ready

### Via API (cURL)

```bash
# Create export
curl -X POST https://your-domain.com/api/admin/exports/events \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=..." \
  -d '{
    "format": "csv",
    "from": "2026-01-01",
    "to": "2026-01-31",
    "types": ["PAGE_VIEW", "QR_REDEEMED"]
  }'

# Check job status
curl https://your-domain.com/api/admin/exports/jobs/{jobId} \
  -H "Cookie: admin_session=..."
```
