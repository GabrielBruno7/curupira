import { test, expect } from '@playwright/test';

const portalUrl = process.env.MULTIPORTAL_URL;

if (!portalUrl) {
  throw new Error('Set MULTIPORTAL_URL (see .env.example).');
}

test('logging in with the wrong password shows the error', async ({ page }) => {
  await test.step('open the login screen', async () => {
    await page.goto(`${portalUrl}/login`);
  });

  await test.step('log in with a wrong password', async () => {
    await page.getByLabel('E-mail').fill(`e2e.${Date.now()}@teste.com`);
    await page.getByLabel('Senha', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Entrar' }).click();
  });

  await test.step('the error message shows up', async () => {
    await expect(page.getByText(/senha incorretos/)).toBeVisible();
  });
});
