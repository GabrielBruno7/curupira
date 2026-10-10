# Plano: regressão e2e na Emcash

Este repo nasceu como **prova de conceito** (testando um app pessoal, para validar o jeito de trabalhar) e agora é a base genérica para os testes da Emcash.
Este documento diz como levar isso para a Emcash: o que já foi decidido, por quê, e o que ainda falta.

> Cada decisão tem o motivo ao lado. Antes de mudar uma, leia o motivo: provavelmente já foi discutido.

## Objetivo

Pegar **regressões** (coisas que funcionavam e pararam) nas **jornadas críticas** dos produtos, usando o sistema como um usuário: navegador, clique, conferência.

**Não é objetivo:**

- testar funcionalidade nova: isso é feito localmente pelo dev;
- substituir os testes unitários e de integração de cada serviço;
- cobrir regras detalhadas (ex.: "valor máximo de R$ 1.000.000"): ficam nos testes do serviço.

## Fases

| Fase | O que a suíte faz | Bug chega em prod? |
|---|---|---|
| **v1: observação** | Roda depois de cada merge na master e **avisa** no Slack. Prod sobe junto, sem esperar. Registra o que *teria* bloqueado. | Sim, por minutos ou horas, até ser revertido |
| **v2: gate** | master → staging → suíte → **prod só se verde**. | Não |

**Critério para passar da v1 para a v2:** 4 semanas com menos de 2% de testes instáveis **e** o pipeline de deploy separado em estágios (veja [Dependências](#dependências)).

⚠️ **A v1 detecta, não previne.** Se a v2 não tiver dono e prazo, o projeto fica como detector para sempre.

## Decisões

### Escopo e ferramenta

| Decisão | Motivo |
|---|---|
| A v1 cobre **uma jornada**: proposta BTG no multiportal, da simulação à aprovação | O caminho já é conhecido (automação no encore), e ela força resolver os problemas difíceis (OTP, estado, integrações) logo no começo |
| **`@playwright/test`** (a prova de conceito usou o `e2e`; já foi trocado) | O `e2e` está em 0.x, com telemetria ligada e comunidade pequena. O Playwright é o padrão de mercado: trace, relatório HTML/JUnit, retries, sharding |
| **Um repo de QA**, com **pastas por produto** (`multiportal/`, `360/`…) | Uma jornada passa por vários repos (front, backend, wallet); organizar por repo não tem onde colocá-la |
| Todo deploy roda **a suíte inteira** | É simples e funciona enquanto a suíte for pequena. Filtrar por tags só quando passar de uns 10 minutos |

### Ambiente

| Decisão | Motivo |
|---|---|
| O **staging é o ambiente de regressão** e fica **sempre igual à master** | Código de PR no staging deixaria migrations órfãs e resultados herdados de outro PR. Foi descartado |
| O QA também pode usar o staging manualmente | Os dados da suíte são sempre novos e marcados com `E2E`, então um não atrapalha o outro |
| Roda no **runner self-hosted** da Emcash, com a imagem `mcr.microsoft.com/playwright` | O staging e o MySQL só são acessíveis pela rede interna (*confirmar*). O `ubuntu-latest` do GitHub não chega lá |
| **Sem limpeza automática** de dados; refresh do banco quando necessário | Uma limpeza automática poderia apagar dados que o QA quer manter |

### Dados

| Decisão | Motivo |
|---|---|
| A fixture **`novoTomador()`** gera CPF válido, nome `E2E …` e celular **a cada execução** | Com CPF fixo, duas execuções juntas quebram e bugs que só aparecem com tomador "limpo" ficam escondidos |
| "Mesmo CPF, segunda proposta" é **um cenário dentro de um teste**, não estado herdado | O teste continua independente: cria a proposta 1, cria a proposta 2 e confere a regra |
| O **OTP é lido do MySQL** com a credencial padrão, guardada só em secret do GitHub | Para não travar o começo do projeto. **Depois:** um usuário `e2e_readonly` só com `SELECT` e, como meta, um OTP fixo no staging para telefones de teste (sem SMS real) |
| **Terceiros são simulados** pelos endpoints que já existem (ex.: webhook de elegibilidade) | A suíte testa o **nosso** sistema e não depende de o sandbox do parceiro estar no ar. Cada simulação leva o comentário `// aqui fingimos ser o <parceiro>` |

### Gatilho

```
merge na master do app X
   ├─ deploy (automático, ferramenta externa) ──▶ staging
   └─ dispatch para o repo de QA, com o sha
          ├─ espera o /version do staging mostrar esse sha (timeout ~15 min)
          ├─ roda a suíte inteira
          └─ resultado ──▶ Slack  (+ commit status no sha do app X)
```

Também roda **todo dia às 6h** e **na mão** (botão "Run workflow").

Esperar o `/version` é obrigatório: sem isso, a suíte pode testar a versão anterior e dar um falso verde.

## Quando falha

| Regra | Detalhe |
|---|---|
| **Aviso no Slack** | Aplicação, sha, link do relatório. O e-mail do GitHub não serve, porque em `schedule`/`dispatch` ele avisa só quem editou o workflow por último |
| **Triagem em rodízio** | Uma pessoa do QA por semana é dona das falhas. Classifica cada uma: *a app quebrou*, *a app mudou de propósito* ou *ambiente/limite* (veja [COMO-CRIAR-UM-TESTE.md](COMO-CRIAR-UM-TESTE.md#8-quando-ele-falhar-no-ci)) |
| **Reverter primeiro** | Bug real: o autor, ou quem está na triagem, reverte o commit na master **em até 1 hora** e conserta depois com calma |
| **Só o último verde vai para prod** | Na v2, prod recebe o último sha que passou, nunca um sha que não foi testado |
| **Bypass `pular-e2e`** | Para hotfix de incidente. Exige justificativa e avisa no Slack |

## Testes instáveis

- **1 retry no CI.** Teste que só passa no retry conta como **flaky**, não como verde, e aparece no Slack.
- **`@quarentena`**: teste instável sai da suíte principal, roda só no nightly e tem **1 semana** para ser consertado ou apagado.

Um teste instável é pior que nenhum: o time passa a ignorar os alertas.

## Responsabilidades

| Quem | O quê |
|---|---|
| **QA** | Dono do repo e das jornadas. Escreve os testes, faz a triagem |
| **Devs** | Mantêm os seletores (`data-testid`, textos acessíveis). Quando mudam algo de propósito, avisam ou atualizam o teste |
| **Revisão** | Todo PR de teste é revisado por alguém do QA ou do time do produto |

## Dependências

| # | O quê | De quem | Libera |
|---|---|---|---|
| 1 | Cada serviço expõe **`/version`** com o sha que está rodando | Time de cada serviço | v1 |
| 2 | Token para o dispatch (`E2E_DISPATCH_TOKEN`) nos repos dos apps | Quem administra a org no GitHub | v1 |
| 3 | Canal do Slack e webhook | QA | v1 |
| 4 | Separar o deploy em **master → staging → (suíte) → prod**, e a ferramenta de deploy receber o ✓/✗ | **Dono do deploy: a definir** | v2 |

## Pendências

- [ ] Descobrir qual ferramenta faz o deploy hoje e quem é o dono dela (dependência 4).
- [ ] Confirmar que o staging só é acessível pela rede interna.
- [ ] Levantar os limites do multiportal/backend no staging (login, SMS, APIs externas) antes do primeiro teste. Veja a seção de rate limits em [BOAS-PRATICAS.md](BOAS-PRATICAS.md).
- [ ] Criar o usuário `e2e_readonly` no MySQL do staging.
- [ ] Combinar com o backend um OTP fixo no staging para telefones de teste.

## Descartado

| Ideia | Por que não |
|---|---|
| Rodar a suíte em cada PR, com a branch do PR no staging | Migrations de PR ficam no banco, um PR herda o anterior, e com um só ambiente forma-se uma fila |
| Ambiente efêmero por PR | Caro demais para o momento |
| Manter o executor próprio (encore) | Teria que reimplementar relatório, retries, trace e paralelismo, que o Playwright já tem |
