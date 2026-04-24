# Calculadora de Dimensionamento Operacional

Ferramenta de planejamento que projeta volume de demanda, deflexão de IA, capacidade por agente, headcount disponível, gap operacional e timing de contratação mês a mês.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **shadcn/ui** + **Tailwind CSS** (design system com tokens semânticos)
- **Recharts** para gráficos
- **Vitest** para testes unitários
- **Web Worker** para cálculos em background

## Estrutura do projeto

```
src/
├── features/ops-planning/      # Domínio e motor de cálculo
│   ├── calculator.ts           # Orquestrador da projeção
│   ├── capacity.ts             # Capacidade por agente e contact rate
│   ├── demand.ts              # Cálculo de demanda mensal
│   ├── ramp.ts                # Fator de rampa e maturação
│   ├── timeline.ts            # Construção da timeline YYYY-MM
│   ├── turnover.ts            # Cálculo e auditoria de turnover
│   ├── types.ts               # Tipos do domínio
│   ├── scenarios.ts           # Presets de cenários
│   ├── usePlannerState.ts     # Hook de estado da sidebar
│   ├── usePlannerProjection.ts # Hook de projeção reativa
│   └── planner.worker.ts      # Web Worker para cálculos
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
    └── calculator.test.ts      # Suíte de testes (72 testes)
```

## Como rodar

```bash
npm install
npm run dev      # Dev server
npm test         # Testes unitários
npm run lint     # Linting
npm run build    # Build de produção
```

## Conceitos Chave

### Lógica de Turnover

O turnover é **rateado** ao longo do período selecionado:

| Período | Input 15% | Taxa mensal |
|---------|-----------|-------------|
| Anual | 15% | 1.25%/mês |
| Semestral | 15% | 2.5%/mês |
| Trimestral | 15% | 5%/mês |
| Mensal | 15% | 15%/mês |

O turnover pode ser informado como:
- **Percentual**: taxa sobre o HC disponível
- **Absoluto**: número fixo de saídas

### Timing de Turnover

- **Início do mês**: saídas são descontadas antes de avaliar gap
- **Fim do mês**: saídas são descontadas após contratação e ramp-up

### Modos de Contratação

- **`gap`**: abre a vaga no mês do gap; contratado inicia após lead time
- **`antecipado`**: abre a vaga antecipadamente (lead time + ramp-up) para que o contratado esteja maduro no mês do gap

### Deflexão de IA

O volume de IA reduz a demanda humana:
```
volumeAI = volumeBruto × aiPct
volumeHumano = volumeBruto × (1 - aiPct)
```

Onde `aiPct = min(aiCoveragePct + aiGrowthMonthly × mês + extraAutomation, 95%)`

## Cenários Preset

```typescript
import { SCENARIO_PRESETS } from "@/features/ops-planning/scenarios";

// Cenários disponíveis: base, otimista, pessimista
```

## Testes

```
npm test        # Executa todos os testes
npm run test:watch  # Modo watch
```

Cobertura atual: 72 testes unitários cobrindo:
- Ramp-up de cohorts
- Lead time e timing de contratação
- Turnover (percentual e absoluto)
- Crescimento linear e manual
- Deflexão de IA
- Edge cases (números negativos, valores extremos, timeline curta)

## API do Motor de Cálculo

```typescript
import { runPlannerProjection } from "@/features/ops-planning/calculator";
import { PlannerInputs } from "@/features/ops-planning/types";

const result = runPlannerProjection(inputs);
// result.timeline: MonthPoint[]
// result.rows: MonthlyProjection[]
// result.summary: ProjectionSummary
```

### PlannerInputs (principais campos)

| Campo | Descrição |
|-------|-----------|
| `currentClients` | Base de clientes inicial |
| `targetClientsQ4` | Meta de clientes no período final |
| `contactRate` | Contatos por cliente por mês |
| `headcountCurrent` | HC disponível no início |
| `productivityBase` | Capacidade nominal por agente |
| `tmaN1` | Tempo médio de atendimento (min) |
| `aiCoveragePct` | % de atendimento pela IA |
| `turnoverValue` | Taxa de turnover |
| `turnoverPeriod` | Frequência de cálculo |
| `leadTimeMonths` | Meses entre abrir vaga e iniciar |
| `hiringMode` | "gap" ou "antecipado" |

### MonthlyProjection (saída por mês)

| Campo | Descrição |
|-------|-----------|
| `clientsBase` | Base de clientes projetada |
| `volumeHuman` | Volume para atendimento humano |
| `capacityPerAgent` | Capacidade efetiva por agente |
| `hcAvailableEffective` | HC total efetivo disponível |
| `gap` | Defasagem de agentes (arredondado) |
| `gapFte` | Defasagem em FTE (precisa) |
| `hiresOpened` | Vagas abertas neste mês |
| `hiresStarted` | Contratações que iniciam |
| `risk` | "ok" \| "attention" \| "critical" |
