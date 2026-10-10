# curupira

Testes end-to-end da [Trilha](../habit-grid), feitos com o [e2e](https://e2e.tester.army).
Eles usam a Trilha como um usuário usaria: abrem o navegador num endereço e clicam.

> **Vai escrever ou alterar um teste?** Siga o passo a passo em [como criar um teste](COMO-CRIAR-UM-TESTE.md) e leia as [boas práticas](BOAS-PRATICAS.md), principalmente a parte de **rate limits**.

## Como funciona

1. `e2e.config.ts` diz **onde** está a Trilha (`TRILHA_URL`, vinda do `.env`).
2. Cada arquivo em `tests/` que termina em `.e2e.ts` é um conjunto de testes.
3. Cada teste faz sempre o mesmo: **abre** o app, **age** (preenche, clica) e **confere** (`expect`).
4. Depois de rodar, o relatório, os prints e os vídeos ficam em `.e2e/`.

## Rodando (só precisa de Docker)

```bash
docker compose run --rm --build tests   # sobe a Trilha de teste e roda os testes
docker compose down                     # apaga tudo (o banco fica em memória)
```

- `--build` só é necessário na primeira vez ou quando o `package.json` mudar.
  O projeto é montado no container, então editar um teste e rodar de novo já basta.
- O relatório, os prints e o passo a passo de cada teste (`trace.md`) aparecem em `.e2e/`.
- Enquanto a Trilha de teste estiver no ar, dá para abrir no navegador: http://localhost:48300
- A imagem `trilha-app` vem do repo da Trilha (`docker compose build` lá).

Sem Docker: `nvm use && npm install && npx @e2e-dev/web install chromium`, `docker compose up -d` para a Trilha e `npm test`.

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

- **Neste repo**: variável `TRILHA_URL` com o endereço do staging (precisa ser HTTPS).
- **No repo da aplicação**: o passo de `exemplos/disparar-e2e.yml` e o secret `E2E_DISPATCH_TOKEN`.

Os testes criam contas com e-mail `e2e+...@teste.com`. Esse prefixo permite achá-las e apagá-las no staging.
