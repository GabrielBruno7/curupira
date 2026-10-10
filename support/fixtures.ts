import { test as base, expect } from '@playwright/test';
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import { env } from './env';

type WalletDb = {
  smsCode(cellphone: string): Promise<string>;
  emailCode(email: string): Promise<string>;
  rows(sql: string, params: unknown[]): Promise<RowDataPacket[]>;
};

async function readCode(db: Connection, sql: string, key: string): Promise<string> {
  const [rows] = await db.query<RowDataPacket[]>(sql, [key]);

  expect(rows, `verification code for ${key}`).toHaveLength(1);

  return String(rows[0].codigo);
}

export const test = base.extend<object, { walletDb: WalletDb }>({
  walletDb: [
    async ({}, use) => {
      const db = await mysql.createConnection({
        uri: env('WALLET_DB_URL'),
        decimalNumbers: true,
        dateStrings: true,
      });

      await use({
        smsCode: (cellphone) => readCode(db, 'SELECT codigo FROM celular WHERE numero = ?', cellphone),
        emailCode: (email) => readCode(db, 'SELECT codigo FROM confirmacao_email WHERE email = ?', email),
        rows: async (sql, params) => (await db.query<RowDataPacket[]>(sql, params))[0],
      });

      await db.end();
    },
    { scope: 'worker' },
  ],
});

export { expect };
