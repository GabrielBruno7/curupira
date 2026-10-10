# curupira

End-to-end tests built with [Playwright](https://playwright.dev).
They use each product the way a user would: through the browser or through the same API the app calls.

> **About to write or change a test?** Follow the step by step in [writing a test](WRITING-A-TEST.md) and read the [best practices](BEST-PRACTICES.md), especially the part about **rate limits**.

## How it works

1. `.env` says **where** each service is: one `<SERVICE>_URL` per service (`WALLET_API_URL`, …), plus the test credentials.
2. Each file in `tests/<product>/` ending in `.spec.ts` is a set of tests. To start a new one, copy [`examples/template.spec.ts`](examples/template.spec.ts).
3. Every test does the same: **acts** (opens, fills, clicks, calls) and **checks** (`expect`), in named `test.step`s.
4. After a run, the report is in `playwright-report/`, and the screenshots, videos and traces of each failure in `test-results/`.

| Test | What it covers |
|---|---|
| `tests/app/login.spec.ts` | App login with the right and the wrong password |
| `tests/app/registration.spec.ts` | Simplified registration: CPF check → SMS code → e-mail code → registration → first login → additional information |

## Running (you only need Docker)

```bash
cp .env.example .env                    # and adjust it
docker compose run --rm --build tests   # runs the tests
```

- The services do **not** start here: they must already be up (on your machine or in a test environment).
- Service on your machine? In its URL, use `host.docker.internal` (your machine, seen from the container) instead of `localhost`.
- `--build` is only needed the first time or when `package.json` changes. The project is mounted into the container, so editing a test and running again is enough; `node_modules` comes from the image.
- The container runs as a non-root user (UID 1000), so `test-results/` and `playwright-report/` belong to you.
- Open `playwright-report/index.html` in the browser to see the report. To step through a failure, use `npx playwright show-trace test-results/<test>/trace.zip` or drop the file on [trace.playwright.dev](https://trace.playwright.dev).

Without Docker: `nvm use && npm install && npx playwright install --with-deps chromium` and `npm test`.

### Environment variables

| Variable | What it is | Local value (`.env.example`) |
|---|---|---|
| `WALLET_API_URL` | Wallet API | `http://host.docker.internal` (`emcash_api`, port 80) |
| `WALLET_DB_URL` | Wallet database, to read the SMS and e-mail codes | `mysql://root:admin@host.docker.internal:3306/dbapp` |
| `WALLET_USERNAME`, `WALLET_PASSWORD`, `WALLET_DEVICE_ID` | An existing user, with a device already registered | A user from the wallet fixtures (only exists locally) |

Values with `$` go between single quotes (`WALLET_PASSWORD='A234$6'`), or Docker Compose tries to expand them.

### Configuration (`playwright.config.ts`)

- **No `baseURL`:** a journey can go through several services, so each test builds its URLs from the `<SERVICE>_URL` variables.
- **Locale and timezone fixed** (`pt-BR`, `America/Sao_Paulo`): the container defaults to English/UTC, and many apps follow the browser.
- **On CI:** 1 retry (a test that only passes on retry shows up as *flaky*, not green), and a forgotten `test.only` fails the run.
- **Failures keep** trace, screenshot and video in `test-results/`; a JUnit report goes to `test-results/junit.xml`.
- **Playwright version:** the same in `package.json`, the `Dockerfile` (`mcr.microsoft.com/playwright:v<version>-noble`) and the CI workflow. Update all three together.

### Wallet locally

The tests that use the wallet run against the local wallet from the emcash CLI (`~/emcash`):

```bash
cd ~/emcash
docker start emcash_db
docker compose -f docker-compose.dist.yml up -d --no-deps api   # emcash_api on port 80
cd repos/wallet.em.cash && ./refresh-db.sh                      # first time only: DROPS and recreates dbapp
```

The `.env.example` values already point at it.

## On CI (GitHub Actions)

The tests run against **staging**, after the deploy, and **block** nothing:

```
application deploy to staging ──▶ triggers this repo ──▶ tests ──▶ ✓ / ✗ in the Actions tab
                                                                    (GitHub emails if it fails)
```

`.github/workflows/e2e.yml` runs, one at a time (two deploys in a row do not run tests in parallel on the same staging):

1. **after every staging deploy**: the application repo triggers the `deploy-staging` event;
2. **by hand**: the "Run workflow" button in the Actions tab.

It runs in the same Playwright image as the `Dockerfile` and uploads the `playwright-report` artifact (HTML report, screenshots, videos and traces).

To set it up (Settings → Secrets and variables → Actions):

- **Variables:** `WALLET_API_URL` (the staging address, HTTPS), `WALLET_USERNAME`, `WALLET_DEVICE_ID`.
- **Secrets:** `WALLET_PASSWORD`, `WALLET_DB_URL`.

**Daily run:** once those exist, add a schedule to `on:` in the workflow, e.g. every day at 6am Brasília:

```yaml
  schedule:
    - cron: '0 9 * * *'
```

### Triggering from an application repo

[`examples/trigger-e2e.yml`](examples/trigger-e2e.yml) is the step that goes in the **application's** deploy pipeline, right after the staging deploy. It only tells this repo "there is a new version on staging" and finishes immediately: the deploy neither waits for the tests nor fails if they fail.

It needs a token with access to this repo (the default `GITHUB_TOKEN` only works for its own repo): create a fine-grained token, or a GitHub App, with "Contents: read and write" on this repo, and save it in the application repo as the `E2E_DISPATCH_TOKEN` secret.

Data created by the tests carries the `e2e` prefix in the e-mail (`e2e.<id>@teste.com`), so it can be found and deleted on staging.
