# Best practices

Read this before writing or changing a test. Every item here came from a real problem.

## ⚠️ Rate limits: the app protects itself from the tests too

The tests use the app like a user, but much faster and many times in a row. The app's abuse protections do not tell a test from an attack. In the proof of concept, for example, tests started failing with "Muitas tentativas" after hitting a per-IP limit on logins per minute.

**Before testing an app, ask its team which limits exist** (login, sign-up, SMS/e-mail sending, external APIs) and record them here:

| App | Limit | What happens | How to avoid it |
|---|---|---|---|
| Wallet | 500 requests per IP + user agent outside dev (1500 in dev), on login and every registration step. Only resets after a full day **without** requests | The request fails with "Max records reached" | The tests send `User-Agent: curupira-e2e`; agree on an allowance for it before CI runs daily. Details in [docs/wallet.md](docs/wallet.md#rate-limit) |

**When adding a test:**

- **Count how many logins, sign-ups or sends the suite makes.** Every new test adds more. Close to the limit, the suite starts failing on its own.
- **A test failing because of a limit** is neither an app bug nor a test bug. Check `error-context.md` (see [When a test fails](#when-a-test-fails)).
- **Do not run the suite many times in a row** to hunt for flakiness. Wait between runs.
- **When the suite grows**, agree with the application team on a higher limit on staging, or an allowance for the tests' IP. Do not turn the protection off in production.

## Data

- **Each test creates what it needs.** Do not depend on another test having run before, or on data "that is already there".
- **Test data carries the `e2e` prefix where the app allows it**, so it can be found and deleted on staging. The wallet rejects `+` in e-mails and digits in names, so e-mails are `e2e.<id>@emcash.test` and names `Teste Automatizado ...`. Use `newUser()` from `support/data.ts`.
- **Never send SMS or e-mail to someone real.** Staging sends them for real: e-mails go to `@emcash.test` (a reserved TLD, nobody receives it), and cellphones must be agreed test numbers before a test that sends SMS runs on staging.
- **Unique values** for anything the app requires not to repeat (CPF, e-mail, device, push token), and to avoid per-user limits.
- **Credentials come from the environment** (`.env` locally, variables and secrets on CI), never hard-coded in the test.
- **Codes sent by SMS or e-mail** (OTP) are read from the service's database, never from a real phone or inbox.
- **Never point the tests at an environment with real data.** They create data.

## Finding elements

- **Use the text the user sees**: `getByRole('button', { name: 'Entrar' })`, `getByLabel('E-mail')`. The test reads like a manual walkthrough.
- **Text matches by substring and case-insensitive**: `getByLabel('Senha')` also finds "Confirmar senha". For the whole text, use `{ exact: true }`.
- **A locator must find exactly one element.** Found two (`strict mode violation`)? Narrow it to a region (`page.getByRole('navigation').getByRole('link', ...)`) instead of using `.first()`.
- **Act like the user acts.** If an element is covered by another (a styled checkbox, for example), tap where the person would, like the text next to it.
- **Locale and timezone are fixed in `playwright.config.ts`** (`pt-BR`, `America/Sao_Paulo`). Without that, the app may open in English on CI, and "today" may be another day.

## API tests

- **Call the API the way the app does**: same endpoint, same fields. If the app always sends a field (like the wallet's push token), the test sends it too, with a value as unique as the real one (one push token per device).
- **Check the status and the body** the app relies on (`token_type`, `access_token`, the error `code`), not just the status.
- **Use `await expect(response).toBeOK()`**: when it fails, it prints the response body, which usually says exactly what is wrong. When the exact status matters, pass the body as the message: `expect(response.status(), await response.text()).toBe(200)`.
- **Prove a token works** by using it once (e.g. `GET /usuario`), not only by checking it is present.
- **Cover the cheap negative cases** that protect a rule (e.g. registration without a confirmed SMS is rejected). They send nothing and run in milliseconds.

## Waiting and checking

- **Never use `sleep` or `page.waitForTimeout`.** Actions and `expect` already wait on their own.
- **Every test ends by checking something** (`expect`). A test that only clicks tests nothing.
- **Check what should appear**, not only what should not: a `.not.toBeVisible()` with the wrong text passes without testing anything.

## When a test fails

1. Read the message in the terminal: it shows the line and the received value.
2. Open `test-results/<test-name>/error-context.md`: the error and, for UI tests, what was on screen. For the full step-by-step, open the `trace.zip` in the same folder with `npx playwright show-trace` or at [trace.playwright.dev](https://trace.playwright.dev).
3. On CI, download the `playwright-report` artifact from the run page.
4. Before changing the test, ask whether it found a real problem. The first wallet test did: see the bug in [docs/wallet.md](docs/wallet.md#rules-that-bite).
