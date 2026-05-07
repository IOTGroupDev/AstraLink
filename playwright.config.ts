import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PLAYWRIGHT_PORT || 19006);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;
const noProxyHosts = ['127.0.0.1', 'localhost'];
const existingNoProxy = process.env.NO_PROXY || process.env.no_proxy || '';
const mergedNoProxy = Array.from(
  new Set(
    existingNoProxy
      .split(',')
      .map((host) => host.trim())
      .filter(Boolean)
      .concat(noProxyHosts)
  )
).join(',');

process.env.NO_PROXY = mergedNoProxy;
process.env.no_proxy = mergedNoProxy;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `cd frontend && CI=1 EXPO_NO_INTERACTIVE=1 NO_PROXY=${mergedNoProxy} no_proxy=${mergedNoProxy} npx expo start --web --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
