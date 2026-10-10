import { test as base, expect } from '@playwright/test';
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import { env } from './env';

type WalletDb = {
  smsCode(cellphone: string): Promise<string>;
  emailCode(email: string): Promise<string>;
};

async function readCode(db: Connection, sql: string, key: string): Promise<string> {
  const [rows] = await db.query<RowDataPacket[]>(sql, [key]);

  expect(rows, `verification code for ${key}`).toHaveLength(1);

  return String(rows[0].codigo);
}

export const test = base.extend<object, { walletDb: WalletDb }>({
  walletDb: [
    async ({}, use) => {
      const db = await mysql.createConnection(env('WALLET_DB_URL'));

      await use({
        smsCode: (cellphone) => readCode(db, 'SELECT codigo FROM celular WHERE numero = ?', cellphone),
        emailCode: (email) => readCode(db, 'SELECT codigo FROM confirmacao_email WHERE email = ?', email),
      });

      await db.end();
    },
    { scope: 'worker' },
  ],
});

export { expect };
