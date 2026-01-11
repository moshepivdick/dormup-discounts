# PDF Generation Alternatives for Vercel

## Problem
Playwright doesn't work reliably on Vercel serverless functions because:
1. Chromium browser needs to be installed, which is large (~200MB)
2. Serverless functions have size limits
3. Browser installation doesn't persist between builds and runtime
4. `@playwright/browser-chromium` package doesn't work as expected in serverless

## Solutions

### Option 1: External PDF Service (Recommended)
Use a dedicated PDF generation service:

**Browserless.io:**
- API: `https://chrome.browserless.io/pdf?token=YOUR_TOKEN`
- Send HTML content, get PDF back
- Pricing: Free tier available

**PDFShift:**
- API: `https://api.pdfshift.io/v3/convert/pdf`
- Convert HTML/URL to PDF
- Pricing: Pay per conversion

**Implementation:**
```typescript
// In pages/api/reports/snapshot.ts
const pdfResponse = await fetch('https://chrome.browserless.io/pdf?token=YOUR_TOKEN', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: printUrl, // Your report print URL
    options: {
      format: 'A4',
      printBackground: true,
    },
  }),
});
const pdfBuffer = await pdfResponse.arrayBuffer();
```

### Option 2: Separate Server for PDF Generation
Run Playwright on a separate server (not Vercel):

- Deploy a small Node.js server on Railway, Render, or DigitalOcean
- Use Playwright there
- Call it from your Vercel API

### Option 3: Client-Side PDF Generation
Generate PDFs in the browser using libraries like:
- `jsPDF` - Generate PDF from JavaScript
- `html2pdf.js` - Convert HTML to PDF
- `puppeteer` (client-side) - Limited support

### Option 4: Disable PDF Generation (Current)
For now, PDF generation is disabled. Snapshots will be marked as FAILED with a clear error message.

## Recommendation
Use **Browserless.io** or similar service for production. It's:
- Reliable
- Fast
- No server management
- Works with Vercel serverless

## Implementation Steps
1. Sign up for Browserless.io (or similar)
2. Get API token
3. Update `pages/api/reports/snapshot.ts` to use their API
4. Remove Playwright dependency
5. Test PDF generation
