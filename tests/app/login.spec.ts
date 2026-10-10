import { test, expect } from '@playwright/test';

// App login, straight against the wallet API: the same endpoint the app calls.
// The user comes from .env (locally, a user from the wallet fixtures).
const walletApi = process.env.WALLET_API_URL;
const username = process.env.WALLET_USERNAME;
const password = process.env.WALLET_PASSWORD;
const deviceId = process.env.WALLET_DEVICE_ID;

if (!walletApi || !username || !password || !deviceId) {
  throw new Error('Set WALLET_API_URL, WALLET_USERNAME, WALLET_PASSWORD and WALLET_DEVICE_ID (see .env.example).');
}

// Push notification token, sent by the app on every login.
const pushToken = 'e2e:push-token';

test('login with the right credentials returns a token', async ({ request }) => {
  // 1. log in with the test user, on a device that already belongs to them
  //    (an unknown device gets no token: the wallet asks for a PIN and answers 202)
  const response = await request.post(`${walletApi}/v3/login`, {
    data: { usuario: username, senha: password, identificador: deviceId, token: pushToken },
  });

  // 2. check: logged in and got a token
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.token_type).toBe('Bearer');
  expect(body.access_token).toBeTruthy();
});

test('login with the wrong password is rejected', async ({ request }) => {
  // 1. try to log in with the wrong password
  const response = await request.post(`${walletApi}/v3/login`, {
    data: { usuario: username, senha: 'wrong-password', identificador: deviceId, token: pushToken },
  });

  // 2. check: rejected with the message the app shows
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({
    code: 4104,
    message: 'Usuário ou senha incorretos',
  });
});
