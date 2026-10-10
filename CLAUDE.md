# CLAUDE.md

End-to-end tests with [Playwright](https://playwright.dev) (`@playwright/test`, TypeScript). This repo **only tests**: each service lives in its own repo, and the tests reach it through one URL per service (`WALLET_API_URL`, …, from `.env` or the CI variables).

**Never point the tests at an environment with real data:** they create data. Use a local test environment or staging. **Staging sends real SMS and e-mails** (see [docs/wallet.md](docs/wallet.md)).

## Language

Everything in this repo is in **English**: code, test names, docs, file names and commit messages. The only exception is the text the app itself shows or returns (e.g. `'Usuário ou senha incorretos'`): it is asserted exactly as the app produces it.

## Commands

```bash
docker compose run --rm --build tests                                              # runs everything
docker compose run --rm tests npx playwright test tests/<product>/<file>.spec.ts   # a single file
docker compose run --rm tests sh -c 'npm run typecheck && npm run lint'            # what CI checks before the tests
```

Run through Docker: the official Playwright image already has Node 24 and Chromium. `--build` is needed when `package.json` changes. The services do **not** start here: they must already be up. If a service runs on your machine, use `host.docker.internal` instead of `localhost` in its URL.

## Layout

- `tests/<product>/` — tests. The current suggestion is one folder per **product the user sees** (`tests/app/`, …). **This is still open: QA decides the final organization** (see [PLAN.md](PLAN.md)). Until then, follow the suggestion.
- `support/` — shared code, kept small: `env.ts` (reads a variable or fails with a clear message), `data.ts` (test data generators, `newUser()`), `fixtures.ts` (the `test` to import, with the `walletDb` fixture that reads verification codes).
- `docs/` — what the tests need to know about each service ([docs/wallet.md](docs/wallet.md)).
- `examples/` — `api-template.spec.ts`, `web-template.spec.ts` and the CI trigger step for application repos. Not run.
- Services are configuration, not folders: one `<SERVICE>_URL` variable each, and credentials named after the system that holds them (`WALLET_USERNAME`, `WALLET_DB_URL`…).

## Code style

- **Import `test` and `expect` from `support/fixtures`**, not from `@playwright/test`.
- **API tests carry `{ tag: '@api' }`**: they run in the `api` project (no browser, `User-Agent: curupira-e2e`). Untagged tests run in the `web` project (Desktop Chrome).
- **Read variables with `env('NAME')` inside the test**, never at the top of the file: a missing variable then fails only the tests that need it, not the whole suite.
- **Steps are `test.step('...')`**, named in plain words (`'confirm the cellphone with the SMS code'`). They show up in the report and the trace.
- **Comments only say *why*** (a non-obvious value, a workaround, a simulated partner: `// here we pretend to be <partner>`). Never what the code does: the step names cover that.
- **Request bodies and expected objects: one field per line**, with a trailing comma. **A blank line between each `expect`** and between a request and its checks.
- **`await expect(response).toBeOK()`** for API calls: on failure it prints the whole response body. When the exact status matters (200 vs. the wallet's 202), use `expect(response.status(), await response.text()).toBe(200)` so the body is printed too.
- **Type what you read from a response** (`(await response.json()) as Token`); the linter rejects untyped `any`.
- **`support/` holds data generators, the env reader and fixtures.** No Page Objects, and no new support code beyond that without asking.
- `npm run typecheck` and `npm run lint` must pass (the linter also catches a missing `await`).

## Creating or changing a test

- Follow **every** step in [WRITING-A-TEST.md](WRITING-A-TEST.md), including step 5 (make the test fail on purpose). A test is only done after that.
- Respect [BEST-PRACTICES.md](BEST-PRACTICES.md).
- Before testing a service, read its file in `docs/`, and add to it what you learn.

## Tool pitfalls

- **Locale and timezone** are fixed in `playwright.config.ts` (`pt-BR`, `America/Sao_Paulo`). Do not remove them: the container defaults to English/UTC.
- **Text matches by substring, case-insensitive:** `getByLabel('Senha')` also finds "Confirmar senha". Use `{ exact: true }` when you need the whole text.
- **A locator must match exactly one element.** If it matches two (`strict mode violation`), narrow it to a region instead of using `.first()`.
- **Playwright version:** the one in `package.json`, the `Dockerfile` and the CI workflow must be the same.
- **Never use `sleep` or `waitForTimeout`:** actions and `expect` already wait on their own.

## When a test fails

Read `test-results/<test>/error-context.md` **before** touching the test: it shows the error, the failing step and, for UI tests, what was on screen. The full step-by-step is in `trace.zip`, in the same folder. Classify the failure:

- **the app broke**: report it to the user, do not change the test to make it pass;
- **the app changed on purpose**: update the test;
- **environment or limit**: do not touch the test.

Known app bugs and limits are in `docs/` (e.g. the wallet's 500 on login without a push token).
