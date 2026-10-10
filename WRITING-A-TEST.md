# Writing a test

From the idea to a test running on its own on CI. Every rule here came from a real problem.

## 1. Write the scenario in plain words

Usually from a story's acceptance criteria or a bug that already happened:

```
Given   a new user who confirmed the cellphone and the e-mail
When    they register and log in for the first time
Then    the app asks for the additional information
When    they send the additional information
Then    the registration is complete
```

**Is it worth an e2e test?** E2E is slow and expensive to maintain. Use it for the **paths the user feels when they break**: login, sign-up, the main flow. Detailed rules ("maximum amount of R$ 1,000,000") belong in the service's own tests.

## 2. Try it by hand

In the test environment, never one with real data: in the portal for a UI test, with `curl` for an API test. First read the service's file in `docs/` (e.g. [docs/wallet.md](docs/wallet.md)): its rules and **limits**. Write down the exact texts and fields, what shows up at the end (the check), and what can get in the way.

- **UI:** right click → **Inspect** → **Accessibility** gives the *Role* and *Name* for `getByRole('button', { name: 'Name' })`. `npx playwright codegen <address>` writes a draft while you click.
- **API:** send what the app sends (ask the app team, or read the service's own tests, like the wallet's `tests/acceptance/`).

## 3. Write the code

Copy [`examples/api-template.spec.ts`](examples/api-template.spec.ts) or [`examples/web-template.spec.ts`](examples/web-template.spec.ts) to `tests/<product>/<name>.spec.ts` (folder organization is up to QA; see [PLAN.md](PLAN.md)). Write the steps first, as empty `test.step`s, then fill them in. [`tests/app/registration.spec.ts`](tests/app/registration.spec.ts) is the full example.

**Style**

- Import `test` and `expect` from `support/fixtures`. API tests carry `{ tag: '@api' }` (they run without a browser, as `User-Agent: curupira-e2e`).
- Steps are `test.step('...')` in plain words. **No comments**: a non-obvious value or a simulated partner is explained in the service's `docs/` file.
- One field per line in request bodies and expected objects; a blank line between each `expect`.
- Read variables with `env('NAME')` inside the test, so a missing one fails only that test.
- Type what you read from a response (`(await response.json()) as Token`).
- Shared code goes in `support/` (data generators, `env`, fixtures) and stays small. No Page Objects.

**Data**

- Each test creates what it needs (`newUser()`), never depends on another test or on data "already there".
- Unique values for whatever cannot repeat (CPF, e-mail, device, push token).
- The `e2e` marker goes where the app allows it: the wallet rejects `+` in e-mails and digits in names, so e-mails are `e2e.<id>@emcash.test`.
- **Never send SMS or e-mail to someone real.** Staging sends them for real: only `@emcash.test` e-mails and agreed test cellphones.
- Credentials come from the environment, never from the code. Codes sent by SMS or e-mail are read from the service's database (`walletDb`).

**Checks**

- API: `await expect(response).toBeOK()` prints the body on failure. When the exact status matters, `expect(response.status(), await response.text()).toBe(200)`.
- Check what the app relies on (the error `code`, `completar_cadastro`), not only the status. Prove a token works by using it once.
- Cover the cheap negative cases that protect a rule (e.g. registration without a confirmed SMS).
- UI: use the text the user sees. Text matches by substring, case-insensitive (`getByLabel('Senha')` also finds "Confirmar senha"): use `{ exact: true }`. A locator must find one element; if it finds two, narrow it to a region instead of `.first()`. Act where the user would.
- Check what should appear, not only what should not. Never `sleep` or `waitForTimeout`: actions and `expect` already wait.

## 4. Run it, and fix it

```bash
docker compose run --rm tests npx playwright test tests/<product>/<file>.spec.ts
```

Failing the first few times is normal. Open `test-results/<test>/error-context.md` (error, failing step, and for UI what was on screen); the full step-by-step is in the `trace.zip` next to it (`npx playwright show-trace` or [trace.playwright.dev](https://trace.playwright.dev)).

| Error | Usually means | Fix |
|---|---|---|
| `toBeOK() failed` | The body says why, e.g. `"Nome do usuário poderá ter apenas letras"` | Fix the data, and add the rule to the service's `docs/` file |
| `strict mode violation` | Two elements matched | Narrow to a region, or `{ exact: true }` |
| Timeout waiting for a locator | Wrong role (a `button`, not a `menuitem`) | Use the role `error-context.md` shows |
| A check failed, but the app looks right | The locator found a different element | Check in the trace **what** it found |

## 5. Make it fail on purpose

Skip an essential step, send a wrong code, or change the expected text: the test **must fail**. If it still passes, it tests nothing. Then put it back.

## 6. Check stability

Run it 2 or 3 times, with a pause between runs (rate limits). A flaky test is worse than none: the team starts ignoring alerts. Then run the whole suite: `docker compose run --rm tests`.

## 7. Open the PR

- [ ] It fails when the scenario breaks (step 5) and passed in more than one run (step 6).
- [ ] The name says what it checks; code in English; no comments.
- [ ] `npm run typecheck` and `npm run lint` pass.
- [ ] It sends SMS or e-mail? Only `@emcash.test` and agreed test cellphones. It logs in or registers? It counts toward the service's rate limit.

## 8. When it fails on CI

Download the `playwright-report` artifact from the run page, open `error-context.md` and classify the failure:

| What happened | What to do |
|---|---|
| **The app broke** | The test did its job: open a bug for the service's team, with the trace |
| **The app changed on purpose** | Update the test |
| **Environment or limit** (staging down, rate limit) | Do not touch the test; fix the environment |
