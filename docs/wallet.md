# Wallet

What the tests need to know about the wallet (`wallet.em.cash`, PHP 8.4 / Yii2 API, MariaDB). The source is in the `emcash-team/wallet.em.cash` repo; locally, at `~/emcash/repos/wallet.em.cash`. Every fact here was checked in that source or by running the tests.

## Running it locally

`emcash_api` (port 80) and `emcash_db` (MariaDB, `root`/`admin`, database `dbapp`), from the emcash CLI:

```bash
cd ~/emcash
docker start emcash_db
docker compose -f docker-compose.dist.yml up -d --no-deps api
cd repos/wallet.em.cash && ./refresh-db.sh      # first time only: DROPS and recreates dbapp
```

In dev (`yiiEnv = dev`), SMS and e-mails are written to disk inside the container, never sent.

## ⚠️ Staging sends real SMS and e-mails

Staging runs with `yiiEnv = test` (`buildspec-staging.yml`), so SMS goes through Zenvia and e-mail through Sendgrid, for real. Any test that sends a code reaches a real phone and a real inbox. Before such a test runs on staging:

- e-mails must use a domain we control or the reserved `.test` TLD (`e2e.<id>@emcash.test`);
- cellphones must be test numbers agreed with the backend (a fixed OTP or an allowlist). Random numbers like the ones `newUser()` generates are real people's numbers.

## Endpoints used by the tests

| Step | Endpoint | Notes |
|---|---|---|
| Pre-registration check | `GET /cadastro/usuario/verificar?cpf=` | Only says whether the CPF has a multiportal pre-registration (`fluxo_pro_soluto`). It does **not** check whether the CPF is already registered |
| Send / confirm SMS code | `POST /usuario/sms/enviar`, `POST /usuario/sms/confirmar` | Code in `celular.codigo`, by `numero` |
| Send / confirm e-mail code | `POST /usuario/email/enviar`, `POST /cadastro/usuario/email/codigo/confirmar` | Code in `confirmacao_email.codigo`, by `email` |
| Register | `POST /cadastro/usuario/registrar` | Without a confirmed SMS code: 400, `code 4977` |
| Login | `POST /v3/login` | `usuario` (CPF), `senha`, `identificador` (device), `token` (push). `/login` and `/v2/login` are disabled |
| Profile | `GET /usuario` (Bearer) | `completar_cadastro` says whether the app asks for the additional information |
| Additional information | `POST /cadastro/usuario/informacoes-adicionais` (Bearer) | CEP, state and city should match (`estado.id_estado`, `cidade.id_cidade`) |

## Rules that bite

- **Names** accept letters only (no digits, so no "E2E").
- **E-mails** accept only `a-z 0-9 _ . -` before the `@`: no `+`, no uppercase.
- **Push token:** the part after `:` is the "partial token" and identifies one app install. Each device needs its own; reusing one from another device fails with `4274` "O registro do app está vinculado à outro dispositivo". Nobody may use the e2e test user from a real phone.
- **Devices:** a user's first device is accepted on login (200). Another device of an existing user gets **202** and a PIN request, with no token.
- **Bug (2026-10-10):** logging in **without** a push token on a device whose last login also had no token returns **500** ("No device identifier ... was updated"). The tests always send a token, like the app does.

## Rate limit

`Registrator::checkMaxRecords` counts requests per IP + User-Agent, on login **and** on every registration step:

- up to 1500 in dev, **500** elsewhere; `127.0.0.1` is exempt (so `curl` on the host behaves differently from the test container);
- the counter only resets after a full day **without any request** from that fingerprint, so with a fixed IP running every day it never resets;
- it trusts the `X-Forwarded-For` header.

The tests send `User-Agent: curupira-e2e`, so their counter is separate and easy to find (`cadastrador` table). One full run makes about 10 counted requests. Before CI runs daily, agree with the wallet team on an allowance for this fingerprint.

## Test data

- **Fixture users** (e.g. `89524508095` / `A234$6` / device `dispositivo_1`) exist only in the local database, never on staging.
- **New users** come from `newUser()` in `support/data.ts`: a random valid CPF, a random cellphone and `e2e.<id>@emcash.test`.
