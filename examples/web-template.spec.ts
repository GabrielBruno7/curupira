import { test, expect } from '../support/fixtures';
import { env } from '../support/env';

test('logging in with the wrong password shows the error', async ({ page }) => {
  await test.step('open the login screen', async () => {
    await page.goto(`${env('MULTIPORTAL_URL')}/login`);
  });

  await test.step('log in with a wrong password', async () => {
    await page.getByLabel('E-mail').fill('e2e.wrong-password@emcash.test');
    await page.getByLabel('Senha', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Entrar' }).click();
  });

  await test.step('the error message shows up', async () => {
    await expect(page.getByText(/senha incorretos/)).toBeVisible();
  });
});
