# Browserless.io Setup for PDF Generation

## Environment Variable

Add the following environment variable to Vercel:

**Variable Name:** `BROWSERLESS_API_TOKEN`  
**Value:** `2Tm1T4DR4BRWAZR420a40fffe27e719a916080832fccd12c5`

## How to Add on Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter:
   - **Key:** `BROWSERLESS_API_TOKEN`
   - **Value:** `2Tm1T4DR4BRWAZR420a40fffe27e719a916080832fccd12c5`
   - **Environment:** Select all (Production, Preview, Development)
5. Click **Save**
6. Redeploy your application

## How It Works

The code now uses Browserless.io API instead of Playwright:

1. **PDF Generation:** Calls `https://chrome.browserless.io/pdf?token=TOKEN`
2. **PNG Generation:** Calls `https://chrome.browserless.io/screenshot?token=TOKEN`
3. Both endpoints receive the print URL and generate the files
4. Files are uploaded to Supabase Storage
5. Snapshot status is updated to READY

## Benefits

- ✅ Works on Vercel serverless
- ✅ No browser installation needed
- ✅ Fast and reliable
- ✅ No size limits

## Testing

After adding the environment variable and redeploying:
1. Go to admin panel → Reports → Snapshots
2. Click "Create Snapshot"
3. The snapshot should generate successfully
