import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');

const ci = !!process.env.CI;

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  retries: ci ? 1 : 0,
  workers: ci ? 2 : undefined,
  forbidOnly: ci,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ...(ci ? [['github'] as const] : []),
  ],
  use: {
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      grep: /@api/,
      use: {
        userAgent: 'curupira-e2e',
      },
    },
    {
      name: 'web',
      grepInvert: /@api/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
