# Writing a test

The path of a test, from the idea to running on its own on CI. The errors listed in step 4 really happened in the proof of concept.

> Before you start, read the [best practices](BEST-PRACTICES.md).

## 1. Write the scenario in plain words

Before opening the editor, write the test the way someone would do it by hand. It usually comes from a story's acceptance criteria or from a bug that already happened.

```
Given   a new user who confirmed the cellphone and the e-mail
When    they register and log in for the first time
Then    the app asks for the additional information
When    they send the additional information
Then    the registration is complete
```

**Is it worth an e2e test?** E2E is slow and expensive to maintain. Use it for the **paths the user feels when they break**: login, sign-up, the main flow. Detailed rules, like "maximum amount of R$ 1,000,000", belong in the application team's unit tests.

## 2. Do it by hand in the test environment

Go through the scenario in the test environment (never an environment with real data): in the app or portal for a UI test, or with `curl` for an API test. Before testing a service, read its file in `docs/`. Write down:

- **the exact text** of each button, link and field;
- **what shows up at the end**, which becomes the check;
- **what can get in the way**: tours or notices that open on their own, messages that disappear, things that depend on the date.

**To find an element's name**: right click → **Inspect** → **Accessibility** tab. The *Role* and *Name* shown there are what goes in `getByRole('button', { name: 'Name' })`.

**Shortcut:** with Node on your machine, `npx playwright codegen <address>` opens the browser and writes code while you click. Use it as a draft, not as a finished test: it does not know what to check.

**API test?** Find out what the app sends (the API docs, the app team, or the service's own tests, like the wallet's `tests/acceptance/`) and try it with `curl` first.

## 3. Turn the steps into code

Create a branch and copy [`examples/api-template.spec.ts`](examples/api-template.spec.ts) or [`examples/web-template.spec.ts`](examples/web-template.spec.ts) to `tests/<product>/` (the name must end in `.spec.ts`). For now the folder is the product where the user starts the journey, even if it goes through several services (the final organization is up to QA). Write **the steps first, as empty `test.step`s**:

```ts
import { test, expect } from '../../support/fixtures';

test('simplified registration up to the additional information', { tag: '@api' }, async ({ request }) => {
  await test.step('confirm the cellphone and the e-mail', async () => {});

  await test.step('register the user', async () => {});

  await test.step('log in on the first device', async () => {});

  await test.step('the app asks for the additional information', async () => {});

  await test.step('send the additional information', async () => {});

  await test.step('the registration is complete', async () => {});
});
```

Then fill in each step with what you wrote down in step 2, following the code style in [CLAUDE.md](CLAUDE.md#code-style) (comments only for *why*, one field per line). Use `newUser()` for test data and the `walletDb` fixture for verification codes; [`tests/app/registration.spec.ts`](tests/app/registration.spec.ts) is the full example.

## 4. Run just this test, and fix it

```bash
docker compose run --rm tests npx playwright test tests/<product>/<file>.spec.ts
```

**Failing the first few times is normal.** Read the message and open `test-results/<test-name>/error-context.md`: it has the error and what was on screen. The full step-by-step is in the `trace.zip` in the same folder (`npx playwright show-trace` or [trace.playwright.dev](https://trace.playwright.dev)).

The most common errors:

| Error | What the trace usually shows | Fix |
|---|---|---|
| `strict mode violation` | Two elements with the same text (e.g. a link in the main menu and another in a submenu), or one text inside another ("Senha" and "Confirmar senha") | Search **inside** the right region: `page.getByRole('navigation', { name: 'Submenu' }).getByRole('link', { name: 'Itens' })`, or use `{ exact: true }` |
| `Test timeout` waiting for a locator | The element exists, but with another role (it was a `button`, not a `menuitem`) | Use the role `error-context.md` shows: `getByRole('button', { name: 'Excluir' })` |
| `toBeOK() failed` on an API call | The response body, e.g. `"Nome do usuário poderá ter apenas letras"` | Fix the data the test sends, and write the rule in the service's `docs/` file |
| `toBeHidden` failed | The action **worked**, but the same text showed up somewhere else (e.g. a suggestion in the empty list) | Check something **only the created item** has, like its actions button |

The third is the trickiest: the app was right, but the test was looking at the wrong element. That is why you always check in the trace **what** the locator found.

## 5. Make the test fail on purpose

The most forgotten step. Break the scenario on purpose and confirm the test **fails**:

- skip an essential step (e.g. the additional information), or send a wrong code or password: the test must fail;
- or change the expected text to a wrong one.

If it still passes, the test is not testing anything. Then put it back.

## 6. Check stability

Run it 2 or 3 times, **with a pause between runs** (rate limits, see the [best practices](BEST-PRACTICES.md)). Always passed? It is stable. Failed sometimes? Find out why before pushing: a flaky test is worse than none, because the team starts ignoring the alerts.

Finally, run the whole suite to see nothing else broke:

```bash
docker compose run --rm tests
```

## 7. Open the PR

- [ ] I went through the [best practices](BEST-PRACTICES.md). Does this test log in, sign up or send something? Then it counts toward the rate limit.
- [ ] The test fails when the scenario breaks (step 5).
- [ ] It passed in more than one run (step 6).
- [ ] The test name says what it checks.
- [ ] Code and test names are in English; comments only say *why*.
- [ ] `npm run typecheck` and `npm run lint` pass.
- [ ] Does it send SMS or e-mail? Then it only uses `@emcash.test` e-mails and agreed test cellphones on staging.

Someone reviews the PR, like application code. After the merge, the test runs on its own on the next staging deploy.

## 8. When it fails on CI

This is the day-to-day work. Download the `playwright-report` artifact from the run page, open `error-context.md` (or the trace) and classify the failure:

| What happened | What to do |
|---|---|
| **The app broke** (the button is gone, it returned an error) | The test did its job: open a bug for the application team, with the trace |
| **The app changed on purpose** ("Excluir" became "Remover") | Update the test |
| **Environment or limit** (staging down, rate limit) | Do not touch the test; fix the environment |
