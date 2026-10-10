import { test, expect } from '@playwright/test';
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';

const walletApi = process.env.WALLET_API_URL;
const walletDb = process.env.WALLET_DB_URL;

if (!walletApi || !walletDb) {
  throw new Error('Set WALLET_API_URL and WALLET_DB_URL (see .env.example).');
}

function randomCpf(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));

  for (const length of [9, 10]) {
    const sum = digits.reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    digits.push(rest === 10 ? 0 : rest);
  }

  return digits.join('');
}

function randomCellphone(): string {
  return '319' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
}

let db: Connection;

test.beforeAll(async () => {
  db = await mysql.createConnection(walletDb);
});

test.afterAll(async () => {
  await db.end();
});

test('simplified registration up to the additional information', async ({ request }) => {
  const runId = Date.now();

  const user = {
    cpf: randomCpf(),
    name: 'Teste Automatizado Cadastro',
    email: `e2e.${runId}@teste.com`,
    cellphone: randomCellphone(),
    password: 'E2e@12345',
    birthdate: '1990-01-01',
    deviceId: `e2e-device-${runId}`,
    pushToken: `e2e:push-token-${runId}`,
  };

  await test.step('verify the CPF is free to register', async () => {
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

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT codigo FROM celular WHERE numero = ?',
      [user.cellphone],
    );

    const confirmed = await request.post(`${walletApi}/usuario/sms/confirmar`, {
      data: {
        celular: user.cellphone,
        codigo: rows[0].codigo,
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

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT codigo FROM confirmacao_email WHERE email = ?',
      [user.email],
    );

    const confirmed = await request.post(`${walletApi}/cadastro/usuario/email/codigo/confirmar`, {
      data: {
        email: user.email,
        codigo: rows[0].codigo,
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

    expect((await response.json()).id_usuario).toBeTruthy();
  });

  const accessToken = await test.step('log in on a new device', async () => {
    const response = await request.post(`${walletApi}/v3/login`, {
      data: {
        usuario: user.cpf,
        senha: user.password,
        identificador: user.deviceId,
        token: user.pushToken,
      },
    });

    await expect(response).toBeOK();

    expect(response.status()).toBe(200);

    return (await response.json()).access_token;
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
        id_estado: 1,
        id_cidade: 1,
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
