import { test, expect } from '@playwright/test';

const walletApi = process.env.WALLET_API_URL;
const username = process.env.WALLET_USERNAME;
const password = process.env.WALLET_PASSWORD;
const deviceId = process.env.WALLET_DEVICE_ID;

if (!walletApi || !username || !password || !deviceId) {
  throw new Error('Set WALLET_API_URL, WALLET_USERNAME, WALLET_PASSWORD and WALLET_DEVICE_ID (see .env.example).');
}

const pushToken = 'e2e:push-token';

test('login with the right credentials returns a token', async ({ request }) => {
  const response = await request.post(`${walletApi}/v3/login`, {
    data: {
      usuario: username,
      senha: password,
      identificador: deviceId,
      token: pushToken,
    },
  });

  expect(response.status()).toBe(200);

  expect(await response.json()).toMatchObject({
    token_type: 'Bearer',
    access_token: expect.any(String),
  });
});

test('login with the wrong password is rejected', async ({ request }) => {
  const response = await request.post(`${walletApi}/v3/login`, {
    data: {
      usuario: username,
      senha: 'wrong-password',
      identificador: deviceId,
      token: pushToken,
    },
  });

  expect(response.status()).toBe(400);

  expect(await response.json()).toMatchObject({
    code: 4104,
    message: 'Usuário ou senha incorretos',
  });
});
