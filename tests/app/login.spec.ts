import { test, expect } from '../../support/fixtures';
import { env } from '../../support/env';

type Token = {
  access_token: string;
  token_type: string;
};

const pushToken = 'e2e:push-token';

test('login with the right credentials returns a working token', { tag: '@api' }, async ({ request }) => {
  const walletApi = env('WALLET_API_URL');

  const response = await request.post(`${walletApi}/v3/login`, {
    data: {
      usuario: env('WALLET_USERNAME'),
      senha: env('WALLET_PASSWORD'),
      identificador: env('WALLET_DEVICE_ID'),
      token: pushToken,
    },
  });

  expect(response.status(), await response.text()).toBe(200);

  const body = (await response.json()) as Token;

  expect(body).toMatchObject({
    token_type: 'Bearer',
    access_token: expect.stringMatching(/\S+/),
  });

  const profile = await request.get(`${walletApi}/usuario`, {
    headers: {
      Authorization: `Bearer ${body.access_token}`,
    },
  });

  await expect(profile).toBeOK();
});

test('login with the wrong password is rejected', { tag: '@api' }, async ({ request }) => {
  const response = await request.post(`${env('WALLET_API_URL')}/v3/login`, {
    data: {
      usuario: env('WALLET_USERNAME'),
      senha: 'wrong-password',
      identificador: env('WALLET_DEVICE_ID'),
      token: pushToken,
    },
  });

  expect(response.status()).toBe(400);

  expect(await response.json()).toMatchObject({
    code: 4104,
    message: 'Usuário ou senha incorretos',
  });
});
