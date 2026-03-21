
Objetivo: elevar a precisão do motor de dimensionamento com foco em consistência matemática, previsibilidade e cobertura de testes.

1) Corrigir inconsistências de regra no domínio
- Tornar a rampa parametrizável via `rampUpMonths` (hoje está hardcoded em 33/66/100 + offset fixo de 2).
- Definir uma função única de rampa (ex.: `buildRampCurve(rampUpMonths)`) usada tanto no cálculo de `hcAvailableEffective` quanto no `openMonthIndex`.
- Resultado esperado: o valor de “Ramp-up (meses)” passa a impactar de fato o modelo.

2) Eliminar ambiguidades temporais (mês/ano)
- Trocar chaves de mês simples (`point.month`) por chave temporal completa (`YYYY-MM`) em:
  - `manualGrowthByMonth`
  - distribuição de turnover
- Ajustar leitura/escrita da sidebar para esse novo formato.
- Resultado esperado: simulações com janela >12 meses não terão colisão entre meses de anos diferentes.

3) Reforçar consistência de fórmulas de demanda
- Implementar regra explícita para `currentVolume`:
  - opção A: derivar `contactRate = currentVolume/currentClients` automaticamente,
  - opção B: manter manual e exibir alerta de inconsistência quando divergir muito.
- Garantir comportamento determinístico quando `growthMode = manual` e faltarem meses no mapa de crescimento (fallback documentado).
- Resultado esperado: menos discrepância entre premissas exibidas e projeção final.

4) Revisar cálculo de gap para precisão operacional
- Separar no motor:
  - `agentsNeededRaw` (decimal)
  - `agentsNeeded` (ceil para decisão)
  - `gapFte` (contra HC efetivo)
  - `gap` (ceil para exibição/ação)
- Padronizar arredondamentos em um único ponto para evitar efeito cascata.
- Resultado esperado: números da tabela, KPIs e timeline coerentes entre si.

5) Expandir testes do motor (prioridade alta)
- Adicionar cenários unitários para:
  - rampa parametrizada (2, 3, 4 meses),
  - modo `antecipado` vs `gap` com mesma entrada,
  - período cruzando ano,
  - distribuição de turnover em meses repetidos no calendário,
  - consistência `currentVolume` x `contactRate`.
- Incluir testes de regressão com snapshots de `summary` e 2-3 meses críticos.
- Resultado esperado: detectar regressões de precisão antes de qualquer ajuste visual.

6) Pequenos ajustes de transparência na UI (sem mudar layout)
- Atualizar microcopy de fórmula para refletir regras finais (rampa e derivação de C.R.).
- Exibir tooltip técnico curto com “como o número foi calculado” em KPIs sensíveis (`agentsNeededQ4`, `criticalOpenMonth`).
- Resultado esperado: confiança maior no número apresentado sem poluir a interface.

Detalhes técnicos (resumo)
- Criar utilitários no motor:
  - `getTimelineKey(point) => "YYYY-MM"`
  - `getRampFactor(monthsSinceHire, rampUpMonths)`
  - `resolveContactRate(inputs)`
- Manter `runPlannerProjection` como orquestrador e mover regras puras para funções testáveis.
- Critério de aceite: para mesmo input, projeção é estável, auditável e sem divergência entre tabela/KPIs/timeline.
