# CLAUDE.md

End-to-end tests with Playwright (TypeScript). This repo **only tests**: each service lives in its own repo and is reached through one URL per service (`WALLET_API_URL`, …). See [README.md](README.md).

- **Never point the tests at an environment with real data.** Staging sends **real SMS and e-mails**.
- **Everything in English** (code, tests, docs, commits), except the README (pt-BR, for the team) and the text the app returns, which is asserted as is.
- **Before writing or changing a test**, follow [WRITING-A-TEST.md](WRITING-A-TEST.md) entirely, including its style rules and step 5 (make it fail on purpose), and read the service's file in `docs/`. Add what you learn about a service to that file.
- **No new abstractions** (Page Objects, new support code) without asking.
- **New test for a journey?** Use the `write-e2e-test` skill (`.claude/skills/write-e2e-test/`): it researches the flow, interviews the user, then builds the test.

## Commands

```bash
docker compose run --rm --build tests                                              # everything
docker compose run --rm tests npx playwright test tests/<product>/<file>.spec.ts   # one file
docker compose run --rm tests sh -c 'npm run typecheck && npm run lint'            # what CI checks first
```

The services must already be up (local wallet: [docs/wallet.md](docs/wallet.md#running-it-locally)).

## When a test fails

Read `test-results/<test>/error-context.md` **before** touching the test, then classify:

- **the app broke**: report it to the user, do not change the test to make it pass;
- **the app changed on purpose**: update the test;
- **environment or limit**: do not touch the test.

Known bugs and limits are in `docs/`.
