# Boas práticas

Leia antes de escrever ou alterar um teste. Cada item aqui veio de um problema real deste projeto.

## ⚠️ Rate limits: o app se protege dos testes também

Os testes usam o app como um usuário, mas fazem isso muito mais rápido e muitas vezes seguidas. As proteções contra abuso do app não diferenciam teste de ataque.

A Trilha tem hoje dois limites:

| Limite | O que acontece | Como evitar |
|---|---|---|
| **5 senhas erradas** no mesmo e-mail em 15 min | "Muitas tentativas. Aguarde um pouco e tente de novo." | Nunca repita o mesmo e-mail num teste de erro: use `e2e+${Date.now()}@teste.com` |
| **20 logins/cadastros por minuto** vindos do mesmo IP | A mesma mensagem, para qualquer e-mail | Cuidado ao adicionar testes que façam login ou cadastro (veja abaixo) |

**Ao adicionar um teste:**

- **Conte quantos logins ou cadastros a suíte faz.** Hoje são 4 por execução. Cada teste novo que cria conta soma mais um. Perto de 20, a suíte começa a falhar sozinha.
- **Teste falhando com "Muitas tentativas"** não é bug do app nem do teste: é o limite. Confira no `trace.md` (veja [Quando um teste falha](#quando-um-teste-falha)).
- **Não rode a suíte várias vezes seguidas** para caçar instabilidade. Espere um minuto entre as rodadas.
- **Quando a suíte crescer**, combine com o time da aplicação um limite maior no staging, ou uma liberação para o IP dos testes. Não desligue a proteção em produção.

O mesmo vale para outros sistemas da empresa: antes de testar um, pergunte quais limites ele tem (login, envio de SMS/e-mail, APIs externas).

## Dados

- **Cada teste cria o que precisa.** Não dependa de outro teste ter rodado antes nem de dados "que já estão lá".
- **Dados de teste sempre com o prefixo `e2e+`** (e-mails, nomes). Assim é possível achá-los e apagá-los no staging.
- **Valores únicos** (`Date.now()`) para tudo que o app exige que não se repita.
- **Nunca aponte os testes para um ambiente com dados reais.** Eles criam contas.

## Encontrar elementos

- **Use os textos que o usuário vê**: `getByRole('button', 'Entrar')`, `getByLabel('E-mail')`. O teste se lê como um passo a passo manual.
- **O texto é comparado inteiro e exato**: `'Senha'` não encontra `'Confirmar senha'`. Para um pedaço do texto, use RegExp: `/senha incorretos/`.
- **Aja como o usuário age.** Na Trilha o checkbox do hábito fica escondido atrás de um quadradinho decorado, então o teste toca no nome do hábito, como a pessoa faria.
- **Idioma e fuso são fixados no `e2e.config.ts`** (`pt-BR`, `America/Sao_Paulo`). Sem isso o app abre em inglês no CI, e "hoje" pode ser outro dia.

## Esperas e conferências

- **Nunca use `sleep`.** As ações e o `expect` já esperam sozinhos.
- **Todo teste termina conferindo algo** (`expect`). Teste que só clica não testa nada.
- **Confira o que deve aparecer**, não só o que não deve: um `.not.toBeVisible()` com o texto errado passa sem testar nada.

## Quando um teste falha

1. Leia a mensagem no terminal: ela mostra a linha e o que estava na tela.
2. Abra `.e2e/results/<nome-do-teste>/trace.md`. É o passo a passo, com cada texto que apareceu na tela. Foi assim que o "Muitas tentativas" apareceu.
3. No CI, baixe o artefato `e2e-report` na página da execução.
4. Antes de mudar o teste, pergunte se ele achou um problema de verdade.
