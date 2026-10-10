# curupira

Testes end-to-end feitos com o [Playwright](https://playwright.dev).
Eles usam o app como um usuário usaria: abrem o navegador num endereço e clicam.

> **Vai escrever ou alterar um teste?** Siga o passo a passo em [como criar um teste](COMO-CRIAR-UM-TESTE.md) e leia as [boas práticas](BOAS-PRATICAS.md), principalmente a parte de **rate limits**.

## Como funciona

1. `playwright.config.ts` diz **onde** está o app (`APP_URL`, vinda do `.env`).
2. Cada arquivo em `tests/` que termina em `.spec.ts` é um conjunto de testes. Para começar, copie [`exemplos/modelo.spec.ts`](exemplos/modelo.spec.ts).
3. Cada teste faz sempre o mesmo: **abre** o app, **age** (preenche, clica) e **confere** (`expect`).
4. Depois de rodar, o relatório fica em `playwright-report/`, e os prints, vídeos e traces de cada falha em `test-results/`.

## Rodando (só precisa de Docker)

```bash
cp .env.example .env                    # e ajuste o APP_URL
docker compose run --rm --build tests   # roda os testes
```

- O app **não** sobe aqui: ele precisa estar no ar antes (na sua máquina ou num ambiente de teste).
- App na sua máquina? No `APP_URL`, use `host.docker.internal` no lugar de `localhost`.
- `--build` só é necessário na primeira vez ou quando o `package.json` mudar.
  O projeto é montado no container, então editar um teste e rodar de novo já basta.
- Abra `playwright-report/index.html` no navegador para ver o relatório. Para ver o passo a passo de uma falha, use `npx playwright show-trace test-results/<teste>/trace.zip` ou arraste o arquivo para [trace.playwright.dev](https://trace.playwright.dev).

Sem Docker: `nvm use && npm install && npx playwright install --with-deps chromium` e `npm test`.

## No CI (GitHub Actions)

Os testes rodam contra o **staging**, depois do deploy, e **não bloqueiam** nada:

```
deploy da aplicação no staging ──▶ dispara este repo ──▶ testes ──▶ ✓ / ✗ na aba Actions
                                                                     (o GitHub avisa por e-mail se falhar)
```

`.github/workflows/e2e.yml` roda em três situações:

1. **depois de cada deploy em staging**: o repo da aplicação dispara o evento `deploy-staging`.
   O passo que vai lá está em [`exemplos/disparar-e2e.yml`](exemplos/disparar-e2e.yml);
2. **todo dia às 6h**;
3. **na mão**: botão "Run workflow".

Para configurar:

- **Neste repo**: variável `APP_URL` com o endereço do staging (precisa ser HTTPS).
- **No repo da aplicação**: o passo de `exemplos/disparar-e2e.yml` e o secret `E2E_DISPATCH_TOKEN`.

Os dados criados pelos testes levam o prefixo `e2e` (ex.: e-mails `e2e+...@teste.com`). Assim é possível achá-los e apagá-los no staging.
