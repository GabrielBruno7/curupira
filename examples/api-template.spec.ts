import { test, expect } from '../support/fixtures';
import { env } from '../support/env';
import { newUser } from '../support/data';

test('describe what the user can do', { tag: '@api' }, async ({ request }) => {
  const walletApi = env('WALLET_API_URL');
  const user = newUser();

  await test.step('first thing the user does', async () => {
    const response = await request.post(`${walletApi}/some/endpoint`, {
      data: {
        cpf: user.cpf,
        nome: user.name,
      },
    });

    await expect(response).toBeOK();

    expect(await response.json()).toMatchObject({
      field_the_app_reads: 'expected value',
    });
  });
});
