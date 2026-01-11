# Playwright Setup for Vercel

## Problem
Playwright requires Chromium browser to be installed, which is not available by default on Vercel serverless functions.

## Solution

### Option 1: Install Chromium in Build Command (Current Setup)

The `vercel.json` and `package.json` have been updated to install Chromium during build:

```json
{
  "buildCommand": "prisma generate && npx playwright install chromium || true && next build"
}
```

The `|| true` ensures the build continues even if Playwright installation fails.

### Option 2: Use @playwright/browser-chromium Package (Recommended for Production)

For more reliable PDF generation on Vercel, consider using the `@playwright/browser-chromium` package:

1. Install the package:
```bash
npm install @playwright/browser-chromium
```

2. Update `pages/api/reports/snapshot.ts` to use it:
```typescript
import { chromium } from '@playwright/browser-chromium';
```

3. This package includes Chromium bundled, so no installation step is needed.

### Option 3: Use External PDF Service

For production, consider using an external PDF generation service:
- Puppeteer on a separate server
- Browserless.io
- PDFShift
- Other headless browser services

## Current Status

The current setup will:
1. Try to install Chromium during build
2. If installation fails, PDF generation will return a 503 error with clear message
3. The snapshot will be marked as FAILED with error message

## Testing

To test PDF generation locally:
```bash
npx playwright install chromium
npm run dev
# Try creating a report snapshot
```

## Troubleshooting

If you see "Executable doesn't exist" error:
1. Check Vercel build logs to see if `npx playwright install chromium` ran
2. Verify the build command in `vercel.json`
3. Consider using Option 2 (@playwright/browser-chromium) for more reliability
