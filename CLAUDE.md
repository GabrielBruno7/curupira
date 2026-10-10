# CLAUDE.md

Testes end-to-end com o [Playwright](https://playwright.dev) (`@playwright/test`, TypeScript). Este repo **só testa**: a aplicação fica em outro repo, e os testes a acessam por uma URL (`APP_URL`, vinda do `.env` ou da variável do CI).

**Nunca aponte os testes para um ambiente com dados reais:** eles criam dados. Use um ambiente de teste local ou o staging.

## Comandos

```bash
docker compose run --rm --build tests                                       # roda tudo contra o APP_URL
docker compose run --rm tests npx playwright test tests/<arquivo>.spec.ts   # um teste só
```

Rode pelo Docker: a imagem oficial do Playwright já traz o Node 24 e o Chromium. O `--build` só é necessário quando o `package.json` muda. O app **não** sobe aqui: ele precisa estar no ar antes. Rodando na máquina, use `host.docker.internal` no lugar de `localhost` no `APP_URL`.

## Criar ou alterar um teste

- Siga **todos** os passos de [COMO-CRIAR-UM-TESTE.md](COMO-CRIAR-UM-TESTE.md), inclusive o 5 (fazer o teste falhar de propósito). Um teste só está pronto depois disso.
- Respeite [BOAS-PRATICAS.md](BOAS-PRATICAS.md).
- Parta de [`exemplos/modelo.spec.ts`](exemplos/modelo.spec.ts): um teste legível de cima a baixo, com os passos em comentários. Não crie abstrações (Page Objects, helpers) sem pedir.

## Armadilhas da ferramenta

- **Idioma e fuso** estão fixos no `playwright.config.ts` (`pt-BR`, `America/Sao_Paulo`). Não remova: o container vem em inglês/UTC.
- **O texto é comparado por pedaço, sem diferenciar maiúsculas:** `getByLabel('Senha')` também acha "Confirmar senha". Use `{ exact: true }` quando precisar do texto inteiro.
- **Uma busca precisa achar exatamente um elemento.** Se achar dois (`strict mode violation`), restrinja a busca a uma região, em vez de usar `.first()`.
- **Versão do Playwright:** a do `package.json`, a do `Dockerfile` e a do workflow do CI precisam ser a mesma.
- **Dados únicos:** e-mails e outros valores que não podem se repetir levam `Date.now()`, com prefixo `e2e`.
- **Nunca use `sleep` nem `waitForTimeout`:** ações e `expect` já esperam sozinhos.

## Armadilhas do app testado

<!-- Preencha ao começar a testar o app: limites de login/SMS/API (e a mensagem que
     aparece quando estouram), elementos difíceis de clicar, telas que abrem sozinhas etc. -->

Ainda nenhuma registrada.

## Quando um teste falha

Leia `test-results/<teste>/error-context.md` **antes** de mexer no teste: ele mostra o erro e o que estava na tela no momento da falha. O passo a passo completo fica no `trace.zip`, na mesma pasta. Classifique a falha:

- **a app quebrou**: relate ao usuário, não mude o teste para passar;
- **a app mudou de propósito**: atualize o teste;
- **ambiente ou limite**: não mexa no teste.
