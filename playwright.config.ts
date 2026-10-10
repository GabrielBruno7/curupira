import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Lê o .env, se existir (o Playwright não faz isso sozinho).
if (existsSync('.env')) process.loadEnvFile('.env');

if (!process.env.APP_URL) {
  throw new Error('Defina APP_URL (no .env ou na variável do CI) com o endereço do app a testar.');
}

const ci = !!process.env.CI;

export default defineConfig({
  testDir: 'tests',
  // 1 retry no CI: teste que só passa no retry aparece como "flaky", não como verde.
  retries: ci ? 1 : 0,
  // Um test.only esquecido não pode passar no CI.
  forbidOnly: ci,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.APP_URL,
    // Idioma e fuso fixos: o container vem em inglês/UTC, e muitos apps seguem o navegador.
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // Do que falhou, guarda trace, print e vídeo (em test-results/).
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
