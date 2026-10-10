import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Loads .env, if present (Playwright does not do it on its own).
if (existsSync('.env')) process.loadEnvFile('.env');

const ci = !!process.env.CI;

// No baseURL: a journey can go through several services, so each test
// reads the URL of every service it uses from the environment (<SERVICE>_URL).
export default defineConfig({
  testDir: 'tests',
  // 1 retry on CI: a test that only passes on retry shows up as "flaky", not green.
  retries: ci ? 1 : 0,
  // A forgotten test.only must not pass on CI.
  forbidOnly: ci,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    // Fixed locale and timezone: the container defaults to English/UTC, and many apps follow the browser.
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // For failed tests, keeps trace, screenshot and video (in test-results/).
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
