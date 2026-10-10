import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('criar conta', async ({ app, screen }) => {
  // 1. abrir o app
  await app.open('/#entrar'); // direto na tela de login

  // 2. preencher o cadastro
  await screen.getByRole('tab', 'Criar conta').tap();
  await screen.getByLabel('Nome').fill('Ana Teste');
  await screen.getByLabel('E-mail').fill(`e2e+${Date.now()}@teste.com`); // e-mail novo a cada execução
  await screen.getByLabel('Senha').fill('senha-de-teste');
  await screen.getByLabel('Confirmar senha').fill('senha-de-teste');
  await screen.getByRole('button', 'Criar conta').tap();

  // 3. conferir que entrou: conta nova abre o tour "Como funciona"
  await expect(screen.getByRole('dialog')).toBeVisible();
});

test('login com senha errada', async ({ app, screen }) => {
  await app.open('/#entrar'); // direto na tela de login

  // e-mail novo a cada execução: a Trilha bloqueia após 5 erros seguidos no mesmo e-mail
  await screen.getByLabel('E-mail').fill(`e2e+${Date.now()}@teste.com`);
  await screen.getByLabel('Senha').fill('senha-errada');
  await screen.getByRole('button', 'Entrar').tap();

  await expect(screen.getByText(/E-mail ou senha incorretos/)).toBeVisible();
});
