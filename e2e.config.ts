import { existsSync } from 'node:fs';
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

// Lê o .env, se existir (o e2e não faz isso sozinho).
if (existsSync('.env')) process.loadEnvFile('.env');

export default {
  targets: [
    {
      name: 'web',
      // Idioma e fuso fixos: a Trilha segue os do navegador, e o do container vem em inglês/UTC.
      engine: web({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' }),
      app: { url: process.env.TRILHA_URL },
    },
  ],
} satisfies E2EConfig;
