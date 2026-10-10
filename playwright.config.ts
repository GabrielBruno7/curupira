import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Loads .env, if present (Playwright does not do it on its own).
if (existsSync('.env')) process.loadEnvFile('.env');

if (!process.env.APP_URL) {
  throw new Error('Set APP_URL (in .env or in the CI variable) to the address of the app under test.');
}

const ci = !!process.env.CI;

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
    baseURL: process.env.APP_URL,
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
