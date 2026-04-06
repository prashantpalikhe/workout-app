import { defineConfig, devices } from '@playwright/test'

const TEST_DB_URL = 'postgresql://workout:workout_dev@localhost:5432/workout_app_test'
const TEST_API_PORT = 3002
const TEST_WEB_PORT = 3010

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: `http://localhost:${TEST_WEB_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] }
    }
  ],

  webServer: [
    {
      // API on a separate port with test database — won't conflict with dev
      command: `PORT=${TEST_API_PORT} pnpm dev`,
      cwd: '../../apps/api',
      port: TEST_API_PORT,
      env: { DATABASE_URL: TEST_DB_URL, PORT: String(TEST_API_PORT) },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    },
    {
      // Web on a separate port, proxying to the test API
      command: `pnpm dev --port ${TEST_WEB_PORT}`,
      cwd: '.',
      port: TEST_WEB_PORT,
      env: { NUXT_API_PROXY_URL: `http://localhost:${TEST_API_PORT}/api` },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    }
  ]
})
