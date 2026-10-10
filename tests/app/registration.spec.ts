import { test, expect } from '../../support/fixtures';
import { env } from '../../support/env';
import { newUser } from '../../support/data';

type Token = {
  access_token: string;
  token_type: string;
};

test('simplified registration up to the additional information', { tag: '@api' }, async ({ request, walletDb }) => {
  const walletApi = env('WALLET_API_URL');
  const user = newUser();

  await test.step('the CPF has no pre-registration (simplified flow)', async () => {
    const response = await request.get(`${walletApi}/cadastro/usuario/verificar`, {
      params: {
        cpf: user.cpf,
      },
    });

    await expect(response).toBeOK();

    expect(await response.json()).toEqual({
      fluxo_pro_soluto: false,
    });
  });

  await test.step('confirm the cellphone with the SMS code', async () => {
    const sent = await request.post(`${walletApi}/usuario/sms/enviar`, {
      data: {
        celular: user.cellphone,
      },
    });

    await expect(sent).toBeOK();

    const confirmed = await request.post(`${walletApi}/usuario/sms/confirmar`, {
      data: {
        celular: user.cellphone,
        codigo: await walletDb.smsCode(user.cellphone),
      },
    });

    await expect(confirmed).toBeOK();
  });

  await test.step('confirm the e-mail with the e-mail code', async () => {
    const sent = await request.post(`${walletApi}/usuario/email/enviar`, {
      data: {
        email: user.email,
        nome: user.name,
      },
    });

    await expect(sent).toBeOK();

    const confirmed = await request.post(`${walletApi}/cadastro/usuario/email/codigo/confirmar`, {
      data: {
        email: user.email,
        codigo: await walletDb.emailCode(user.email),
      },
    });

    await expect(confirmed).toBeOK();
  });

  await test.step('register the user', async () => {
    const response = await request.post(`${walletApi}/cadastro/usuario/registrar`, {
      data: {
        cpf: user.cpf,
        nome: user.name,
        email: user.email,
        celular: user.cellphone,
        senha: user.password,
        data_nascimento: user.birthdate,
      },
    });

    await expect(response).toBeOK();

    expect(await response.json()).toMatchObject({
      id_usuario: expect.stringMatching(/\S+/),
    });
  });

  const accessToken = await test.step('log in on the first device', async () => {
    const response = await request.post(`${walletApi}/v3/login`, {
      data: {
        usuario: user.cpf,
        senha: user.password,
        identificador: user.deviceId,
        token: user.pushToken,
      },
    });

    expect(response.status(), await response.text()).toBe(200);

    const body = (await response.json()) as Token;

    expect(body).toMatchObject({
      token_type: 'Bearer',
      access_token: expect.stringMatching(/\S+/),
    });

    return body.access_token;
  });

  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  await test.step('the app asks for the additional information', async () => {
    const response = await request.get(`${walletApi}/usuario`, { headers });

    await expect(response).toBeOK();

    expect(await response.json()).toMatchObject({
      completar_cadastro: true,
    });
  });

  await test.step('send the additional information', async () => {
    const response = await request.post(`${walletApi}/cadastro/usuario/informacoes-adicionais`, {
      headers,
      data: {
        nome_mae: 'Maria Teste Automatizado',
        estado_civil: 'solteiro',
        cep: '12115240',
        logradouro: 'Rua Teste Automatizado',
        numero: 100,
        bairro: 'Centro',
        id_estado: 26,
        id_cidade: 5312,
      },
    });

    await expect(response).toBeOK();
  });

  await test.step('the registration is complete', async () => {
    const response = await request.get(`${walletApi}/usuario`, { headers });

    await expect(response).toBeOK();

    expect(await response.json()).toMatchObject({
      completar_cadastro: false,
    });
  });
});

test('registration without confirming the cellphone is rejected', { tag: '@api' }, async ({ request }) => {
  const user = newUser();

  const response = await request.post(`${env('WALLET_API_URL')}/cadastro/usuario/registrar`, {
    data: {
      cpf: user.cpf,
      nome: user.name,
      email: user.email,
      celular: user.cellphone,
      senha: user.password,
      data_nascimento: user.birthdate,
    },
  });

  expect(response.status()).toBe(400);

  expect(await response.json()).toMatchObject({
    code: 4977,
    message: 'O código de verificação do SMS ainda não foi confirmado',
  });
});
