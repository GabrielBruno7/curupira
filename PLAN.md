# Plan: e2e regression at Emcash

This repo started as a **proof of concept** (testing a personal app, to validate the way of working) and is now the base for Emcash's tests.
This document says how to take it to Emcash: what has been decided, why, and what is still missing.

> Every decision has its reason next to it. Before changing one, read the reason: it was probably already discussed.

## Goal

Catch **regressions** (things that used to work and stopped) in the products' **critical journeys**, using the system like a user: through the browser for the portals, and through the same API calls the mobile app makes.

**Not goals:**

- testing new features: the developer does that locally;
- replacing each service's unit and integration tests;
- covering detailed rules (e.g. "maximum amount of R$ 1,000,000"): those stay in the service's tests.

## Phases

| Phase | What the suite does | Does a bug reach prod? |
|---|---|---|
| **v1: observation** | Runs after every merge to master and **warns** on Slack. Prod deploys at the same time, without waiting. Records what *would* have been blocked. | Yes, for minutes or hours, until reverted |
| **v2: gate** | master → staging → suite → **prod only if green**. | No |

**Criteria to move from v1 to v2:** 4 weeks with less than 2% flaky tests **and** the deploy pipeline split into stages (see [Dependencies](#dependencies)).

⚠️ **v1 detects, it does not prevent.** If v2 has no owner and no deadline, the project stays a detector forever.

## Decisions

### Scope and tooling

| Decision | Reason |
|---|---|
| v1 covers **one journey**: the BTG proposal in the multiportal, from simulation to approval | The path is already known (automation in encore), and it forces solving the hard problems (OTP, state, integrations) early |
| **`@playwright/test`** (the proof of concept used `e2e`; already switched) | `e2e` is at 0.x, with telemetry on and a small community. Playwright is the market standard: trace, HTML/JUnit report, retries, sharding |
| **One QA repo**; services are configuration (one `<SERVICE>_URL` each), not folders | A journey goes through several repos (front, backend, wallet); organizing by repo leaves it nowhere to live |
| **Folder organization: open, QA decides.** Current: one folder per product the user sees (`tests/app/`). The senior QA review recommends layer first, then product or journey, with service ownership in tags: `tests/api/…`, `tests/web/…`, `tests/journeys/btg-proposal.spec.ts`, `@wallet` | Layers map to Playwright projects (`api` without a browser, `web` with one); cross-service journeys get a neutral home; tags give triage ownership without moving files; `tests/app/` gets ambiguous once Maestro tests the Flutter app |
| **API tests for the mobile app**, tagged `@api`, in an `api` project with `User-Agent: curupira-e2e` | The Flutter app cannot be driven by Playwright; its API is where the rules live. The user agent separates the tests in the services' logs and rate limits |
| **Small `support/` folder** (env reader, data generators, fixtures); no Page Objects | Without it, the env checks, the CPF generator and the OTP query would be copied into every journey that creates a user |
| **No comments**; steps are named `test.step`s | Step names say what the code does and show up in reports; the *why* (a magic value, a simulated partner) lives in `docs/<service>.md`, where the whole team finds it |
| **Type check and lint on CI** (`eslint-plugin-playwright`) | A missing `await` on an `expect` passes silently otherwise |
| Every deploy runs **the whole suite** | It is simple and works while the suite is small. Filter by tags only when it goes past ~10 minutes |
| Everything in the repo is in **English** | Same convention as the wallet repo |
| Native app (Flutter): **Maestro**, later | Playwright only drives browsers. Maestro tests the built APK from the outside, in YAML, and reads Flutter's `Semantics` labels |

### Environment

| Decision | Reason |
|---|---|
| **Staging is the regression environment** and is **always equal to master** | PR code on staging would leave orphan migrations and results inherited from another PR. Discarded |
| QA can also use staging manually | The suite's data is always new and marked by the `e2e.` e-mail prefix, so they do not get in each other's way |
| Runs on Emcash's **self-hosted runner**, with the `mcr.microsoft.com/playwright` image | Staging and MySQL are only reachable from the internal network (*to confirm*). GitHub's `ubuntu-latest` cannot reach them |
| **No automatic cleanup** of data; database refresh when needed | Automatic cleanup could delete data QA wants to keep |

### Data

| Decision | Reason |
|---|---|
| **`newUser()`** (`support/data.ts`) generates a valid CPF, a letters-only name, an `e2e.<id>@emcash.test` e-mail and a phone number **on every run** | With a fixed CPF, two runs at once break, and bugs that only show up with a "clean" borrower stay hidden. The wallet rejects digits in names, so the `e2e` marker lives in the e-mail |
| **E-mails on `@emcash.test`** (reserved TLD) | Staging really sends e-mails; nobody may receive them |
| "Same CPF, second proposal" is **a scenario inside one test**, not inherited state | The test stays independent: it creates proposal 1, creates proposal 2 and checks the rule |
| The **OTP is read from MySQL** with the default credential, stored only in a GitHub secret | To avoid blocking the start of the project. **Later:** an `e2e_readonly` user with `SELECT` only and, as a goal, a fixed OTP on staging for test phones (no real SMS) |
| **Third parties are simulated** through the endpoints that already exist (e.g. eligibility webhook) | The suite tests **our** system and does not depend on the partner's sandbox being up. Each simulation is named in its `test.step` (e.g. "Hermes creates the proposal") and described in `docs/<service>.md` |

### Trigger

```
merge to master of app X
   ├─ deploy (automatic, external tool) ──▶ staging
   └─ dispatch to the QA repo, with the sha
          ├─ waits for staging's /version to show that sha (timeout ~15 min)
          ├─ runs the whole suite
          └─ result ──▶ Slack  (+ commit status on app X's sha)
```

It also runs **every day at 6am** and **by hand** (the "Run workflow" button).

Waiting for `/version` is mandatory: without it, the suite may test the previous version and give a false green.

## When it fails

| Rule | Detail |
|---|---|
| **Slack warning** | Application, sha, report link. GitHub's e-mail is not enough, because on `schedule`/`dispatch` it only warns whoever last edited the workflow |
| **Rotating triage** | One QA person per week owns the failures. Classifies each one: *the app broke*, *the app changed on purpose* or *environment/limit* (see [WRITING-A-TEST.md](WRITING-A-TEST.md#8-when-it-fails-on-ci)) |
| **Revert first** | Real bug: the author, or whoever is on triage, reverts the commit on master **within 1 hour** and fixes it calmly afterwards |
| **Only the last green goes to prod** | In v2, prod gets the last sha that passed, never an untested sha |
| **`skip-e2e` bypass** | For incident hotfixes. Requires a justification and warns on Slack |

## Flaky tests

- **1 retry on CI.** A test that only passes on retry counts as **flaky**, not green, and shows up on Slack.
- **`@quarantine`**: a flaky test leaves the main suite, runs only nightly and has **1 week** to be fixed or deleted.

A flaky test is worse than none: the team starts ignoring the alerts.

## Responsibilities

| Who | What |
|---|---|
| **QA** | Owns the repo and the journeys. Writes the tests, does the triage |
| **Devs** | Keep the selectors (`data-testid`, accessible text). When they change something on purpose, they warn or update the test |
| **Review** | Every test PR is reviewed by someone from QA or the product team |

## Dependencies

| # | What | From whom | Unlocks |
|---|---|---|---|
| 1 | Each service exposes **`/version`** with the sha it is running | Each service's team | v1 |
| 2 | Token for the dispatch (`E2E_DISPATCH_TOKEN`) in the app repos | Whoever administers the GitHub org | v1 |
| 3 | Slack channel and webhook | QA | v1 |
| 4 | Split the deploy into **master → staging → (suite) → prod**, and the deploy tool receiving the ✓/✗ | **Deploy owner: to be defined** | v2 |
| 5 | A **test user on staging** for the wallet (CPF, password, device already registered) | Wallet team | first test on CI |
| 6 | **Fixed OTP or allowlist of test cellphones** on staging | Backend | registration test on CI |
| 7 | **Allowance in the wallet rate limit** for `User-Agent: curupira-e2e` | Wallet team | daily CI runs |
| 8 | **Read-only database user** (`SELECT` on `celular` and `confirmacao_email`) on staging | Whoever administers the staging database | registration test on CI |
| 9 | **Repo moved to the Emcash GitHub org** | QA + org admin | dispatch tokens and company secrets |

## Before the first staging run

The suite must not run against staging until all of these are done:

- [ ] **No SMS to real people:** fixed OTP or an allowlist of test cellphones on staging (dependency 6). Staging sends SMS through Zenvia for real; `newUser()` generates random, real-looking numbers.
- [ ] **Self-hosted runner:** the workflow uses `ubuntu-latest`, which cannot reach an internal-only staging. Switch `runs-on` to the self-hosted runner's label.
- [ ] **Read-only `WALLET_DB_URL`** (dependency 8), never the default or root credential.
- [ ] **Wait for `/version`** in the workflow before the tests (dependency 1). Until then, results are only indicative: the suite may test the previous build.
- [ ] **Rate limit allowance** for `curupira-e2e` (dependency 7). The wallet counter never resets while requests keep coming from the same IP.
- [ ] **Repo in the Emcash org** (dependency 9), private.
- [ ] **Consignado proposal test** (`tests/consignado/create-proposal.spec.ts`): the reserved CPF range below, since the wallet creates an active borrower with a random valid CPF. Every run also writes a CCB PDF to the S3 test bucket; the test cancels its proposal, so the database stays clean.
- [ ] **Staging test user** in `WALLET_USERNAME`/`WALLET_PASSWORD`/`WALLET_DEVICE_ID` (dependency 5), with a password that is worthless outside staging: traces store it.

## Open items

- [ ] Find out which tool does the deploy today and who owns it (dependency 4).
- [ ] Confirm that staging is only reachable from the internal network.
- [ ] Survey the multiportal/backend limits on staging (login, SMS, external APIs) before the first test, and record them in `docs/<service>.md`.
- [ ] Create the `e2e_readonly` user in staging's MySQL.
- [ ] Agree with the backend on a fixed OTP on staging for test phones.
- [ ] Report the wallet bug: login without a push token returns 500 from the second time on (see [docs/wallet.md](docs/wallet.md#rules-that-bite)).
- [ ] Report the wallet rate limiter: it only resets after a full day without requests, and it trusts `X-Forwarded-For` (see [docs/wallet.md](docs/wallet.md#rate-limit)).
- [ ] Ask the wallet team whether `informacoes-adicionais` should reject a CEP, state and city that do not match (today it accepts them).
- [ ] Agree on a **reserved CPF range** (or allowlist) with backend, compliance and partners before the BTG journey: random valid CPFs may belong to real people, and credit analysis would run on them.
- [ ] **Slack notifications** on failure and on flaky results, and somewhere to store the JUnit results across runs, so the v2 criterion ("< 2% flaky over 4 weeks") can be measured.
- [ ] Ask the app team whether the Flutter app sends a null push token when notifications are denied (if so, the bug above hits real users).
- [ ] **QA:** decide the folder organization before the BTG journey test (see the decision above and the review's recommendation).
- [ ] Grow the consignado test into the full journey: from Hermes (Blip `payroll-loans/process`, Dataprev and Clicksign simulated) up to the investment and grant (`mercado-investimento`). Today it only calls the wallet's create route, pretending to be Hermes (see [docs/wallet.md](docs/wallet.md#consignado-payroll-loan)).
- [ ] The read-only database user also needs `SELECT` on `usuario`, `vinculado_grupo_emprestimo`, `emprestimo` and `emprestimo_parcela` for the consignado test.
- [ ] Get `WALLET_DB_URL` for staging (read-only user) so the registration test can read the SMS and e-mail codes on CI.

## Discarded

| Idea | Why not |
|---|---|
| Running the suite on every PR, with the PR branch on staging | PR migrations stay in the database, one PR inherits the previous one, and with a single environment a queue forms |
| Ephemeral environment per PR | Too expensive for now |
| Keeping our own runner (encore) | It would have to reimplement report, retries, trace and parallelism, which Playwright already has |
