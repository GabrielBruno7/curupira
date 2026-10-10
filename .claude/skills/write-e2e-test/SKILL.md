---
name: write-e2e-test
description: Create a new end-to-end test in curupira for a user journey (e.g. "the BTG proposal", "PIX transfer", "login on the portal"). Researches the flow in the services' source while interviewing the user grill-style, agrees on the scenario, then writes, runs and breaks the test on purpose. Use when the user asks to create, write or add an e2e test or to "test the flow of X".
---

# Write an e2e test

You turn a journey into a working test in four phases: **research and interview** (in parallel), **agree**, **build**, **report**. Talk to the user in their language; everything written in the repo is in English (see `CLAUDE.md`).

Before anything, read `CLAUDE.md`, `WRITING-A-TEST.md`, `PLAN.md` and every file in `docs/`. They hold the rules, the decisions already made, and what is known about each service. Never re-ask something they already answer.

## Phase 1 — Research and interview, at the same time

### Research (sub-agents, in the background)

Facts are your job, never the user's. As soon as the user names the journey, dispatch `Explore` sub-agents in parallel, one per question, and keep interviewing while they run. Typical questions:

- **Which services and repos** the journey goes through. Start from the emcash CLI (`~/emcash/scripts/core/arrays.sh`, `REPO_ENTRIES`) and the repos in `~/emcash/repos/`. If a repo is not cloned, report it; cloning is the user's decision.
- **The endpoints, in order**, with their required fields, from the routes and controllers (e.g. the wallet's `config/routes.php` and `controllers/`).
- **The service's own tests** for this flow (e.g. the wallet's `tests/acceptance/`): they are the best map of request bodies and expected responses.
- **Side effects:** SMS, e-mail, push, calls to partners (BTG, Dataprev, bureaus…), and how each behaves in dev vs. staging (e.g. `yiiEnv`, factories that write to disk in dev).
- **Verification codes / OTP:** where they are stored, so the test can read them (`walletDb` already reads SMS and e-mail codes).
- **Validation rules and limits** that will bite: field formats, rate limits, states the data must be in.
- **Existing test data** that could be reused locally (fixtures), and what would be needed on staging.

Sub-agents are read-only: they never change a service repo, a database or a container. A running exploration is an unsettled prerequisite: only the questions that depend on it wait.

### Interview (grill-style rounds)

Map the test as a **design tree** and ask in **rounds**. Each round asks the whole **frontier**: every decision whose prerequisites are settled. Number each question, give your recommended answer, and word it so "yes" accepts the recommendation:

```
❓ **Q1** - **<title>**: <question, with the options>

➡️ <recommended answer, and why, citing what the research found>
```

Wait for the answers, recompute the frontier, ask the next round. A question that depends on another one still open belongs to a later round. The branches to cover, skipping what `PLAN.md` or `docs/` already settle:

1. **Scope:** where the journey starts and ends; what is out of it.
2. **Layer:** API (what the app calls) or UI (a portal, through the browser), or both.
3. **Environment:** local first? Which services must be up, and how to start them (`docs/<service>.md`).
4. **Data:** a brand new user (`newUser()`), an existing one, or a special state (pre-registration, a loan…)? How the test creates it.
5. **Partners:** for each external call, simulate it through an existing endpoint (`// here we pretend to be <partner>`), or does the test stop before it?
6. **Verification codes:** read from the database, or a fixed OTP?
7. **What proves success:** the exact fields and states checked at the end (not only status codes).
8. **Negative cases:** which cheap rejections protect a rule.
9. **Side effects on staging:** does it send SMS, e-mail or call a partner for real? What must exist before it can run there (`PLAN.md`, "Before the first staging run").
10. **Placement:** folder (follow the current suggestion in `CLAUDE.md` until QA decides), file name, and whether new `support/` code is needed (only with the user's approval).

## Phase 2 — Agree

When the frontier is empty, present the shared understanding and **wait for confirmation** before writing code:

- the scenario in Given/When/Then;
- the `test.step` names, in order, each with its endpoint or screen;
- the data, the checks, the negative cases;
- what is simulated, what is left out, and the prerequisites for staging.

## Phase 3 — Build

Follow `WRITING-A-TEST.md` from step 3 on, strictly:

1. Copy the right template from `examples/` to `tests/<folder>/<name>.spec.ts`; write the steps as empty `test.step`s, then fill them in following the style rules.
2. Run only this file. On failure, read `error-context.md`, classify (**app broke** / **app changed** / **environment**) and only fix the test when the test is wrong. An app bug is reported to the user, never worked around silently.
3. **Make it fail on purpose** (step 5): break at least one essential step and confirm the test fails at the right step with a useful message. Restore it.
4. Run it 2 or 3 times, then the whole suite. Run `npm run typecheck` and `npm run lint`.
5. Add every new fact about a service to its `docs/<service>.md` (endpoints, rules, limits, bugs). Add new prerequisites or open items to `PLAN.md`.

Do not run anything destructive (e.g. a database refresh) or anything against staging without asking.

## Phase 4 — Report

Tell the user, briefly: what the test covers, the results (including the fail-on-purpose evidence), bugs or surprises found in the app, what was simulated or left out, and what is still needed before it can run on staging. Do not commit unless the user asks.
