# CLAUDE.md

Testes end-to-end da Trilha com o [e2e](https://e2e.tester.army) (TypeScript, Playwright por baixo). Este repo **só testa**: a aplicação fica em outro repo, e os testes a acessam por uma URL (`TRILHA_URL`).

**Nunca aponte os testes para um ambiente com dados reais:** eles criam contas. Localmente, use a Trilha de teste do `docker-compose.yml`; no CI, o staging.

## Comandos

```bash
docker compose run --rm --build tests                                # sobe a Trilha de teste e roda tudo
docker compose run --rm tests npx e2e run tests/<arquivo>.e2e.ts     # um teste só
docker compose down                                                  # apaga a Trilha de teste
```

Rode pelo Docker: o `e2e` exige Node ≥ 22.22.3 ou 24, e a imagem já traz o Node 24 e o Chromium. O `--build` só é necessário quando o `package.json` muda.

## Criar ou alterar um teste

- Siga **todos** os passos de [COMO-CRIAR-UM-TESTE.md](COMO-CRIAR-UM-TESTE.md), inclusive o 5 (fazer o teste falhar de propósito). Um teste só está pronto depois disso.
- Respeite [BOAS-PRATICAS.md](BOAS-PRATICAS.md).
- Mantenha o estilo dos testes existentes: um teste legível de cima a baixo, com os passos em comentários. Não crie abstrações (Page Objects, helpers) sem pedir.

## Armadilhas já conhecidas

- **Rate limit:** a Trilha aceita até 20 logins/cadastros por minuto por IP, e até 5 senhas erradas por e-mail. Espere **60 s entre rodadas** da suíte. "Muitas tentativas. Aguarde um pouco e tente de novo." no trace é esse limite: **não é bug**, não "corrija" o teste por causa dele.
- **Dados únicos:** e-mails sempre `e2e+${Date.now()}@teste.com`.
- **URL sem `#`:** `app.url` não aceita fragmento. Para abrir uma tela, use `app.open('/#entrar')`.
- **Idioma e fuso** estão fixos no `e2e.config.ts` (`pt-BR`, `America/Sao_Paulo`). Não remova: sem isso o app abre em inglês.
- **O texto é comparado inteiro e exato**, e uma busca precisa achar exatamente um elemento. Se achar dois (`LOCATOR_AMBIGUOUS`), restrinja a busca a uma região, em vez de usar `.first()`.
- **Checkbox de hábito:** toque no nome do hábito, não no checkbox (ele fica coberto por um elemento decorativo).
- **Nunca use `sleep`:** ações e `expect` já esperam sozinhos.

## Quando um teste falha

Leia `.e2e/results/<teste>/trace.md` **antes** de mexer no teste: ele mostra cada passo e cada texto da tela. Classifique a falha:

- **a app quebrou**: relate ao usuário, não mude o teste para passar;
- **a app mudou de propósito**: atualize o teste;
- **ambiente ou limite**: não mexa no teste.
