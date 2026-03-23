# Calculadora de Dimensionamento Operacional

Ferramenta de planejamento que projeta volume de demanda, deflexão de IA, capacidade por agente, headcount disponível, gap operacional e timing de contratação mês a mês.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **shadcn/ui** + **Tailwind CSS** (design system com tokens semânticos)
- **Recharts** para gráficos
- **Vitest** para testes unitários

## Estrutura do projeto

```
src/
├── features/ops-planning/      # Domínio e motor de cálculo
│   ├── calculator.ts           # Orquestrador da projeção
│   ├── capacity.ts             # Capacidade por agente e contact rate
│   ├── demand.ts               # Cálculo de demanda mensal
│   ├── ramp.ts                 # Fator de rampa e maturação
│   ├── timeline.ts             # Construção da timeline YYYY-MM
│   ├── turnover.ts             # Cálculo e auditoria de turnover
│   ├── types.ts                # Tipos do domínio
│   ├── scenarios.ts            # Presets de cenários
│   ├── usePlannerState.ts      # Hook de estado da sidebar
│   └── usePlannerProjection.ts # Hook de projeção reativa
├── components/ops/             # Componentes visuais da calculadora
│   ├── SidebarPanel.tsx        # Painel lateral de inputs
│   ├── KPISection.tsx          # Grid de KPIs
│   ├── ChartsSection.tsx       # Gráficos Recharts
│   ├── MonthlyTable.tsx        # Tabela mensal detalhada
│   ├── MonthlyAuditPanel.tsx   # Painel de auditoria matemática
│   ├── HiringTimeline.tsx      # Timeline de contratação
│   └── SimpleNumberField.tsx   # Campo numérico reutilizável
├── pages/
│   └── Index.tsx               # Composição da página principal
└── test/
    └── calculator.test.ts      # Suíte de testes do motor
```

## Como rodar

```bash
npm install
npm run dev      # Dev server
npm test         # Testes unitários
npm run build    # Build de produção
```

## Lógica de contratação

- **leadTimeMonths**: tempo entre abrir uma vaga e o contratado iniciar. Afeta diretamente quando a capacidade entra na simulação.
- **hiringMode "gap"**: abre a vaga no mês do gap; contratado inicia após lead time.
- **hiringMode "antecipado"**: abre a vaga antecipadamente (lead time + ramp-up) para que o contratado esteja maduro no mês do gap.

## Lógica de turnover

- **turnoverTiming "start_of_month"**: saídas são descontadas antes de avaliar gap.
- **turnoverTiming "end_of_month"**: saídas são descontadas após contratação e ramp-up do mês.
- Suporta períodos mensal, semestral e anual com distribuição pelos meses selecionados.
