
# Plano de evolução — Calculadora de Dimensionamento

## ✅ Concluído (refatoração v2)

1. Motor de projeção reescrito com lead time real, hiring modes (gap/antecipado), cohort tracking explícito
2. Turnover com timing configurável (start_of_month / end_of_month) e fórmula auditável
3. Index.tsx refatorado: de 816 → ~65 linhas (composição pura)
4. Hooks extraídos: usePlannerState, usePlannerProjection
5. Motor dividido: calculator, capacity, demand, ramp, timeline, turnover
6. 28 testes unitários cobrindo regras críticas
7. README, package.json e playwright.config atualizados

## Próximos passos opcionais

- Persistência de inputs via localStorage
- Exportação CSV/PDF da projeção
- Forward-looking hiring (antecipar contratações com base em demanda futura)
- Testes E2E com Playwright
- Code-splitting para reduzir bundle size
