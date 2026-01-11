// Playwright config - optional, only used if @playwright/test is installed
// This file is optional and won't break the build if Playwright isn't installed
// For now, we'll use a simple config that works without @playwright/test
const defineConfig = (config: any) => config;
const devices: any = {};

/**
 * Playwright configuration for PDF/PNG generation
 * Optimized for serverless/Vercel environments
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for serverless compatibility
  reporter: 'html',
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
