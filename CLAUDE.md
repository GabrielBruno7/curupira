# CLAUDE.md

End-to-end tests with [Playwright](https://playwright.dev) (`@playwright/test`, TypeScript). This repo **only tests**: each service lives in its own repo, and the tests reach it through one URL per service (`WALLET_API_URL`, …, from `.env` or the CI variables).

**Never point the tests at an environment with real data:** they create data. Use a local test environment or staging.

## Language

Everything in this repo is in **English**: code, test names, docs, file names and commit messages. The only exception is the text the app itself shows or returns (e.g. `'Usuário ou senha incorretos'`): it is asserted exactly as the app produces it.

## Commands

```bash
docker compose run --rm --build tests                                              # runs everything
docker compose run --rm tests npx playwright test tests/<product>/<file>.spec.ts   # a single file
```

Run through Docker: the official Playwright image already has Node 24 and Chromium. `--build` is only needed when `package.json` changes. The services do **not** start here: they must already be up. If a service runs on your machine, use `host.docker.internal` instead of `localhost` in its URL.

## Layout

- `tests/<product>/` — tests. The current suggestion is one folder per **product the user sees** (`tests/app/`, `tests/multiportal/`, …), not per repo, because a journey like the BTG proposal goes through several repos. **This is still open: QA decides the final organization** (see the open items in [PLAN.md](PLAN.md)). Until then, follow the suggestion.
- Services are configuration, not folders: one `<SERVICE>_URL` variable each, and credentials named after the system that holds them (`WALLET_USERNAME`, `WALLET_DB_URL`…).
- `examples/` — the test template and the CI trigger step for application repos. Not run.

## Code style

- **No comments** in code or config. Explanations live in the docs (this file, [README.md](README.md), [BEST-PRACTICES.md](BEST-PRACTICES.md)).
- **Steps are `test.step('...')`**, named in plain words (`'confirm the cellphone with the SMS code'`). They replace comments and show up in the report and the trace.
- **Request bodies and expected objects: one field per line**, with a trailing comma.
- **A blank line between each `expect`** and between a request and its checks.
- **`await expect(response).toBeOK()`** for API calls: on failure it prints the whole response body. A bare `expect(response.status()).toBe(...)` only prints the number, so use it only to tell 2xx statuses apart (e.g. 200 vs. the wallet's 202).
- **Each test checks its own environment variables** at the top of the file and throws a clear error if one is missing.
- Start from [`examples/template.spec.ts`](examples/template.spec.ts). Do not create abstractions (Page Objects, helpers, fixtures) without asking.

## Creating or changing a test

- Follow **every** step in [WRITING-A-TEST.md](WRITING-A-TEST.md), including step 5 (make the test fail on purpose). A test is only done after that.
- Respect [BEST-PRACTICES.md](BEST-PRACTICES.md).

## Tool pitfalls

- **Locale and timezone** are fixed in `playwright.config.ts` (`pt-BR`, `America/Sao_Paulo`). Do not remove them: the container defaults to English/UTC.
- **Text matches by substring, case-insensitive:** `getByLabel('Senha')` also finds "Confirmar senha". Use `{ exact: true }` when you need the whole text.
- **A locator must match exactly one element.** If it matches two (`strict mode violation`), narrow it to a region instead of using `.first()`.
- **Playwright version:** the one in `package.json`, the `Dockerfile` and the CI workflow must be the same.
- **Never use `sleep` or `waitForTimeout`:** actions and `expect` already wait on their own.

## Known app pitfalls

### Wallet (`wallet.em.cash`, PHP/Yii2 API)

- **Running locally:** `emcash_api` on port 80 and `emcash_db` (MariaDB, `root`/`admin`), from the emcash CLI (`~/emcash`). See [README.md](README.md#wallet-locally). `./refresh-db.sh` in the wallet repo **drops and recreates** `dbapp`.
- **Login is `POST /v3/login`** with `usuario` (CPF), `senha`, `identificador` (device) and `token` (push). `/login` and `/v2/login` are disabled and always answer "atualize o app".
- **Push token:** the part after `:` is the "partial token", and it identifies one app install. Each device needs its own (`e2e:push-token-<id>`); reusing one from another device fails with 4274 "O registro do app está vinculado à outro dispositivo".
- **Always send a push token.** Bug found on 2026-10-10: logging in **without** a token on a device whose last login also had no token returns **500** ("No device identifier ... was updated"). This is an app bug, not a test problem.
- **Unknown device of an existing user** gets no token: the wallet answers **202** and asks for a PIN. A user's very first device is accepted directly (200).
- **SMS and e-mail codes** are read from the database (`celular.codigo` by `numero`, `confirmacao_email.codigo` by `email`), through `WALLET_DB_URL`. In dev, SMS and e-mails are written to disk, never sent.
- **Validation:** names accept **letters only** (no digits, so no "E2E" in names); e-mails accept only `a-z 0-9 _ . -` before the `@` (no `+`, no uppercase).
- **Fixture users** (e.g. `89524508095` / `A234$6` / `dispositivo_1`) only exist in the local database, never on staging.
- **Rate limit** per IP + user agent: 1500 requests/day in dev, 500 elsewhere. `127.0.0.1` is exempt, so a `curl` on the host behaves differently from the test container.

## When a test fails

Read `test-results/<test>/error-context.md` **before** touching the test: it shows the error, the failing step and, for UI tests, what was on screen. The full step-by-step is in `trace.zip`, in the same folder. Classify the failure:

- **the app broke**: report it to the user, do not change the test to make it pass;
- **the app changed on purpose**: update the test;
- **environment or limit**: do not touch the test.
