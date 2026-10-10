# CLAUDE.md

End-to-end tests with [Playwright](https://playwright.dev) (`@playwright/test`, TypeScript). This repo **only tests**: each application lives in its own repo, and the tests reach it through a URL (`APP_URL`, from `.env` or the CI variable).

**Never point the tests at an environment with real data:** they create data. Use a local test environment or staging.

## Language

Everything in this repo is in **English**: code, comments, test names, docs, file names and commit messages. The only exception is the text the app itself shows or returns (e.g. `'Usuário ou senha incorretos'`): it is asserted exactly as the app produces it.

## Commands

```bash
docker compose run --rm --build tests                                       # runs everything against APP_URL
docker compose run --rm tests npx playwright test tests/<product>/<file>.spec.ts   # a single file
```

Run through Docker: the official Playwright image already has Node 24 and Chromium. `--build` is only needed when `package.json` changes. The app does **not** start here: it must already be up. If it runs on your machine, use `host.docker.internal` instead of `localhost` in `APP_URL`.

## Layout

- `tests/<product>/` — one folder per product (`tests/wallet/`, …).
- `examples/` — the test template and the CI trigger step for application repos. Not run.

## Creating or changing a test

- Follow **every** step in [WRITING-A-TEST.md](WRITING-A-TEST.md), including step 5 (make the test fail on purpose). A test is only done after that.
- Respect [BEST-PRACTICES.md](BEST-PRACTICES.md).
- Start from [`examples/template.spec.ts`](examples/template.spec.ts): one test readable top to bottom, with the steps as comments. Do not create abstractions (Page Objects, helpers) without asking.

## Tool pitfalls

- **Locale and timezone** are fixed in `playwright.config.ts` (`pt-BR`, `America/Sao_Paulo`). Do not remove them: the container defaults to English/UTC.
- **Text matches by substring, case-insensitive:** `getByLabel('Senha')` also finds "Confirmar senha". Use `{ exact: true }` when you need the whole text.
- **A locator must match exactly one element.** If it matches two (`strict mode violation`), narrow it to a region instead of using `.first()`.
- **Playwright version:** the one in `package.json`, the `Dockerfile` and the CI workflow must be the same.
- **Unique data:** e-mails and other values that cannot repeat use `Date.now()`, with an `e2e` prefix.
- **Never use `sleep` or `waitForTimeout`:** actions and `expect` already wait on their own.

## Known app pitfalls

### Wallet (`wallet.em.cash`, PHP/Yii2 API)

- **Running locally:** `emcash_api` on port 80 and `emcash_db`, from the emcash CLI (`~/emcash`). The database is filled by `./refresh-db.sh` in the wallet repo, which **drops and recreates** `dbapp`.
- **Login is `POST /v3/login`** with `usuario` (CPF), `senha`, `identificador` (device) and `token` (push). `/login` and `/v2/login` are disabled and always answer "atualize o app".
- **Always send a push token.** Bug found on 2026-10-10: logging in **without** a token on a device whose last login also had no token returns **500** ("No device identifier ... was updated"). This is an app bug, not a test problem.
- **Unknown device** gets no token: the wallet answers **202** and asks for a PIN.
- **Fixture users** (e.g. `89524508095` / `A234$6` / `dispositivo_1`) only exist in the local database, never on staging.
- **Rate limit** per IP + user agent: 1500 requests/day in dev, 500 elsewhere. `127.0.0.1` is exempt, so a `curl` on the host behaves differently from the test container.

## When a test fails

Read `test-results/<test>/error-context.md` **before** touching the test: it shows the error and, for UI tests, what was on screen. The full step-by-step is in `trace.zip`, in the same folder. Classify the failure:

- **the app broke**: report it to the user, do not change the test to make it pass;
- **the app changed on purpose**: update the test;
- **environment or limit**: do not touch the test.
