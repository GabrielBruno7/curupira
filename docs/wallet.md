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

## Consignado (payroll loan)

The private-sector consignado ("Crédito do Trabalhador", via Dataprev) is **not** created by the app. **Hermes** (`emcash-team/hermes`, Go; locally `~/emcash/repos/hermes`) talks to the borrower over WhatsApp (Blip) and to Dataprev (margin, employment bond, endorsement) and Clicksign, then calls the wallet server to server (`hermes/internal/adapters/wallet/Endpoints.go`). The tests pretend to be Hermes.

- The `/consignado/*` routes have **no authentication** (`TokenFilter` skips them) and exist when `CONSIGNADO_SYSTEM_ENV`, `YII_ENV_TEST` or `YII_ENV_DEV` is set, so locally and on staging. `/controle/consignado/emprestimo` is an alias.
- Hermes calls them in this order: `GET /consignado/emprestimo/simular` → `POST /consignado/emprestimo` → `PATCH .../documentos` (signed CCB, selfie) → `PATCH .../mercado-investimento` (grant and PIX) → `PATCH .../cancelar` if the endorsement fails.

| Step | Endpoint | Notes |
|---|---|---|
| Simulate | `GET /consignado/emprestimo/simular?valor=&prazo=&seguro=&taxa_juros=` | Same calculation as the creation, without saving |
| Create | `POST /consignado/emprestimo` | `tomador_*` fields plus `emprestimo_valor_liberado`, `emprestimo_quantidade_parcelas`, `emprestimo_seguro`, `emprestimo_numero_proposta_dataprev` (becomes `numero_proposta_externo`) and `taxa_juros` (monthly, overrides the loan group's). Dates come back as `ddmmyyyy`. The response has **no loan id**: find it by CPF + `numero_proposta_externo` |
| Cancel | `PATCH /consignado/emprestimo/cancelar` | `tomador_cpf`, `numero_proposta_externo`. Only from `compromisso_pendente`; it also deactivates the borrower's loan group link |

What the creation does, in one transaction:
- creates or updates the borrower by CPF: `tipo='tomador'`, `ativo`, `finalizado`, `fluxo_cadastro='novo_consignado'`, no prior registration needed;
- links them to the "Novo Consignado" loan group (`50d93655-fcac-4336-bbd5-89015f04ef7f`, from the seed: R$ 2,000 to 30,000, 3 to 60 installments, due day 25, cut-off day 21);
- creates `emprestimo` (`modalidade='consignado'`, `status='compromisso_pendente'`) and its `emprestimo_parcela` rows, and writes the CCB PDF (to `/opt/docs/` in dev, the S3 test bucket on staging);
- sends **no** SMS, e-mail or push and calls no partner. Those happen only at the grant (`mercado-investimento`: Bankly PIX, Sendgrid, Zenvia, IBGE).

The calculation (`Loan::calculate()`) depends on today's date and the holiday calendar (grant in 3 business days, first due date on the 25th two or three months later), so tests check it with a tolerance instead of fixed values:
- `valor_investimento` = released value + IOF (insurance is always 0, even with `emprestimo_seguro=true`);
- `valor_parcela` = Price over `valor_investimento × (1+i)^((carencia − 30)/30)`;
- `valor_financiado` is the **sum of the installments**, not the financed principal;
- each installment's `valor_principal` is its present value, so they add up to `valor_investimento`;
- installments always fall on the 25th, even on weekends and holidays. Only `emprestimo.ultimo_vencimento` moves to the next business day (`2028-11-25` → `2028-11-27`).

Rejections:
- a second proposal for a CPF whose first one is still active: 400, `code 4457` "Usuário vinculado a mais de um grupo de empréstimo ativo" (the linked loan group check fires before the "loan in progress" one);
- installments out of range: `4070` "Quantidade de parcelas menor que o mínimo" / `4071` "... maior que o máximo";
- `tomador_cidade` must match a `cidade.nome` exactly.

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
