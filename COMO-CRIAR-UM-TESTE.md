# Como criar um teste

O caminho de um teste, da ideia até rodar sozinho no CI. O exemplo é real: [`tests/excluir-habito.e2e.ts`](tests/excluir-habito.e2e.ts) foi criado seguindo exatamente estes passos, e os erros que aparecem aqui aconteceram de verdade.

> Antes de começar, leia as [boas práticas](BOAS-PRATICAS.md).

## 1. Escrever o cenário em português

Antes de abrir o editor, escreva o teste como alguém faria à mão. Normalmente ele vem do critério de aceite da história ou de um bug que já aconteceu.

```
Dado    que tenho o hábito "Abrir a janela"
Quando  excluo o hábito
Então   ele some da lista e aparece a mensagem com "Desfazer"
Quando  toco em "Desfazer"
Então   o hábito volta para a lista
```

**Vale um teste e2e?** E2E é lento e caro de manter. Use para os **caminhos que, se quebrarem, o usuário sente**: login, cadastro, o fluxo principal. Regras detalhadas, como "valor máximo de R$ 1.000.000", ficam melhor nos testes unitários do time da aplicação.

## 2. Fazer à mão no ambiente de teste

```bash
docker compose up -d     # Trilha de teste em http://localhost:48300
```

Faça o cenário clicando, e anote:

- **os textos exatos** de cada botão, link e campo ("Hábitos", "Ações de Abrir a janela", "Excluir", "Desfazer");
- **o que aparece no fim**, que vai virar a conferência;
- **o que pode atrapalhar**: o tour que abre sozinho, mensagens que somem, coisas que dependem de data.

**Para descobrir o nome de um elemento**: botão direito → **Inspecionar** → aba **Accessibility**. O *Role* e o *Name* que aparecem lá são o que vai no `getByRole('button', 'Nome')`.

## 3. Transformar os passos em código

Crie uma branch e o arquivo em `tests/` (o nome precisa terminar em `.e2e.ts`). Escreva **os passos como comentários primeiro**:

```ts
import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('excluir um hábito e desfazer', async ({ app, screen }) => {
  // preparo: conta nova com o hábito "Abrir a janela"
  // ir para Hábitos
  // abrir as ações do hábito e excluir
  // conferir: sumiu e apareceu "Desfazer"
  // desfazer
  // conferir: voltou
});
```

Depois preencha cada comentário com o que você anotou no passo 2. O preparo (criar conta, escolher o hábito) é igual ao dos outros testes: copie de lá.

## 4. Rodar só esse teste, e corrigir

```bash
docker compose run --rm tests npx e2e run tests/excluir-habito.e2e.ts
```

**É normal falhar nas primeiras vezes.** Leia a mensagem e abra `.e2e/results/<nome-do-teste>/trace.md`: lá está cada passo e cada texto que apareceu na tela.

Este exemplo falhou três vezes antes de passar:

| Erro | O que o trace mostrou | Correção |
|---|---|---|
| `LOCATOR_AMBIGUOUS` em `getByRole('link', 'Hábitos')` | Dois links "Hábitos": um no menu `Principal` (a área), outro em `Seções de hábitos` (a tela) | Buscar **dentro** do menu certo: `getByRole('navigation', 'Seções de hábitos').getByRole('link', 'Hábitos')` |
| `LOCATOR_NOT_FOUND` em `getByRole('menuitem', 'Excluir')` | Era `button "Excluir"`, não `menuitem` | `getByRole('button', 'Excluir')` |
| `toBeHidden` falhou em `getByText('Abrir a janela')` | O hábito **foi** excluído, mas com a lista vazia o app mostra sugestões, e uma delas é um botão "Abrir a janela" | Conferir algo que **só o hábito cadastrado** tem: `getByRole('button', 'Ações de Abrir a janela')` |

O terceiro é o mais traiçoeiro: o app estava certo, mas o teste olhava para o elemento errado. Por isso, sempre confira no trace **o que** o locator encontrou.

## 5. Fazer o teste falhar de propósito

O passo mais esquecido. Quebre o cenário de propósito e confirme que o teste **falha**:

- comente o `Desfazer`: o teste tem que falhar, porque o hábito não volta;
- ou troque o texto esperado por um errado.

Se continuar passando, o teste não está testando nada. Depois volte ao normal.

## 6. Conferir a estabilidade

Rode 2 ou 3 vezes, **com um minuto entre as rodadas** (rate limit, veja as [boas práticas](BOAS-PRATICAS.md)). Passou sempre? Está estável. Falhou às vezes? Descubra o motivo antes de subir: um teste instável é pior que nenhum, porque o time passa a ignorar os alertas.

Por fim, rode a suíte inteira para ver que nada mais quebrou:

```bash
docker compose run --rm tests
```

## 7. Abrir o PR

- [ ] Passei pelas [boas práticas](BOAS-PRATICAS.md). Este teste cria conta? Então a suíte faz um cadastro a mais por execução.
- [ ] O teste falha quando o cenário quebra (passo 5).
- [ ] Passou em mais de uma rodada (passo 6).
- [ ] O nome do teste diz o que ele verifica.

Alguém revisa o PR, como acontece com código da aplicação. Depois do merge, o teste roda sozinho no próximo deploy em staging e todo dia às 6h.

## 8. Quando ele falhar no CI

Este é o trabalho do dia a dia. Baixe o artefato `e2e-report` na página da execução, abra o `trace.md` e classifique a falha:

| O que aconteceu | O que fazer |
|---|---|
| **A app quebrou** (o botão sumiu, deu erro) | O teste fez o trabalho dele: abra um bug para o time da aplicação, com o trace |
| **A app mudou de propósito** ("Excluir" virou "Remover") | Atualize o teste |
| **Ambiente ou limite** (staging fora do ar, "Muitas tentativas") | Não mexa no teste; resolva o ambiente |
