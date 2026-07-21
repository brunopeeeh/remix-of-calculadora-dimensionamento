# Auditoria e Plano de Ajuste — Calculadora de Dimensionamento

Data: 21/07/2026
Escopo: motor de cálculo (`src/features/ops-planning/`), KPIs (`src/components/ops/`), feature de IA (`src/lib/ai.ts`, `MetricAnalyzer.tsx`), e higiene geral do repositório.

Metodologia: leitura linha a linha de todo o motor de cálculo (`calculator.ts`, `demand.ts`, `capacity.ts`, `turnover.ts`, `ramp.ts`), cross-check com os testes existentes (164 passando), e verificação ao vivo no navegador (build, lint, chamadas de IA reais).

---

## Resumo executivo

O motor de cálculo é bem testado e o build/lint/typecheck estão limpos. Mas a auditoria encontrou **um problema estrutural sério**: a etapa que decide *quantas pessoas contratar e quando* (passo 2 da simulação) não enxerga turnover nem a variação de capacidade por promoções — enquanto a etapa que *reporta o gap* (passo 3) enxerga os dois. Isso significa que o plano de contratações exibido pode ficar sistematicamente **abaixo** do necessário sem que nada avise o usuário. Também confirmei que o toggle "Gap vs. Antecipado" — um controle central da tela de Regras — **não muda o resultado da simulação**, só o texto explicativo. Fora isso, há um bug de UI na feature de IA (rótulo do relatório trocando sozinho), uma chave de API inválida, e a dívida de acessibilidade/dead-code já mapeada anteriormente.

---

## 1. Correções críticas de cálculo

### C1 — `hiringMode` ("Gap" vs "Antecipado") não afeta a simulação real
**Severidade: Alta** · `src/features/ops-planning/calculator.ts:154-174, 229`

O cohort de contratação é sempre criado com `startIndex = index + inputs.leadTimeMonths` (linha 229), **independente do valor de `hiringMode`**. O único lugar em que `hiringMode` é lido é `computeOpenTiming()`, usada apenas para gerar o texto informativo "Abrir vaga até: …" exibido na aba Plano/Detalhes.

Confirmei isso nos próprios testes (`src/test/calculator.test.ts:185-205`): o teste "impactam a disponibilidade efetiva de forma diferente" só compara `openMonthIndex` (o rótulo) — nunca `hcEffective`, `gap` ou `hiresStarted`, que são idênticos nos dois modos no mesmo teste.

**Impacto**: o usuário pode configurar "Antecipado" achando que o modelo vai contratar/ramp-up mais cedo para evitar o gap — e nada muda de fato. O relatório de IA que testei ao vivo chegou a *explicar* esse "efeito" para o usuário, descrevendo um comportamento que o modelo não executa.

**Correção proposta**: quando `hiringMode === "antecipado"`, o `startIndex` real do cohort (não só o rótulo) deveria ser antecipado por `getRampMaturationOffset(rampUpMonths)`, de forma que o agente esteja com ramp-up completo no mês em que o gap é detectado — e não apenas iniciando. Ajuste concentrado em `calculator.ts:229` (usar a mesma fórmula já existente em `computeOpenTiming`).

---

### C2 — Plano de contratações ignora turnover
**Severidade: Alta** · `calculator.ts:213-243` (passo 2) vs. `256-344` (passo 3)

O passo 2 (que decide quando abrir uma vaga) calcula `hcEffective` como `inputs.headcountCurrent` + ramp dos cohorts já decididos — **sem nunca subtrair turnover**. Só o passo 3 (que apenas *relata* o resultado, sem poder abrir novos cohorts) aplica turnover de fato, via `applyTurnoverStartOfMonth`/`applyTurnoverEndOfMonth`.

**Impacto**: o gap exibido nas colunas/KPIs já reflete a perda por turnover, mas o número de admissões (`hiresYear`, Gantt de contratações) foi calculado como se ninguém saísse. Em cenários com turnover relevante, é possível o app mostrar meses "Crítico" mesmo depois de todas as contratações planejadas terem sido feitas — porque o plano nunca foi dimensionado para repor essas saídas.

**Correção proposta**: dentro do laço do passo 2, descontar de `hcEffective` uma estimativa de turnover acumulado até aquele mês (reaproveitando `resolveTurnoverForMonth`/`buildTurnoverContext`, já existentes) antes de comparar com `agentsNeeded`. Isso é o ajuste de maior valor de negócio do pacote inteiro, pois muda o número final de contratações recomendadas.

---

### C3 — Plano de contratações usa capacidade estática, ignorando o mix N1/N2 dinâmico
**Severidade: Média** · `calculator.ts:191, 213-243` vs. `260-267`

O passo 2 usa `baselineCapacityPerAgent = computeCapacityPerAgent(inputs)`, calculado **uma vez, fora do laço**. O passo 3 recalcula a capacidade a cada mês com `computeAdjustedMix` quando `useN1N2Split` e `promotionsCount > 0` (o mix N1→N2 desloca ao longo do tempo por promoções, e N2 tem TMA maior → capacidade menor por agente). Ou seja: se há promoções configuradas, a capacidade real cai ao longo do ano, mas o passo que decide contratações nunca sabe disso.

**Correção proposta**: mesma ideia do C2 — o passo 2 precisa calcular `effectiveCapacity` mês a mês com `computeAdjustedMix`, em vez de um valor único fixo.

> C1, C2 e C3 têm a mesma causa raiz: **o passo de planejamento (2) e o passo de simulação/relato (3) usam modelos de mundo diferentes**, e nada reconcilia os dois. O jeito mais robusto de resolver os três de uma vez é fundir os passos 2 e 3 num único laço que decide *e* simula com o mesmo estado (mais textbook, mas é mais reescrita). O jeito mais lazy é replicar os inputs que já existem (turnover, mix ajustado) dentro do passo 2, como descrito acima — resolve o sintoma com uma mudança pequena e localizada.

---

### C4 — Seleção manual de meses de turnover reduz o total abaixo do valor informado
**Severidade: Média** · `turnover.ts:63-79`

`resolveTurnoverForMonth` sempre divide `turnoverValue / periodMonths` (1/3/6/12, fixo pelo período escolhido), e aplica essa taxa só nos meses ativos. Quando o usuário seleciona manualmente menos meses do que `periodMonths` (ex.: período "Anual" com só 3 meses marcados, como vi na tela ao vivo), o total de turnover aplicado no ano vira `taxa × 3`, não o valor de `turnoverValue` informado. Ou seja, marcar menos meses "manualmente" silenciosamente reduz o turnover total simulado — provavelmente o oposto do que o usuário espera (concentrar o mesmo total em meses específicos, não diluí-lo).

**Correção proposta**: quando `turnoverMonths` é definido manualmente, redistribuir `turnoverValue` pelos meses selecionados (denominador = `ctx.activeCount`, não `periodMonths` fixo) — ou, no mínimo, mostrar um aviso na UI de que o total efetivo é menor que o informado.

---

### C5 — `computeTenureVacationPct` trava em "no máximo 1 agente de férias simultâneo"
**Severidade: Baixa/Média (só quando "Calcular por tempo de casa" está ligado)** · `capacity.ts:14-21, maxConcurrentAgents = 1`

Para qualquer tamanho de time, o modelo assume no máximo 1 agente de férias ao mesmo tempo (`Math.min(periodsPerMonth, 1)`). Para um time de 50 agentes elegíveis isso deveria escalar (mais gente, mais férias simultâneas possíveis), mas fica hard-capado em 1. Isso é uma simplificação que funciona para times pequenos e distorce silenciosamente para times grandes — sem nenhum comentário `ponytail:`/aviso indicando o teto.

**Correção proposta**: substituir o cap fixo por algo proporcional ao tamanho do time (ex.: nunca mais que X% do headcount de férias ao mesmo tempo), ou documentar explicitamente o teto atual como decisão consciente para squads pequenos.

---

### C6 — Arredondamento por mês antes de somar mascara o total de turnover no card executivo
**Severidade: Baixa** · `src/components/ops/ExecutiveSummary.tsx:18`

```ts
const totalTurnover = rows.reduce((acc, r) => acc + Math.round(r.turnover), 0);
```
Arredonda cada mês individualmente antes de somar. Com turnover fracionário pequeno (ex.: 0,3/mês por vários meses), o total pode aparecer como zero mesmo havendo perda real acumulada. Deveria somar primeiro (`r.turnover`) e arredondar o total uma única vez.

---

## 2. Feature de IA — bugs e risco operacional

### C7 — Chave DashScope/Qwen inválida, mascarada como erro genérico
**Severidade: Média** · `.env` (`VITE_DASHSCOPE_API_KEY`), `vite.config.ts:17-21`

Testei diretamente contra a API da Alibaba: a chave retorna `401 invalid_api_key`. Só que passando pelo proxy de dev do Vite, isso vira `ECONNRESET` → a UI mostra apenas "Erro 500: Internal Server Error", sem indicar que é um problema de credencial. **Ação**: renovar a chave, e melhorar o tratamento de erro em `askQwen` (`src/lib/ai.ts`) para repassar o `error.message` real da API em vez de deixar o proxy estourar.

### C8 — Rótulo do relatório de IA não reflete o motor que realmente gerou o conteúdo
**Severidade: Média** · `src/features/ops-planning/MetricAnalyzer.tsx`

Reproduzi ao vivo: gerei um relatório com Qwen (que falhou), depois só troquei o modelo selecionado para Gemini — sem gerar nada de novo — e o card do relatório antigo trocou sozinho o rótulo "Motor: Qwen 3.7 Max" para "Motor: Gemini 2.5 Flash". O rótulo é derivado do estado atual do seletor, não de qual modelo de fato respondeu aquele relatório específico. **Correção**: guardar o motor usado como parte do estado do relatório gerado (ex.: `report.engine`), não derivar do `activeModel` corrente.

### C9 — Provider NVIDIA morto + 5 erros reais de ESLint
Já mapeados na auditoria de over-engineering anterior — reforçando aqui porque afetam a mesma área: `askNvidia()` em `ai.ts` é inalcançável pela UI, e `MetricAnalyzer.tsx:267,285` tem escapes de regex desnecessários (`no-useless-escape`) no parser de markdown feito à mão.

---

## 3. Melhorias de KPI

O conjunto atual (Escala de Clientes, Carga de Atendimento, Capacidade p/Agente, Dimensionamento Q4, Plano de Admissões) cobre bem o volume e a capacidade, mas tem lacunas para quem realmente precisa decidir orçamento/headcount:

1. **"Dimensionamento Q4" é ambíguo** (`KPISection.tsx:56-66`) — o valor é `agentsNeededQ4`, ou seja, a *demanda* de agentes no último mês, não o headcount efetivamente planejado (`hcFinal`) considerando o plano de contratações. O subtítulo diz "Headcount final projetado", o que sugere o segundo. Vale ou renomear o KPI ("Agentes necessários (demanda)") ou trocar o valor para `hcFinal` do último mês — e se os dois divergirem (o que pode acontecer por causa do C2), isso deveria ficar visível, não escondido atrás de um rótulo ambíguo.
2. **Falta um KPI de turnover/attrition dedicado.** Hoje o total de saídas só aparece como texto inline dentro do banner de alerta (`ExecutiveSummary.tsx:46`), não como card, e ainda carrega o bug de arredondamento (C6). Dado que turnover é citado como pilar do produto no README, merece um card próprio.
3. **Falta um KPI de impacto financeiro/orçamento.** O produto já sabe quantas admissões são necessárias e em qual mês — mas não converte isso em custo (ex.: admissões × salário médio configurável). Isso é o tipo de número que um exec realmente quer ver no resumo executivo, e é uma extensão pequena dado que os dados já existem.
4. **Nenhum KPI de qualidade dos dados de entrada.** `usePlannerProjection.ts` já calcula `contactRateDriftPct` (o quanto o contact rate manual diverge do inferido pelo volume atual) mas isso só é usado no painel de auditoria avançado — não vira um alerta proativo no resumo executivo quando o drift é alto, mesmo sendo um sinal de premissa mal calibrada.
5. **Nenhum indicador do próprio C1/C2 acima.** Seria valioso, depois de corrigido o cálculo, adicionar um aviso quando o plano de contratações "não fecha" o gap simulado (ex.: "3 meses ainda críticos após o plano de admissões") — hoje isso é possível de acontecer silenciosamente.

---

## 4. Acessibilidade (herdado da sessão anterior, reforçado aqui)

Chrome DevTools reportou **31 campos sem `<label>`** e **36 sem `id`/`name`**, concentrados na sidebar de inputs (`SidebarPanel.tsx` e seções `*Section.tsx`). Como é a superfície de input mais usada do app, vale um passe dedicado ligando `<label htmlFor>` aos campos do `SimpleNumberField`/`RangeNumberField`.

---

## 5. Higiene de repositório (contexto, não bloqueante)

Não é cálculo nem KPI, mas afeta a segurança do trabalho em andamento:
- **~2.170 linhas inseridas / 1.615 removidas em 35 arquivos, sem commit**, mais arquivos novos/deletados. Recomendo commitar em um ponto seguro antes de aplicar as correções deste plano, para não misturar "bug fix" com "refactor grande não versionado" no mesmo diff.
- 3 lockfiles coexistindo (`package-lock.json`, `bun.lock`, `bun.lockb`) — definir um gerenciador único.
- Dependências/mortas mapeadas na auditoria anterior (shadcn/ui não usado, `openai` sem import, scripts Python órfãos) — não é bug, é peso morto.

---

## 6. Plano de execução sugerido

| Fase | Itens | Por quê nessa ordem |
|---|---|---|
| **0 — Segurança** | Commitar o estado atual do working tree | Nada abaixo deve ser feito em cima de 2k linhas não versionadas |
| **1 — Cálculo (alto impacto)** | C1 (hiringMode real), C2 (turnover no planejamento), C3 (mix dinâmico no planejamento) | Mudam o número que o produto entrega (quantas contratações, quando) — é o core value |
| **2 — Cálculo (correção pontual)** | C4 (rateio manual de turnover), C5 (cap de férias), C6 (arredondamento) | Bugs reais, mas de menor alcance/frequência de uso |
| **3 — KPIs** | Renomear/corrigir KPI de headcount, adicionar card de turnover, avaliar KPI de custo e alerta de drift | Depende da Fase 1 estar correta, senão os novos KPIs herdam os mesmos números errados |
| **4 — IA** | Trocar chave DashScope, corrigir mensagens de erro (C7), corrigir rótulo do motor (C8), remover `askNvidia` morto, corrigir os 5 erros de lint | Isolado do motor de cálculo, pode rodar em paralelo a qualquer fase acima |
| **5 — Acessibilidade** | Labels/ids na sidebar | Independente, pode ser feito a qualquer momento |

Cada item de cálculo (Fases 1-2) já tem suíte de teste existente para regressão (`calculator.test.ts`, `kpi-simulation.test.ts`) — qualquer correção deve vir acompanhada de um teste novo que force o cenário do bug (ex.: turnover alto + hiringMode antecipado) antes de mexer no código, para provar o comportamento errado primeiro e o corrigido depois.
