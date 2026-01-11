# Monthly Reporting System - Implementation Notes

## Overview

This document describes the monthly reporting system implementation for DormUp Discounts. The system provides:

1. **Admin Monthly Report**: Global metrics across all partners with per-partner breakdown
2. **Partner Monthly Report**: Business-focused metrics for individual partners
3. **Raw Data Export**: CSV/JSON exports with strict access control
4. **Report Snapshots**: One-click PDF/PNG generation and storage

## Database Schema

### Aggregation Tables

#### `DailyPartnerMetrics`
- Stores daily metrics per venue/partner
- Fields: `venue_id`, `partner_id`, `period_date`, `page_views`, `qr_generated`, `qr_redeemed`, `unique_users`, `conversion_rate`, `repeat_users`
- Unique constraint: `(venue_id, period_date)`
- Indexes: `(partner_id, period_date)`, `(venue_id, period_date)`, `(period_date)`

#### `MonthlyPartnerMetrics`
- Stores monthly metrics per venue/partner
- Fields: `venue_id`, `partner_id`, `period_start`, `period_end`, `page_views`, `qr_generated`, `qr_redeemed`, `unique_users`, `conversion_rate`, `repeat_users`
- Unique constraint: `(venue_id, period_start)`
- Indexes: `(partner_id, period_start)`, `(venue_id, period_start)`, `(period_start)`

#### `MonthlyGlobalMetrics`
- Stores global monthly metrics (all partners combined)
- Fields: `period_start`, `period_end`, `total_partners`, `page_views`, `qr_generated`, `qr_redeemed`, `unique_users`, `conversion_rate`
- Unique constraint: `(period_start)`
- Index: `(period_start)`

#### `ReportSnapshot`
- Stores metadata for generated PDF/PNG snapshots
- Fields: `scope` ("admin" | "partner"), `month`, `partner_id`, `venue_id`, `created_by`, `pdf_path`, `png_path`, `metrics_hash`
- Indexes: `(scope, month)`, `(partner_id, month)`, `(created_at)`

### Additional Indexes

Added to existing tables for better query performance:
- `discount_uses`: `(created_at)`, `(status, confirmed_at)`
- `venue_views`: `(venue_id, created_at)`

## API Endpoints

### GET `/api/reports/admin/monthly?month=YYYY-MM`
- **Auth**: Admin only
- **Returns**: Global metrics + per-partner table + anomalies
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "global": { ... },
      "partners": [ ... ],
      "anomalies": [ ... ]
    }
  }
  ```

### GET `/api/reports/partner/monthly?month=YYYY-MM&partnerId=...`
- **Auth**: Admin (can request any partner) or Partner (only their own)
- **Returns**: Partner metrics + insights
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "metrics": { ... },
      "insights": [ ... ]
    }
  }
  ```

### GET `/api/reports/export?type=csv|json&scope=admin|partner&month=YYYY-MM&partnerId=...`
- **Auth**: Admin (can export global or any partner) or Partner (only their own)
- **Returns**: CSV file or JSON response with raw event data
- **Events**: `PAGE_VIEW`, `QR_GENERATED`, `QR_REDEEMED`
- **Limit**: 10,000 events per export (paginated exports can be added later)

### POST `/api/reports/snapshot`
- **Auth**: Admin or Partner
- **Body**: `{ month: "YYYY-MM", scope: "admin" | "partner", partnerId?: string }`
- **Returns**: Snapshot metadata with signed URLs
- **Storage**: Supabase Storage bucket `reports`
- **Path Format**: `reports/{scope}/{YYYY-MM}/{venueId or "global"}/{timestamp}-{hash}.pdf`

### GET `/api/reports/snapshots?month=YYYY-MM&scope=admin|partner`
- **Auth**: Admin or Partner (partners see only their own)
- **Returns**: List of snapshots with signed URLs

## Aggregation Functions

Located in `lib/reports.ts`:

- `computeMonthlyPartnerMetrics(venueId, monthStr)`: Computes metrics for a specific venue/partner
- `computeMonthlyGlobalMetrics(monthStr)`: Computes global metrics
- `upsertMonthlyPartnerMetrics(venueId, monthStr)`: Computes and stores partner metrics
- `upsertMonthlyGlobalMetrics(monthStr)`: Computes and stores global metrics
- `backfillMonthlyMetrics(months)`: Backfills metrics for the last N months
- `getMonthlyAdminReport(monthStr)`: Returns admin report with anomalies
- `getMonthlyPartnerReport(venueId, monthStr)`: Returns partner report with insights

### Metrics Computation

Metrics are computed on-demand and cached in aggregation tables:
- **Page Views**: Count of `VenueView` records in period
- **QR Generated**: Count of `DiscountUse` records created in period
- **QR Redeemed**: Count of `DiscountUse` records with `status='confirmed'` and `confirmedAt` in period
- **Unique Users**: Distinct `user_id` from both views and discount uses
- **Conversion Rate**: `(qr_redeemed / qr_generated) * 100`
- **Repeat Users**: Users with >= 2 confirmed discounts in period

## Backfill Process

To backfill historical data:

```typescript
import { backfillMonthlyMetrics } from '@/lib/reports';

// Backfill last 3 months
await backfillMonthlyMetrics(3);
```

Or via API (add endpoint if needed):
```bash
POST /api/reports/backfill
Body: { months: 3 }
```

## Timezone Handling

All date calculations use **Europe/Rome** timezone. Month boundaries are calculated using UTC dates, and PostgreSQL handles timezone conversion when storing `DATE` fields.

## Security & Access Control

### Row-Level Security (RLS)

Partners can only access:
- Their own monthly metrics
- Their own snapshots
- Their own export data

Admins can access:
- All global metrics
- All partner metrics
- All snapshots
- All export data

### Authorization Checks

All endpoints verify:
1. User is authenticated (admin or partner)
2. Partner requests are scoped to their `venueId`
3. Admin requests can specify any `partnerId`

## PDF/PNG Generation

### Implementation

PDF/PNG generation is now fully implemented using Playwright:

1. **Installation**:
   ```bash
   npm install playwright
   npx playwright install chromium
   ```

2. **Print Route** (`/pages/reports/print.tsx`):
   - Server-rendered report view optimized for printing
   - Protected with one-time signed tokens (5-minute TTL)
   - A4 format with print-optimized styling
   - Supports both admin and partner reports

3. **Snapshot Endpoint** (`/api/reports/snapshot`):
   - Generates one-time token for print route access
   - Launches Playwright Chromium (headless)
   - Navigates to print route with token
   - Generates PDF: `page.pdf({ format: 'A4', printBackground: true })`
   - Generates PNG: `page.screenshot({ fullPage: true })` (1200px wide)
   - Uploads both files to Supabase Storage
   - Creates database record with file paths

4. **Security**:
   - One-time tokens expire after 5 minutes
   - Tokens include scope, month, and user constraints
   - Print route validates token and query params match
   - Partners can only generate snapshots for their own venue

### Vercel Compatibility

Playwright works on Vercel with these considerations:

- **Serverless Functions**: Playwright Chromium is bundled (~300MB)
- **Cold Starts**: First request may be slower (~5-10s) due to browser launch
- **Memory**: Ensure Vercel plan has sufficient memory (Pro plan recommended)
- **Timeout**: Vercel Pro allows up to 60s execution time (sufficient for PDF generation)

**Configuration**:
- Playwright automatically detects Vercel environment
- Uses `--no-sandbox` and `--disable-setuid-sandbox` flags for serverless compatibility
- Browser is launched in headless mode

**Fallback Behavior**:
- If Playwright fails (not installed or runtime error), system creates placeholder files
- Database record is still created for tracking
- Error is logged but doesn't break the API

### Environment Variables

Optional (for custom base URL):
- `NEXT_PUBLIC_APP_URL` - Base URL for print route (defaults to Vercel URL or localhost)
- `REPORT_TOKEN_SECRET` - Secret for report tokens (defaults to `ADMIN_JWT_SECRET`)

### Storage Setup

1. **Create Supabase Storage Bucket**:
   - Name: `reports`
   - Public: `false` (use signed URLs)
   - File size limit: 10MB
   - Allowed MIME types: `application/pdf`, `image/png`

2. **Storage Policies** (RLS):
   ```sql
   -- Partners can only read their own files
   CREATE POLICY "Partners can read own reports"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'reports' AND
     (auth.uid()::text = (storage.foldername(name))[3])
   );

   -- Admins can read all reports
   CREATE POLICY "Admins can read all reports"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'reports' AND
     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
   );
   ```

## Troubleshooting

### Mismatched Numbers

If metrics don't match raw data:

1. **Check timezone**: Ensure month boundaries are correct for Europe/Rome
2. **Check aggregation**: Run `upsertMonthlyPartnerMetrics()` manually
3. **Check filters**: Verify `isActive` filters on venues/partners
4. **Check deduplication**: VenueView uses `dedupe_key` for deduplication

### Performance Issues

- **Large exports**: Currently limited to 10,000 events. Add pagination for larger datasets
- **Slow aggregation**: Ensure indexes exist. Run `EXPLAIN ANALYZE` on slow queries
- **Storage limits**: Monitor Supabase Storage usage. Implement cleanup for old snapshots

### Missing Data

- **No metrics for month**: Run backfill for that month
- **Missing snapshots**: Check Supabase Storage bucket exists and has correct policies
- **Export fails**: Check event count (limit: 10,000). Add pagination if needed

### PDF/PNG Generation Issues

- **Playwright not found**: Run `npm install playwright && npx playwright install chromium`
- **Browser launch fails on Vercel**: Ensure you're on Pro plan (sufficient memory/timeout)
- **Timeout errors**: Increase Vercel function timeout or optimize print route rendering
- **Placeholder files generated**: Check Playwright installation and browser availability
- **Token validation fails**: Verify `REPORT_TOKEN_SECRET` or `ADMIN_JWT_SECRET` is set
- **Print route 404**: Check base URL configuration (`NEXT_PUBLIC_APP_URL` or `VERCEL_URL`)

## Future Enhancements

1. **Scheduled Aggregation**: Use Vercel Cron or Supabase Edge Functions to compute metrics daily
2. **Email Reports**: Send monthly reports via email to partners
3. **Advanced Anomalies**: ML-based anomaly detection
4. **Custom Date Ranges**: Support weekly, quarterly, yearly reports
5. **Real-time Updates**: WebSocket updates for live metrics
6. **Export Pagination**: Chunk large exports into multiple files
7. **Report Templates**: Customizable report layouts

## Migration

To apply the database changes:

```bash
# Generate Prisma client
npx prisma generate

# Apply migration (production)
npx prisma migrate deploy

# Or create new migration (development)
npx prisma migrate dev --name add_reporting_tables
```

The migration file is located at:
`prisma/migrations/20250130000000_add_reporting_tables/migration.sql`

## Verification

Run the verification script to test access control:

```bash
npm run verify:reports
```

Or manually test:
1. Admin can access `/api/reports/admin/monthly`
2. Partner cannot access admin report
3. Partner can only export their own data
4. Snapshot creates DB record and file in Storage
