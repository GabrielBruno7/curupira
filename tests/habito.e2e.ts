import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('marcar um hábito', async ({ app, screen }) => {
  // preparo: criar uma conta nova (cada teste tem a sua)
  await app.open('/#entrar'); // direto na tela de login
  await screen.getByRole('tab', 'Criar conta').tap();
  await screen.getByLabel('Nome').fill('Ana Teste');
  await screen.getByLabel('E-mail').fill(`e2e+${Date.now()}@teste.com`);
  await screen.getByLabel('Senha').fill('senha-de-teste');
  await screen.getByLabel('Confirmar senha').fill('senha-de-teste');
  await screen.getByRole('button', 'Criar conta').tap();

  // fechar o tour que abre para conta nova
  await screen.getByRole('button', 'Pular').tap();

  // escolher um hábito sugerido
  await screen.getByRole('button', 'Beber um copo de água').tap();
  await screen.getByRole('button', 'Começar').tap();

  // marcar como feito hoje
  await screen.getByText('Beber um copo de água').tap(); // toca no nome, como o usuário

  // conferir
  await expect(screen.getByRole('checkbox', 'Beber um copo de água')).toBeChecked();
  await expect(screen.getByText('1 feito hoje')).toBeVisible();
});
