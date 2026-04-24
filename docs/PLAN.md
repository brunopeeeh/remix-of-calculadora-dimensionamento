# Plan: Calculadora de Dimensionamento Operacional

## Decisão de Design: Turnover Rateado

**Status:** Implementado e confirmado como comportamento correto.

### Lógica de Turnover

O turnover é **rateado** ao longo do período selecionado, não aplicado integralmente:

| Período | Input | Aplicação |
|---------|-------|-----------|
| Anual | 15% | 1.25% ao mês |
| Semestral | 12% | 2% ao mês |
| Trimestral | 5% | ~1.67% ao mês |
| Mensal | 2% | 2% ao mês |

**Justificativa:** Turnover é um fenômeno contínuo - pessoas saem todos os meses. Ratear reflete melhor a realidade operacional para planejamento de capacidade.

### Implementação Atual

O código em `turnover.ts:78` já implementa corretamente:
```typescript
const monthlyRate = inputs.turnoverValue / ctx.periodMonths;
```

---

## Melhorias Implementadas

### Alta Prioridade
- [x] **Refatoração da simulação** - Eliminação de simulação dupla, cálculo em uma única passagem com cache de demanda
- [x] **Testes de edge cases** - +16 novos testes cobrindo cenários cegos

### Média Prioridade
- [x] **Resumo de premissas na UI** - Painel de KPIs rápidos no topo da sidebar
- [x] **Validação de inputs** - Alertas para valores inválidos (HC, TMA, C.R.)
- [x] **Web Worker** - Já implementado para cálculos em background

---

## Tarefas Pendentes

- [ ] Implementar validação com Zod para inputs estruturados
- [ ] Adicionar exportação de relatório (PDF/Excel)
- [ ] Persistência de cenário no localStorage
