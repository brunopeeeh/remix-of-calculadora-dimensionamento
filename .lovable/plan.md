
Objetivo: implementar rampa parcial real (M1=33%, M2=66%, M3+=100%) afetando **HC disponível** e também a **recomendação de abertura de vaga** (conforme sua escolha: “HC + abertura de vagas”).

1) Atualizar modelo de domínio (types)
- Em `src/features/ops-planning/types.ts`, adicionar campos no `MonthlyProjection` para separar:
  - `hcAvailableEffective` (HC equivalente efetivo no mês, com rampa parcial),
  - `capacityAvailableTotal` (capacidade total disponível do time no mês),
  - `gapFte` (gap em FTE efetivo, pode ser decimal antes do arredondamento),
  - manter `gap` como inteiro exibível (ex.: `ceil(gapFte)`).
- Isso evita misturar “HC nominal” com “HC produtivo”.

2) Reescrever a lógica mensal de capacidade no `calculator.ts`
- Substituir a lógica atual (onde contratação entra 100% no mesmo mês) por curva de contribuição por coorte de contratação:
  - mês da contratação: 0.33,
  - mês +1: 0.66,
  - mês +2 em diante: 1.00.
- Estratégia:
  - manter histórico de coortes de hires por mês,
  - para cada mês, calcular `hcAvailableEffective` somando contribuição de todas as coortes ativas + HC base remanescente,
  - aplicar turnover no HC nominal (não no percentual) e refletir isso no mês seguinte.
- Cálculos mensais:
  - `agentsNeeded = ceil(volumeHuman / capacityPerAgent)`,
  - `capacityAvailableTotal = hcAvailableEffective * capacityPerAgent`,
  - `gapFte = max(0, agentsNeeded - hcAvailableEffective)`,
  - `hire = ceil(gapFte)` para fechar déficit operacional com arredondamento conservador.

3) Recalibrar “Abrir vaga em” com rampa parcial
- Atualizar regra de `openMonthIndex` para considerar a rampa parcial no modo `antecipado`:
  - offset = `leadTimeMonths + 2` (porque plenitude ocorre no 3º mês da curva 33/66/100),
  - no modo `gap`, manter somente `leadTimeMonths`.
- Garantir que `criticalOpenMonth` e `HiringTimeline` usem essa nova referência.

4) Ajustes de UI para refletir HC efetivo (sem poluir visual)
- `src/pages/Index.tsx`:
  - no gráfico “Evolução de headcount”, trocar série de HC disponível para `hcAvailableEffective` (não `hcInitial`),
  - atualizar tooltips/microtexto para explicitar “HC efetivo com rampa parcial”.
- `src/components/ops/MonthlyTable.tsx`:
  - manter layout atual, mas mudar coluna “HC inicial” para representar HC disponível efetivo (ou incluir coluna curta “HC efetivo” se couber sem quebrar legibilidade).
- Atualizar nota de rodapé (linha 606) de “pronto para evolução futura” para “rampa parcial ativa (33/66/100)”.

5) Cenários, compatibilidade e validação
- Preservar presets (`scenarios.ts`) sem quebra.
- Manter comportamento reativo (sem botão de calcular).
- Adicionar testes unitários em `src/test/` para o motor:
  - contratação contribui 33% no mês de entrada, 66% no mês seguinte, 100% depois,
  - gap reduz progressivamente com maturação da coorte,
  - `criticalOpenMonth` muda corretamente no modo antecipado.

Detalhes técnicos (resumo)
- Fórmula central nova:
  - `HC_efetivo(m) = Σ[coorte_i * fator_rampa(m - i)]`
  - `fator_rampa(d) = 0.33 (d=0), 0.66 (d=1), 1.0 (d>=2), 0 (d<0)`
- `Gap` operacional passa a ser contra HC efetivo (não contra HC nominal), deixando a simulação mais realista para planejamento de contratação.
