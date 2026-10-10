# Como criar um teste

O caminho de um teste, da ideia até rodar sozinho no CI. Os erros citados no passo 4 aconteceram de verdade na prova de conceito.

> Antes de começar, leia as [boas práticas](BOAS-PRATICAS.md).

## 1. Escrever o cenário em português

Antes de abrir o editor, escreva o teste como alguém faria à mão. Normalmente ele vem do critério de aceite da história ou de um bug que já aconteceu.

```
Dado    que tenho um item cadastrado
Quando  excluo o item
Então   ele some da lista e aparece a mensagem com "Desfazer"
Quando  toco em "Desfazer"
Então   o item volta para a lista
```

**Vale um teste e2e?** E2E é lento e caro de manter. Use para os **caminhos que, se quebrarem, o usuário sente**: login, cadastro, o fluxo principal. Regras detalhadas, como "valor máximo de R$ 1.000.000", ficam melhor nos testes unitários do time da aplicação.

## 2. Fazer à mão no ambiente de teste

Abra o app no endereço do `APP_URL` (nunca um ambiente com dados reais), faça o cenário clicando e anote:

- **os textos exatos** de cada botão, link e campo;
- **o que aparece no fim**, que vai virar a conferência;
- **o que pode atrapalhar**: tours ou avisos que abrem sozinhos, mensagens que somem, coisas que dependem de data.

**Para descobrir o nome de um elemento**: botão direito → **Inspecionar** → aba **Accessibility**. O *Role* e o *Name* que aparecem lá são o que vai no `getByRole('button', { name: 'Nome' })`.

**Atalho:** com Node na sua máquina, `npx playwright codegen <endereço>` abre o navegador e escreve o código enquanto você clica. Use como rascunho, não como teste pronto: ele não sabe o que conferir.

## 3. Transformar os passos em código

Crie uma branch e copie [`exemplos/modelo.spec.ts`](exemplos/modelo.spec.ts) para `tests/` (o nome precisa terminar em `.spec.ts`). Escreva **os passos como comentários primeiro**:

```ts
import { test, expect } from '@playwright/test';

test('excluir um item e desfazer', async ({ page }) => {
  // preparo: usuário novo com um item cadastrado
  // ir para a lista
  // abrir as ações do item e excluir
  // conferir: sumiu e apareceu "Desfazer"
  // desfazer
  // conferir: voltou
});
```

Depois preencha cada comentário com o que você anotou no passo 2. Se outro teste já tem o mesmo preparo (criar usuário, fazer login), copie de lá.

## 4. Rodar só esse teste, e corrigir

```bash
docker compose run --rm tests npx playwright test tests/<arquivo>.spec.ts
```

**É normal falhar nas primeiras vezes.** Leia a mensagem e abra `test-results/<nome-do-teste>/error-context.md`: lá está o erro e o que estava na tela. O passo a passo completo fica no `trace.zip` da mesma pasta (`npx playwright show-trace` ou [trace.playwright.dev](https://trace.playwright.dev)).

Os erros mais comuns:

| Erro | O que o trace costuma mostrar | Correção |
|---|---|---|
| `strict mode violation` | Dois elementos com o mesmo texto (ex.: um link no menu principal e outro no submenu), ou um texto contido em outro ("Senha" e "Confirmar senha") | Buscar **dentro** da região certa: `page.getByRole('navigation', { name: 'Submenu' }).getByRole('link', { name: 'Itens' })`, ou usar `{ exact: true }` |
| `Test timeout` esperando um locator | O elemento existe, mas com outro papel (era `button`, não `menuitem`) | Usar o papel que o `error-context.md` mostra: `getByRole('button', { name: 'Excluir' })` |
| `toBeHidden` falhou | A ação **funcionou**, mas o mesmo texto reapareceu em outro lugar (ex.: uma sugestão na lista vazia) | Conferir algo que **só o item cadastrado** tem, como o botão de ações dele |

O terceiro é o mais traiçoeiro: o app estava certo, mas o teste olhava para o elemento errado. Por isso, sempre confira no trace **o que** o locator encontrou.

## 5. Fazer o teste falhar de propósito

O passo mais esquecido. Quebre o cenário de propósito e confirme que o teste **falha**:

- comente um passo essencial (o `Desfazer`, por exemplo): o teste tem que falhar;
- ou troque o texto esperado por um errado.

Se continuar passando, o teste não está testando nada. Depois volte ao normal.

## 6. Conferir a estabilidade

Rode 2 ou 3 vezes, **com um intervalo entre as rodadas** (rate limit, veja as [boas práticas](BOAS-PRATICAS.md)). Passou sempre? Está estável. Falhou às vezes? Descubra o motivo antes de subir: um teste instável é pior que nenhum, porque o time passa a ignorar os alertas.

Por fim, rode a suíte inteira para ver que nada mais quebrou:

```bash
docker compose run --rm tests
```

## 7. Abrir o PR

- [ ] Passei pelas [boas práticas](BOAS-PRATICAS.md). Este teste faz login, cadastro ou envio? Então soma no rate limit.
- [ ] O teste falha quando o cenário quebra (passo 5).
- [ ] Passou em mais de uma rodada (passo 6).
- [ ] O nome do teste diz o que ele verifica.

Alguém revisa o PR, como acontece com código da aplicação. Depois do merge, o teste roda sozinho no próximo deploy em staging e todo dia às 6h.

## 8. Quando ele falhar no CI

Este é o trabalho do dia a dia. Baixe o artefato `playwright-report` na página da execução, abra o `error-context.md` (ou o trace) e classifique a falha:

| O que aconteceu | O que fazer |
|---|---|
| **A app quebrou** (o botão sumiu, deu erro) | O teste fez o trabalho dele: abra um bug para o time da aplicação, com o trace |
| **A app mudou de propósito** ("Excluir" virou "Remover") | Atualize o teste |
| **Ambiente ou limite** (staging fora do ar, rate limit) | Não mexa no teste; resolva o ambiente |
