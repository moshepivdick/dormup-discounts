# Monthly Reporting System - Implementation Summary

## ✅ Completed Implementation

A comprehensive monthly reporting system has been implemented for DormUp Discounts with the following features:

### 1. Database Schema & Aggregation Layer ✅

**New Tables:**
- `DailyPartnerMetrics` - Daily metrics per venue/partner
- `MonthlyPartnerMetrics` - Monthly metrics per venue/partner  
- `MonthlyGlobalMetrics` - Global monthly metrics (all partners)
- `ReportSnapshot` - Metadata for PDF/PNG snapshots

**Additional Indexes:**
- Added performance indexes on `discount_uses` and `venue_views` tables

**Migration File:**
- `prisma/migrations/20250130000000_add_reporting_tables/migration.sql`

### 2. Aggregation Functions ✅

**Location:** `lib/reports.ts`

**Key Functions:**
- `computeMonthlyPartnerMetrics()` - Computes metrics for a venue/partner
- `computeMonthlyGlobalMetrics()` - Computes global metrics
- `upsertMonthlyPartnerMetrics()` - Computes and stores partner metrics (cached)
- `upsertMonthlyGlobalMetrics()` - Computes and stores global metrics (cached)
- `backfillMonthlyMetrics()` - Backfills historical data (last N months)
- `getMonthlyAdminReport()` - Returns admin report with anomalies
- `getMonthlyPartnerReport()` - Returns partner report with insights

**Metrics Computed:**
- Page Views (from `VenueView`)
- QR Generated (from `DiscountUse` created)
- QR Redeemed (from `DiscountUse` confirmed)
- Unique Users (distinct user_ids)
- Conversion Rate (redeemed / generated)
- Repeat Users (users with >= 2 redemptions)

### 3. API Routes ✅

**GET `/api/reports/admin/monthly?month=YYYY-MM`**
- Admin-only endpoint
- Returns global metrics + per-partner breakdown + anomalies

**GET `/api/reports/partner/monthly?month=YYYY-MM&partnerId=...`**
- Admin can request any partner
- Partners can only request their own
- Returns partner metrics + business insights

**GET `/api/reports/export?type=csv|json&scope=admin|partner&month=YYYY-MM&partnerId=...`**
- Exports raw event data (PAGE_VIEW, QR_GENERATED, QR_REDEEMED)
- CSV or JSON format
- Strict access control (partners see only their data)
- Limit: 10,000 events per export

**POST `/api/reports/snapshot`**
- Creates PDF/PNG snapshot metadata
- Stores files in Supabase Storage
- Returns signed URLs (1 hour expiry)
- **Note:** Currently creates placeholder files. Install Playwright for actual PDF/PNG generation.

**GET `/api/reports/snapshots?month=YYYY-MM&scope=admin|partner`**
- Lists snapshots with signed URLs
- Partners see only their own snapshots

### 4. Admin UI ✅

**Location:** `pages/admin/reports.tsx`

**Features:**
- Month picker (defaults to current month)
- Four tabs:
  1. **Admin Report** - Global metrics, per-partner table, anomalies
  2. **Partner Report** - Select partner, view their metrics + insights
  3. **Exports** - Download CSV/JSON for admin or selected partner
  4. **Snapshots** - View and download generated snapshots
- "Create Snapshot" button in Admin and Partner tabs
- Real-time data loading with loading states

**Navigation:**
- Added "Reports" link to `AdminLayout` navigation

### 5. Security & Access Control ✅

**Authorization:**
- All endpoints verify admin or partner authentication
- Partners can only access their own data
- Admins can access all data
- Partner requests are automatically scoped to their `venueId`

**Data Isolation:**
- Partner exports only include their venue's events
- Partner snapshots only visible to that partner
- Admin can view/export any partner's data

### 6. Documentation ✅

**Location:** `docs/reports.md`

**Contents:**
- Database schema details
- API endpoint documentation
- Aggregation function descriptions
- Backfill instructions
- Troubleshooting guide
- Security notes
- Future enhancements

### 7. Verification Script ✅

**Location:** `scripts/verify-reports.ts`

**Run:** `npm run verify:reports`

**Checks:**
- Database tables exist
- Indexes are present
- Supabase Storage bucket exists
- Provides next steps for setup

## ⚠️ Pending: PDF/PNG Generation

The snapshot endpoint currently creates placeholder files. To enable actual PDF/PNG generation:

### Installation

```bash
npm install playwright
npx playwright install chromium
```

### Implementation Steps

1. **Create Print Route** (`pages/reports/print.tsx`):
   - Server-rendered report view
   - Protected with auth
   - Optimized for printing (A4 format)

2. **Update Snapshot Endpoint** (`pages/api/reports/snapshot.ts`):
   - Use Playwright to navigate to print route
   - Generate PDF: `await page.pdf({ format: 'A4' })`
   - Generate PNG: `await page.screenshot({ fullPage: true })`
   - Upload to Supabase Storage

3. **Example Code:**
   ```typescript
   import { chromium } from 'playwright';
   
   const browser = await chromium.launch();
   const page = await browser.newPage();
   await page.goto(`http://localhost:3000/reports/print?scope=${scope}&month=${month}`, {
     waitUntil: 'networkidle'
   });
   const pdf = await page.pdf({ format: 'A4' });
   const png = await page.screenshot({ fullPage: true });
   await browser.close();
   ```

## 📋 Setup Instructions

### 1. Apply Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Apply migration
npx prisma migrate deploy
```

### 2. Create Supabase Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create bucket named `reports`
3. Set to **Private** (use signed URLs)
4. Configure RLS policies (see `docs/reports.md`)

### 3. Backfill Historical Data

**Option A: Via API** (create endpoint if needed):
```bash
POST /api/reports/backfill
Body: { months: 3 }
```

**Option B: Direct Function Call:**
```typescript
import { backfillMonthlyMetrics } from '@/lib/reports';
await backfillMonthlyMetrics(3); // Backfill last 3 months
```

### 4. Verify Installation

```bash
npm run verify:reports
```

### 5. Test Endpoints

1. **Admin Report:**
   ```bash
   GET /api/reports/admin/monthly?month=2025-01
   ```

2. **Partner Report:**
   ```bash
   GET /api/reports/partner/monthly?month=2025-01&partnerId=<partner-id>
   ```

3. **Export:**
   ```bash
   GET /api/reports/export?type=csv&scope=admin&month=2025-01
   ```

4. **Create Snapshot:**
   ```bash
   POST /api/reports/snapshot
   Body: { month: "2025-01", scope: "admin" }
   ```

## 🔍 Testing Checklist

- [ ] Admin can access `/admin/reports`
- [ ] Admin can view global metrics
- [ ] Admin can view per-partner metrics
- [ ] Admin can export global data
- [ ] Admin can export any partner's data
- [ ] Partner cannot access admin report
- [ ] Partner can only export their own data
- [ ] Partner can only see their own snapshots
- [ ] Metrics match raw data counts
- [ ] Snapshots create DB records
- [ ] Snapshots upload to Supabase Storage

## 📊 Performance Considerations

- **Aggregation**: Metrics are computed on-demand and cached in aggregation tables
- **Indexes**: All query paths are indexed for fast lookups
- **Export Limits**: 10,000 events per export (add pagination for larger datasets)
- **Timezone**: All calculations use Europe/Rome timezone

## 🚨 Known Limitations

1. **PDF/PNG Generation**: Requires Playwright installation (see above)
2. **Export Pagination**: Large exports (>10K events) need pagination
3. **Scheduled Aggregation**: Currently on-demand. Consider Vercel Cron for daily aggregation
4. **Email Reports**: Not implemented (future enhancement)

## 📝 Files Changed

### New Files
- `lib/reports.ts` - Aggregation functions
- `pages/api/reports/admin/monthly.ts` - Admin report endpoint
- `pages/api/reports/partner/monthly.ts` - Partner report endpoint
- `pages/api/reports/export.ts` - Export endpoint
- `pages/api/reports/snapshot.ts` - Snapshot creation endpoint
- `pages/api/reports/snapshots.ts` - Snapshot listing endpoint
- `pages/admin/reports.tsx` - Admin UI
- `prisma/migrations/20250130000000_add_reporting_tables/migration.sql` - Migration
- `docs/reports.md` - Documentation
- `scripts/verify-reports.ts` - Verification script

### Modified Files
- `prisma/schema.prisma` - Added aggregation tables and relations
- `components/admin/AdminLayout.tsx` - Added Reports navigation link
- `package.json` - Added verify:reports script

## 🎯 Next Steps

1. **Apply Migration**: Run `npx prisma migrate deploy`
2. **Backfill Data**: Run backfill for last 3 months
3. **Test UI**: Navigate to `/admin/reports` and test all tabs
4. **Install Playwright**: For PDF/PNG generation (optional)
5. **Monitor Performance**: Check query performance with real data
6. **Set Up Storage**: Create Supabase Storage bucket and policies

## 💡 Tips

- Metrics are computed on-demand, so first access may be slower
- Use backfill for historical data before going live
- Monitor Supabase Storage usage for snapshots
- Consider scheduled aggregation for better performance
- Add pagination to exports if you expect >10K events per month

---

**Implementation Date:** January 30, 2025  
**Status:** ✅ Complete (except PDF/PNG generation requires Playwright)
