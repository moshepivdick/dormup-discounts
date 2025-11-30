# DormUp Discounts – Production-Ready MVP

DormUp Discounts is the student-facing perks directory for Rimini & Bologna with a full operational backend for partners and admins. It now runs on Supabase PostgreSQL, is deploy-ready on Vercel, includes mobile-first UX, real QR-code scanning, and analytics dashboards.

## Tech Stack

- Next.js (Pages Router) + TypeScript
- Prisma ORM + Supabase PostgreSQL (DATABASE_URL + DIRECT_URL)
- Tailwind CSS + custom responsive layout + safe-area support
- `@zxing/browser` for on-device QR scanning with vibration feedback
- `react-chartjs-2` for real-time dashboards
- JWT auth (separate secrets for partners and admins) + secure HTTP-only cookies
- Centralized API helpers (rate limiting, validation via `zod`, unified responses)

---

## 1. Environment & Installation

```bash
npm install
```

Create `.env` (and replicate on Vercel):

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
PARTNER_JWT_SECRET="long-random-string"
ADMIN_JWT_SECRET="another-long-random-string"
```

> **Tip:** Supabase provides both pooled (`pgbouncer`) and direct connection strings. Use the pooled string for `DATABASE_URL` and the direct string for `DIRECT_URL` so Prisma can run migrations and heavy writes without hitting limits.

Run the PostgreSQL migration (generated via `prisma migrate diff` for Supabase) and regenerate the Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

Seed demo data (venues + partner + admin):

```bash
npm run prisma:seed
```

Start local dev:

```bash
npm run dev
```

- Student flow: `http://localhost:3000`
- Partner login: `http://localhost:3000/partner/login`
- Partner console: `http://localhost:3000/partner`
- Partner scanner: `http://localhost:3000/partner/scan`
- Admin login: `http://localhost:3000/admin/login`
- Admin dashboard: `http://localhost:3000/admin/dashboard`

Demo logins (from seed):

```
Partner → demo@partner.com / password123
Admin   → admin@dormup.it / admin123
```

---

## 2. Supabase Setup

1. Create a Supabase project.
2. Retrieve the `DATABASE_URL` (pooled) & `DIRECT_URL` (non-pooled) strings from Project Settings → Database.
3. Update `.env` locally and the Vercel project settings.
4. Run:

   ```bash
   npx prisma migrate deploy
   npm run prisma:seed
   ```

5. Confirm tables exist inside Supabase (Venue, DiscountUse, Partner, Admin, VenueView).

All Prisma queries now target Supabase; SQLite has been fully removed.

---

## 3. Vercel Deployment

1. Push the repo to GitHub/GitLab.
2. Import into Vercel (framework auto-detected via `vercel.json`).
3. Set environment variables (`DATABASE_URL`, `DIRECT_URL`, `PARTNER_JWT_SECRET`, `ADMIN_JWT_SECRET`).
4. Configure Supabase IP allowlists if needed.
5. Build command: `npm run build` (default).
6. After deployment, run the seed script via `vercel env pull` + `npx prisma db seed` on your machine or use Supabase SQL editor.

All API routes are serverless-friendly and stateless (rate limiting uses an LRU cache that survives warm invocations).

---

## 4. Feature Overview

### Student pages
- `/` – revamped DormUp-branded landing page with city + category filters, new hero, and bottom mobile nav.
- `/venues/[id]` – richer venue layout (map placeholder, hero, CTA, view tracking, full-screen QR modal).
- `/discount/[slug]` – QR landing page for codes (used inside the QR itself).

### Partner flow
- `/partner/login` – JWT auth, rate-limited.
- `/partner` – mobile-friendly console with large inputs, logout, quick link to scanner.
- `/partner/scan` – ZXing-based scanner with camera permission prompt, manual fallback, vibration on success, success modal + auto redirect, safe-area padding.
- `/api/discounts/generate` & `/api/discounts/confirm` – validated, rate-limited, JWT-protected.

### Admin flow
- `/admin/login` – separate JWT + cookie.
- `/admin/dashboard` – overview stats, per-venue bars, daily usage line chart, conversion rate.
- `/admin/venues` – create and view partner venues.
- `/admin/partners` – map partners to venues, create new logins.
- `/admin/discount-uses` – recent redemption log.
- `/api/admin/stats/*`, `/api/admin/venues/*`, `/api/admin/partners/*` – REST APIs with validation + auth.

### Analytics
- `/api/analytics/view` records each venue detail view (city + user agent) to power conversion metrics.
- `lib/stats.ts` consolidates overview, per-venue, and daily stats for dashboards + public APIs.

---

## 5. Security Hardening

- Dedicated JWT secrets for partner and admin cookies (`partner_session`, `admin_session`).
- All POST auth endpoints rate-limited (`lib/rate-limit.ts`).
- Discount confirmation endpoint also rate-limited + venue-scoped.
- All API routes validated with `zod` schemas and centralized helpers (`lib/api.ts`).
- SSR guards (`lib/guards.ts`) protect every private page.
- Supabase + Prisma use parameterized queries; no raw SQL.

---

## 6. Project Structure

```
components/
  admin/…        // Admin layout, cards
  charts/…       // Chart.js wrapper
  layout/…       // Site layout
  navigation/…   // Mobile nav
lib/
  api.ts         // response + method helpers
  auth.ts        // JWT helpers for partner/admin
  env.ts         // env-safe getters
  guards.ts      // SSR protection
  prisma.ts      // Prisma client
  rate-limit.ts  // in-memory limiter
  stats.ts       // dashboard aggregations
  validators.ts  // zod schemas
pages/
  partner/…      // login + console + scan
  admin/…        // login + dashboard + CRUD
  discount/[slug].tsx
  api/…          // clean, validated routes
prisma/
  schema.prisma  // Supabase schema
  migrations/20251120140000_supabase_init/migration.sql
  seed.ts        // venues + partner + admin
```

---

## 7. API Reference

**Public**
- `GET /api/venues`
- `GET /api/venues/[id]`
- `POST /api/discounts/generate`
- `POST /api/analytics/view`

**Partner**
- `POST /api/partner/login`
- `POST /api/partner/logout`
- `POST /api/discounts/confirm`

**Admin**
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET/POST /api/admin/venues`
- `PUT/DELETE /api/admin/venues/[id]`
- `GET/POST /api/admin/partners`
- `PUT/DELETE /api/admin/partners/[id]`
- `GET /api/admin/stats/overview`
- `GET /api/admin/stats/by-venue`
- `GET /api/admin/stats/by-day`

---

## 8. Real-World Workflow – “How a cafe uses QR discounts”

1. Student browses `/` on mobile, filters for Rimini cafés, opens a venue page.
2. Visiting `/venues/[id]` triggers a view event (for conversion stats).
3. Student taps “Get discount”, receives a large code + QR + optional full-screen view. The QR resolves to `/discount/[slug]` so the partner can scan either the QR or the slug directly.
4. At the counter, staff opens `/partner/scan` (or `/partner` + manual entry). The ZXing scanner reads the QR, vibrates on success, shows a modal, and redirects to `/partner` so they’re ready for the next student.
5. The admin team monitors `/admin/dashboard` for total views, code generations, confirmations, and per-venue performance. They can add new venues or partner accounts without touching the database manually.

---

## 9. Running Checklist (Local → Prod)

1. `npm install`
2. Configure `.env` with Supabase credentials + JWT secrets.
3. `npx prisma migrate deploy`
4. `npm run prisma:seed`
5. `npm run dev`
6. Deploy to Vercel and repeat env + migrate steps there.

Enjoy the DormUp Discounts platform! Let me know if you’d like additional automation, reporting, or marketing integrations.

