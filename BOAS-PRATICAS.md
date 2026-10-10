# Boas práticas

Leia antes de escrever ou alterar um teste. Cada item aqui veio de um problema real.

## ⚠️ Rate limits: o app se protege dos testes também

Os testes usam o app como um usuário, mas fazem isso muito mais rápido e muitas vezes seguidas. As proteções contra abuso do app não diferenciam teste de ataque. Na prova de conceito, por exemplo, testes passaram a falhar com "Muitas tentativas" ao estourar um limite de logins por minuto por IP.

**Antes de testar um app, pergunte ao time dele quais limites existem** (login, cadastro, envio de SMS/e-mail, APIs externas) e registre aqui:

| Limite | O que acontece | Como evitar |
|---|---|---|
| *(a levantar)* | | |

**Ao adicionar um teste:**

- **Conte quantos logins, cadastros ou envios a suíte faz.** Cada teste novo soma mais. Perto do limite, a suíte começa a falhar sozinha.
- **Teste falhando pelo limite** não é bug do app nem do teste. Confira no `error-context.md` (veja [Quando um teste falha](#quando-um-teste-falha)).
- **Não rode a suíte várias vezes seguidas** para caçar instabilidade. Espere entre as rodadas.
- **Quando a suíte crescer**, combine com o time da aplicação um limite maior no staging, ou uma liberação para o IP dos testes. Não desligue a proteção em produção.

## Dados

- **Cada teste cria o que precisa.** Não dependa de outro teste ter rodado antes nem de dados "que já estão lá".
- **Dados de teste sempre com o prefixo `e2e`** (e-mails `e2e+...@teste.com`, nomes `E2E ...`). Assim é possível achá-los e apagá-los no staging.
- **Valores únicos** (`Date.now()`) para tudo que o app exige que não se repita, e para não esbarrar nos limites por usuário.
- **Nunca aponte os testes para um ambiente com dados reais.** Eles criam dados.

## Encontrar elementos

- **Use os textos que o usuário vê**: `getByRole('button', { name: 'Entrar' })`, `getByLabel('E-mail')`. O teste se lê como um passo a passo manual.
- **O texto é comparado por pedaço e sem diferenciar maiúsculas**: `getByLabel('Senha')` também acha "Confirmar senha". Para o texto inteiro, use `{ exact: true }`.
- **Uma busca precisa achar um elemento só.** Achou dois (`strict mode violation`)? Restrinja a uma região (`page.getByRole('navigation').getByRole('link', ...)`), em vez de usar `.first()`.
- **Aja como o usuário age.** Se um elemento fica coberto por outro (um checkbox estilizado, por exemplo), toque onde a pessoa tocaria, como o texto ao lado.
- **Idioma e fuso são fixados no `playwright.config.ts`** (`pt-BR`, `America/Sao_Paulo`). Sem isso o app pode abrir em inglês no CI, e "hoje" pode ser outro dia.

## Esperas e conferências

- **Nunca use `sleep` nem `page.waitForTimeout`.** As ações e o `expect` já esperam sozinhos.
- **Todo teste termina conferindo algo** (`expect`). Teste que só clica não testa nada.
- **Confira o que deve aparecer**, não só o que não deve: um `.not.toBeVisible()` com o texto errado passa sem testar nada.

## Quando um teste falha

1. Leia a mensagem no terminal: ela mostra a linha e o que estava na tela.
2. Abra `test-results/<nome-do-teste>/error-context.md`: o erro e o que estava na tela. Para o passo a passo completo, abra o `trace.zip` da mesma pasta com `npx playwright show-trace` ou em [trace.playwright.dev](https://trace.playwright.dev).
3. No CI, baixe o artefato `playwright-report` na página da execução.
4. Antes de mudar o teste, pergunte se ele achou um problema de verdade.
