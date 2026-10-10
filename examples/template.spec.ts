// TEMPLATE. This file does not run: copy it to tests/<product>/<name>.spec.ts and adapt it.
// The folder is the product the user sees (app, multiportal…), never the repo or service.
// Write the steps as comments first and fill each one in afterwards
// (see WRITING-A-TEST.md).
import { test, expect } from '@playwright/test';

// Each service's URL comes from .env (one variable per service).
const portalUrl = process.env.MULTIPORTAL_URL;

test('logging in with the wrong password shows the error', async ({ page }) => {
  // 1. open the login screen
  await page.goto(`${portalUrl}/login`);

  // 2. try to log in with a new user on every run and a wrong password
  await page.getByLabel('E-mail').fill(`e2e+${Date.now()}@teste.com`);
  await page.getByLabel('Senha', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Entrar' }).click();

  // 3. check: the error message shows up
  await expect(page.getByText(/senha incorretos/)).toBeVisible();
});
