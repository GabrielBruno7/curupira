# curupira

End-to-end tests built with [Playwright](https://playwright.dev).
They use each app the way a user would: through the browser or through the same API the app calls.

> **About to write or change a test?** Follow the step by step in [writing a test](WRITING-A-TEST.md) and read the [best practices](BEST-PRACTICES.md), especially the part about **rate limits**.

## How it works

1. `playwright.config.ts` says **where** the app is (`APP_URL`, from `.env`).
2. Each file in `tests/<product>/` ending in `.spec.ts` is a set of tests. To start a new one, copy [`examples/template.spec.ts`](examples/template.spec.ts).
3. Every test does the same: **opens** the app, **acts** (fills, clicks, calls) and **checks** (`expect`).
4. After a run, the report is in `playwright-report/`, and the screenshots, videos and traces of each failure in `test-results/`.

## Running (you only need Docker)

```bash
cp .env.example .env                    # and adjust it
docker compose run --rm --build tests   # runs the tests
```

- The app does **not** start here: it must already be up (on your machine or in a test environment).
- App on your machine? In `APP_URL`, use `host.docker.internal` instead of `localhost`.
- `--build` is only needed the first time or when `package.json` changes.
  The project is mounted into the container, so editing a test and running again is enough.
- Open `playwright-report/index.html` in the browser to see the report. To step through a failure, use `npx playwright show-trace test-results/<test>/trace.zip` or drop the file on [trace.playwright.dev](https://trace.playwright.dev).

Without Docker: `nvm use && npm install && npx playwright install --with-deps chromium` and `npm test`.

### Wallet locally

The `tests/wallet/` tests run against the local wallet from the emcash CLI (`~/emcash`):

```bash
cd ~/emcash
docker start emcash_db
docker compose -f docker-compose.dist.yml up -d --no-deps api   # emcash_api on port 80
cd repos/wallet.em.cash && ./refresh-db.sh                      # first time only: DROPS and recreates dbapp
```

The `.env.example` values already point at it, with a user from the wallet fixtures.

## On CI (GitHub Actions)

The tests run against **staging**, after the deploy, and **block** nothing:

```
application deploy to staging ──▶ triggers this repo ──▶ tests ──▶ ✓ / ✗ in the Actions tab
                                                                    (GitHub emails if it fails)
```

`.github/workflows/e2e.yml` runs in three situations:

1. **after every staging deploy**: the application repo triggers the `deploy-staging` event.
   The step that goes there is in [`examples/trigger-e2e.yml`](examples/trigger-e2e.yml);
2. **every day at 6am** (paused for now);
3. **by hand**: the "Run workflow" button.

To set it up:

- **In this repo**: the `APP_URL` variable with the staging address (must be HTTPS), and a staging test user in `WALLET_USERNAME`, `WALLET_DEVICE_ID` (variables) and `WALLET_PASSWORD` (secret).
- **In the application repo**: the step from `examples/trigger-e2e.yml` and the `E2E_DISPATCH_TOKEN` secret.

Data created by the tests carries the `e2e` prefix (e.g. e-mails `e2e+...@teste.com`), so it can be found and deleted on staging.
