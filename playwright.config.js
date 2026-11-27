import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:5175', channel: 'chrome', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1024 } } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: 'chrome' },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    env: {
      VITE_API_URL: '/api',
      VITE_FIREBASE_API_KEY: 'synthetic-test-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'test.invalid',
      VITE_FIREBASE_PROJECT_ID: 'test-project',
      VITE_SOCKET_URL: '',
    },
  },
})
