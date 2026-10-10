// MODELO. Este arquivo não roda: copie para tests/<nome>.spec.ts e adapte.
// Escreva os passos como comentários primeiro e preencha cada um depois
// (veja COMO-CRIAR-UM-TESTE.md).
import { test, expect } from '@playwright/test';

test('entrar com senha errada mostra o erro', async ({ page }) => {
  // 1. abrir a tela de login (o endereço é relativo ao APP_URL)
  await page.goto('/login');

  // 2. tentar entrar com um usuário novo a cada execução e uma senha errada
  await page.getByLabel('E-mail').fill(`e2e+${Date.now()}@teste.com`);
  await page.getByLabel('Senha', { exact: true }).fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar' }).click();

  // 3. conferir: a mensagem de erro aparece
  await expect(page.getByText(/senha incorretos/)).toBeVisible();
});
