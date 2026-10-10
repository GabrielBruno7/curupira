import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('excluir um hábito e desfazer', async ({ app, screen }) => {
  // preparo: conta nova com o hábito "Abrir a janela"
  await app.open('/#entrar');
  await screen.getByRole('tab', 'Criar conta').tap();
  await screen.getByLabel('Nome').fill('Ana Teste');
  await screen.getByLabel('E-mail').fill(`e2e+${Date.now()}@teste.com`);
  await screen.getByLabel('Senha').fill('senha-de-teste');
  await screen.getByLabel('Confirmar senha').fill('senha-de-teste');
  await screen.getByRole('button', 'Criar conta').tap();
  await screen.getByRole('button', 'Pular').tap();
  await screen.getByRole('button', 'Abrir a janela').tap();
  await screen.getByRole('button', 'Começar').tap();

  // ir para Hábitos
  await screen.getByRole('navigation', 'Seções de hábitos').getByRole('link', 'Hábitos').tap();

  // abrir as ações do hábito e excluir
  await screen.getByRole('button', 'Ações de Abrir a janela').tap();
  await screen.getByRole('button', 'Excluir').tap();

  // conferir: sumiu e apareceu "Desfazer"
  // (não use getByText('Abrir a janela'): com a lista vazia ele volta como sugestão)
  await expect(screen.getByRole('button', 'Ações de Abrir a janela')).toBeHidden();
  await expect(screen.getByRole('status')).toContainText('excluído');
  await screen.getByRole('button', 'Desfazer').tap();

  // conferir: voltou
  await expect(screen.getByRole('button', 'Ações de Abrir a janela')).toBeVisible();
});
