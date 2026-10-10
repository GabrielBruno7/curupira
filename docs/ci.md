# CI and configuration

## Environment variables

`.env.example` has the local values (the local wallet). A service running on your machine is `host.docker.internal` from inside the container, not `localhost`. A missing variable fails only the tests that use it. Values with `$` go between single quotes.

| Variable | What it is |
|---|---|
| `WALLET_API_URL` | Wallet API |
| `WALLET_DB_URL` | Wallet database, to read SMS and e-mail codes |
| `WALLET_USERNAME`, `WALLET_PASSWORD`, `WALLET_DEVICE_ID` | An existing user with a registered device |

## The `curupira` command

A wrapper around `docker compose` (only Docker is needed). `./curupira` with no arguments lists the commands; `./curupira install` lets you type `curupira`.

| Command | What it does |
|---|---|
| `start` | Menu: all tests, a folder, a file or a single test; check; last report (`q` goes back) |
| `start ui` | Playwright UI mode in the browser, at http://localhost:8090 |
| `run [file…]` | Runs everything, or the given files |
| `check` | `typecheck` + `lint`, like CI |
| `report` | Last report, at http://localhost:9323 |

Without the script: `docker compose run --rm --build tests`. Without Docker: `nvm use && npm install && npx playwright install --with-deps chromium && npm test`.

## Playwright configuration

- **No `baseURL`:** a journey crosses several services, so each test builds its URLs from the variables.
- **Two projects:** `api` (tests tagged `@api`, no browser, `User-Agent: curupira-e2e`) and `web` (Desktop Chrome).
- **Locale and timezone fixed** (`pt-BR`, `America/Sao_Paulo`): the container defaults to English/UTC.
- **On CI:** 1 retry (shown as *flaky*), 2 workers, and a forgotten `test.only` fails the run.
- **Playwright version:** the same in `package.json`, the `Dockerfile` and the workflow. Update all three together.

## GitHub Actions

`.github/workflows/e2e.yml` runs after every staging deploy (the application repo sends `deploy-staging`) or by hand ("Run workflow"), one run at a time. It type-checks, lints, runs the tests and keeps the `playwright-report` artifact for 7 days (traces contain the test password). It blocks no deploy.

> [!WARNING]
> **Not ready for staging yet:** see [PLAN.md](../PLAN.md#before-the-first-staging-run).

- **Variables** (Settings → Secrets and variables → Actions): `WALLET_API_URL`, `WALLET_USERNAME`, `WALLET_DEVICE_ID`. **Secrets:** `WALLET_PASSWORD`, `WALLET_DB_URL`.
- **Daily run:** add to `on:` in the workflow:

  ```yaml
  schedule:
    - cron: '0 9 * * *'
  ```

- **Application repos:** add the step in [`examples/trigger-e2e.yml`](../examples/trigger-e2e.yml) right after their staging deploy, with an `E2E_DISPATCH_TOKEN` secret (a GitHub App or a fine-grained token with "Contents: read and write" on this repo). It only notifies this repo; the deploy does not wait.
