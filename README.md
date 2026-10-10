# curupira

End-to-end tests for Emcash, built with [Playwright](https://playwright.dev). They use each product the way a user would: through the browser, or through the same API calls the mobile app makes.

| Where | What |
|---|---|
| [WRITING-A-TEST.md](WRITING-A-TEST.md) | How to write a test, and the rules |
| [docs/](docs/) | What we know about each service: endpoints, rules, limits, known bugs ([wallet](docs/wallet.md)) |
| [PLAN.md](PLAN.md) | The strategy: decisions, prerequisites, open items |
| `tests/<product>/` | The tests |
| `support/` | Shared code: `env()`, `newUser()`, the `walletDb` fixture |
| `examples/` | Test templates and the CI trigger step for application repos (not run) |

| Test | What it covers |
|---|---|
| `tests/app/login.spec.ts` | App login with the right and the wrong password |
| `tests/app/registration.spec.ts` | Simplified registration, from the SMS code to the additional information; and registration without a confirmed SMS is rejected |

## Running (you only need Docker)

```bash
cp .env.example .env
docker compose run --rm --build tests
```

- The services do **not** start here; they must already be up. For the local wallet, see [docs/wallet.md](docs/wallet.md#running-it-locally). A service on your machine is `host.docker.internal`, not `localhost`.
- `--build` only when `package.json` changes: the project is mounted, so editing a test is enough.
- Report: `playwright-report/index.html`. Failures: `test-results/` (screenshots, videos, `error-context.md`, `trace.zip`).
- Without Docker: `nvm use && npm install && npx playwright install --with-deps chromium && npm test`.

| Variable | What it is |
|---|---|
| `WALLET_API_URL` | Wallet API |
| `WALLET_DB_URL` | Wallet database, to read SMS and e-mail codes |
| `WALLET_USERNAME`, `WALLET_PASSWORD`, `WALLET_DEVICE_ID` | An existing user with a registered device (locally, from the wallet fixtures) |

`.env.example` has the local values. A missing variable fails only the tests that use it. Values with `$` go between single quotes.

**Configuration worth knowing** (`playwright.config.ts`): no `baseURL` (a journey crosses several services); an `api` project (tests tagged `@api`, no browser, `User-Agent: curupira-e2e`) and a `web` project (Desktop Chrome); locale `pt-BR` and timezone `America/Sao_Paulo` fixed; on CI, 1 retry (shown as *flaky*), 2 workers and no `test.only`. The Playwright version in `package.json`, `Dockerfile` and the workflow must match.

## CI (GitHub Actions)

`.github/workflows/e2e.yml` runs after every staging deploy (the application repo sends `deploy-staging`) or by hand ("Run workflow"), one run at a time. It type-checks, lints, runs the tests and keeps the `playwright-report` artifact for 7 days (traces contain the test password). It blocks nothing; failures show in the Actions tab.

⚠️ **Not ready for staging yet:** see [PLAN.md](PLAN.md#before-the-first-staging-run).

- **Variables:** `WALLET_API_URL`, `WALLET_USERNAME`, `WALLET_DEVICE_ID`. **Secrets:** `WALLET_PASSWORD`, `WALLET_DB_URL`.
- **Daily run:** add `schedule: [{ cron: '0 9 * * *' }]` (6am Brasília) to `on:`.
- **Application repos:** add the step in [`examples/trigger-e2e.yml`](examples/trigger-e2e.yml) right after their staging deploy, with an `E2E_DISPATCH_TOKEN` secret (a GitHub App or fine-grained token with "Contents: read and write" on this repo). It only notifies this repo; the deploy does not wait.
