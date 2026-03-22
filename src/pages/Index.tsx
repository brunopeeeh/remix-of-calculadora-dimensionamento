import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/components/ops/ChartCard";
import { Header } from "@/components/ops/Header";
import { HiringTimeline } from "@/components/ops/HiringTimeline";
import { InsightBanner } from "@/components/ops/InsightBanner";
import { KPIWidget } from "@/components/ops/KPIWidget";
import { MonthlyAuditPanel } from "@/components/ops/MonthlyAuditPanel";
import { MonthlyTable } from "@/components/ops/MonthlyTable";
import { RangeNumberField } from "@/components/ops/RangeNumberField";
import { SidebarSection } from "@/components/ops/SidebarSection";
import { TooltipInfo } from "@/components/ops/TooltipInfo";
import { clamp, formatDecimal, formatInt, monthNames } from "@/features/ops-planning/format";
import {
  formatNumberForDisplay,
  NumberFieldFormat,
  parseLooseNumber,
  isTransientNumericInput,
} from "@/features/ops-planning/number-input";
import { runPlannerProjection } from "@/features/ops-planning/calculator";
import { EMPTY_PLANNER_INPUTS, SCENARIO_PRESETS } from "@/features/ops-planning/scenarios";
import { PlannerInputs, ScenarioKey } from "@/features/ops-planning/types";
import { cn } from "@/lib/utils";

const cloneInputs = (source: PlannerInputs): PlannerInputs => ({
  ...source,
  manualGrowthByMonth: { ...source.manualGrowthByMonth },
  turnoverMonths: [...source.turnoverMonths],
});

const SimpleNumberField = ({
  label,
  description,
  tooltip,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatType = "integer",
  decimalDigits,
  replaceValueOnFocus = true,
}: {
  label: string;
  description: string;
  tooltip: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  formatType?: NumberFieldFormat;
  decimalDigits?: number;
  replaceValueOnFocus?: boolean;
}) => {
  const resolvedDecimalDigits = decimalDigits ?? (formatType === "decimal" ? 2 : 0);
  const [draftValue, setDraftValue] = useState(
    formatNumberForDisplay(value, formatType, resolvedDecimalDigits),
  );

  useEffect(() => {
    setDraftValue(formatNumberForDisplay(value, formatType, resolvedDecimalDigits));
  }, [value, formatType, resolvedDecimalDigits]);

  const commitValue = () => {
    const normalized = draftValue.trim();

    if (isTransientNumericInput(normalized)) {
      const fallback = min ?? 0;
      onChange(fallback);
      setDraftValue(formatNumberForDisplay(fallback, formatType, resolvedDecimalDigits));
      return;
    }

    const parsed = parseLooseNumber(normalized);
    if (!Number.isFinite(parsed)) {
      setDraftValue(formatNumberForDisplay(value, formatType, resolvedDecimalDigits));
      return;
    }

    const boundedMin = min ?? Number.NEGATIVE_INFINITY;
    const boundedMax = max ?? Number.POSITIVE_INFINITY;
    const next = Math.min(Math.max(parsed, boundedMin), boundedMax);
    onChange(next);
    setDraftValue(formatNumberForDisplay(next, formatType, resolvedDecimalDigits));
  };

  const normalizedDraft = draftValue.trim();
  const hasDraft = normalizedDraft.length > 0;
  const isTransient = isTransientNumericInput(normalizedDraft);
  const parsedDraft = !isTransient ? parseLooseNumber(normalizedDraft) : null;
  const isDraftNumeric = hasDraft && !isTransient && Number.isFinite(parsedDraft);
  const isBelowMin = isDraftNumeric && min !== undefined && parsedDraft < min;
  const isAboveMax = isDraftNumeric && max !== undefined && parsedDraft > max;
  const isInvalidValue = hasDraft && !isTransient && !isDraftNumeric;

  const validationMessage = isInvalidValue
    ? "Digite um número válido."
    : isBelowMin
      ? `Valor mínimo: ${formatNumberForDisplay(min!, formatType, resolvedDecimalDigits)}.`
      : isAboveMax
        ? `Valor máximo: ${formatNumberForDisplay(max!, formatType, resolvedDecimalDigits)}.`
        : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium">{label}</label>
        <TooltipInfo content={tooltip} />
      </div>
      <Input
        type="text"
        inputMode={formatType === "decimal" ? "decimal" : "numeric"}
        value={draftValue}
        data-step={step}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={commitValue}
        onFocus={(event) => {
          setDraftValue(String(value));
          if (replaceValueOnFocus) {
            event.currentTarget.select();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        aria-invalid={Boolean(validationMessage)}
        className={cn(
          "mono-numbers h-8",
          validationMessage && "border-destructive focus-visible:ring-destructive",
        )}
      />
      <p className="text-[11px] text-muted-foreground">{description}</p>
      {validationMessage ? <p className="text-[11px] text-destructive">{validationMessage}</p> : null}
    </div>
  );
};

const Index = () => {
  const [scenario, setScenario] = useState<ScenarioKey>("base");
  const [inputs, setInputs] = useState<PlannerInputs>(cloneInputs(SCENARIO_PRESETS.base));

  const projection = useMemo(() => runPlannerProjection(inputs), [inputs]);
  const inferredContactRate = inputs.currentClients > 0 ? inputs.currentVolume / inputs.currentClients : 0;
  const resolvedContactRate = inputs.contactRate > 0 ? inputs.contactRate : inferredContactRate;
  const contactRateSource = inputs.contactRate > 0 ? "manual" : "inferido";
  const contactRateDriftPct =
    inferredContactRate > 0 ? Math.abs(inputs.contactRate - inferredContactRate) / inferredContactRate * 100 : 0;

  const patch = <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const patchPercent = <K extends keyof PlannerInputs>(key: K, value: number) => {
    patch(key, clamp(value, 0, 100) as PlannerInputs[K]);
  };

  const handleScenarioChange = (next: ScenarioKey) => {
    setScenario(next);
    setInputs(cloneInputs(SCENARIO_PRESETS[next]));
  };

  const handleRestoreBase = () => {
    setScenario("base");
    setInputs(cloneInputs(SCENARIO_PRESETS.base));
  };

  const handleClearAll = () => {
    setScenario("base");
    setInputs(cloneInputs(EMPTY_PLANNER_INPUTS));
  };

  const toggleTurnoverMonth = (monthKey: string) => {
    setInputs((prev) => {
      const active = prev.turnoverMonths.includes(monthKey);
      const next = active
        ? prev.turnoverMonths.filter((item) => item !== monthKey)
        : [...prev.turnoverMonths, monthKey].sort((a, b) => a.localeCompare(b));
      return { ...prev, turnoverMonths: next };
    });
  };

  const periodLabel = `${projection.timeline[0]?.label ?? "-"} → ${projection.timeline[projection.timeline.length - 1]?.label ?? "-"}`;

  const chartRows = projection.rows.map((row) => ({
    month: row.month.label,
    volumeBruto: row.volumeGross,
    volumeIA: row.volumeAI,
    volumeHumano: row.volumeHuman,
    agentesNecessarios: row.agentsNeeded,
    hcDisponivel: row.hcAvailableEffective,
    gap: row.gap,
    produtividadeNominal: inputs.productivityBase,
    perdaPausas: inputs.productivityBase * (inputs.breaksPct / 100),
    perdaOffchat: inputs.productivityBase * (inputs.offchatPct / 100),
    perdaReunioes: inputs.productivityBase * (inputs.meetingsPct / 100),
    perdaFerias: inputs.productivityBase * ((inputs.vacationPct / 100) * (inputs.vacationEligiblePct / 100)),
    capacidadeFinal: row.capacityPerAgent,
  }));

  const shrinkageData = [
    { name: "Prod. nominal", value: inputs.productivityBase, fill: "hsl(var(--chart-neutral))" },
    { name: "Pausas", value: -inputs.productivityBase * (inputs.breaksPct / 100), fill: "hsl(var(--chart-warning))" },
    { name: "Offchat", value: -inputs.productivityBase * (inputs.offchatPct / 100), fill: "hsl(var(--chart-warning))" },
    { name: "Reuniões", value: -inputs.productivityBase * (inputs.meetingsPct / 100), fill: "hsl(var(--chart-warning))" },
    {
      name: "Férias",
      value: -inputs.productivityBase * ((inputs.vacationPct / 100) * (inputs.vacationEligiblePct / 100)),
      fill: "hsl(var(--chart-danger))",
    },
    { name: "Cap. efetivo", value: projection.summary.capacityPerAgent, fill: "hsl(var(--chart-success))" },
  ];

  return (
    <div className="ops-shell">
      <Header
        scenario={scenario}
        onScenarioChange={handleScenarioChange}
        onReset={handleRestoreBase}
        onClearAll={handleClearAll}
        periodLabel={periodLabel}
      />

      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[320px_1fr] lg:gap-6 lg:px-6">
        <aside className="space-y-3 lg:sticky lg:top-[74px] lg:h-[calc(100vh-90px)] lg:overflow-auto lg:pb-10">
          <SidebarSection
            title="Demanda"
            description="Drivers de crescimento de base e volume de contatos"
          >
            <SimpleNumberField
              label="Clientes atuais"
              description="Base ativa no mês inicial"
              tooltip="Base de clientes atual usada para projetar o período"
              value={inputs.currentClients}
              min={1}
              onChange={(value) => patch("currentClients", value)}
            />
            <SimpleNumberField
              label="Meta de clientes até Q4"
              description="Objetivo final da base"
              tooltip="Meta de base para o mês final analisado"
              value={inputs.targetClientsQ4}
              min={1}
              onChange={(value) => patch("targetClientsQ4", value)}
            />
            <SimpleNumberField
              label="Volume atual"
              description="Referência para calibrar premissas"
              tooltip="Volume observado no cenário atual"
              value={inputs.currentVolume}
              min={0}
              onChange={(value) => patch("currentVolume", value)}
            />
            <RangeNumberField
              label="Contact rate (C.R.)"
              description="Quantidade média de chamados por cliente por mês"
              tooltip="Volume bruto = base de clientes x contact rate (se C.R. for 0, usamos volume atual / clientes atuais)"
              value={inputs.contactRate}
              min={0.5}
              max={4.5}
              step={0.01}
              onChange={(value) => patch("contactRate", clamp(value, 0.5, 4.5))}
            />
            {inputs.currentVolume > 0 && inputs.currentClients > 0 && contactRateDriftPct > 10 ? (
              <p className="text-[11px] text-warning">
                C.R. informado diverge {formatDecimal(contactRateDriftPct, 1)}% do C.R. inferido ({formatDecimal(inferredContactRate, 2)}) por volume/base atuais.
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Mês inicial</label>
                <select
                  value={inputs.startMonth}
                  onChange={(event) => patch("startMonth", Number(event.target.value))}
                  className="h-8 w-full rounded-md border bg-card px-2 text-xs"
                >
                  {monthNames.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Mês final</label>
                <select
                  value={inputs.endMonth}
                  onChange={(event) => patch("endMonth", Number(event.target.value))}
                  className="h-8 w-full rounded-md border bg-card px-2 text-xs"
                >
                  {monthNames.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Modo de crescimento</p>
                <TooltipInfo content="Linear aplica trajetória contínua até a meta; manual permite ajustar mês a mês." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={inputs.growthMode === "linear" ? "default" : "outline"}
                  onClick={() => patch("growthMode", "linear")}
                >
                  Linear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={inputs.growthMode === "manual" ? "default" : "outline"}
                  onClick={() => patch("growthMode", "manual")}
                >
                  Manual por mês
                </Button>
              </div>
            </div>

            {inputs.growthMode === "manual" ? (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">Crescimento mensal (%)</p>
                {projection.timeline.slice(1).map((point) => (
                  <div key={point.label} className="grid grid-cols-[72px_1fr] items-center gap-2">
                    <span className="mono-numbers text-xs text-muted-foreground">{point.label}</span>
                    <Input
                      type="number"
                      value={inputs.manualGrowthByMonth[point.key] ?? 0}
                       onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) =>
                        setInputs((prev) => ({
                          ...prev,
                          manualGrowthByMonth: {
                            ...prev.manualGrowthByMonth,
                            [point.key]: Number(event.target.value),
                          },
                        }))
                      }
                      className="mono-numbers h-7"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </SidebarSection>

          <SidebarSection title="IA / automação" description="Deflexão do volume antes do atendimento humano">
            <RangeNumberField
              label="% de atendimento da IA"
              description="Parcela do volume bruto absorvida antes do atendimento humano"
              tooltip="Volume IA = volume bruto x % IA"
              value={inputs.aiCoveragePct}
              min={0}
              max={90}
              step={0.5}
              onChange={(value) => patchPercent("aiCoveragePct", value)}
            />
            <RangeNumberField
              label="Crescimento mensal da IA"
              description="Ganho incremental esperado mês a mês"
              tooltip="Incremento mensal aplicado na cobertura de IA"
              value={inputs.aiGrowthMonthlyPct}
              min={0}
              max={5}
              step={0.1}
              onChange={(value) => patch("aiGrowthMonthlyPct", value)}
            />
            <RangeNumberField
              label="% automações adicionais"
              description="Impacto extra sobre redução de volume humano"
              tooltip="Aumento estrutural da deflexão por automações"
              value={inputs.extraAutomationPct}
              min={0}
              max={20}
              step={0.5}
              onChange={(value) => patchPercent("extraAutomationPct", value)}
            />
          </SidebarSection>

          <SidebarSection title="Capacidade humana" description="Produtividade nominal e complexidade de atendimento">
            <SimpleNumberField
              label="Headcount atual"
              description="Time disponível no início do período"
              tooltip="HC inicial para simulação mensal"
              value={inputs.headcountCurrent}
              min={1}
              onChange={(value) => patch("headcountCurrent", value)}
            />
            <SimpleNumberField
              label="Produtividade base por agente"
              description="Capacidade mensal nominal por agente antes de ajustes"
              tooltip="Base para cálculo de capacidade efetiva"
              value={inputs.productivityBase}
              min={100}
              onChange={(value) => patch("productivityBase", value)}
            />
            <SimpleNumberField
              label="Ramp-up (meses)"
              description="Tempo até plena produtividade"
              tooltip="Contribuição progressiva de HC: mês i contribui (i+1)/ramp-up até 100%; usado também na antecedência de abertura"
              value={inputs.rampUpMonths}
              min={1}
              max={6}
              onChange={(value) => patch("rampUpMonths", value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <SimpleNumberField
                label="TMA N1"
                description="Tempo médio de atendimento N1 (min)"
                tooltip="Afeta fator de complexidade"
                value={inputs.tmaN1}
                min={5}
                onChange={(value) => patch("tmaN1", value)}
              />
              <SimpleNumberField
                label="TMA N2"
                description="Tempo médio de atendimento N2 (min)"
                tooltip="Afeta fator de complexidade"
                value={inputs.tmaN2}
                min={5}
                onChange={(value) => patch("tmaN2", value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <RangeNumberField
                label="% N1"
                description="Participação de chamados N1"
                tooltip="Mix operacional por nível"
                value={inputs.mixN1Pct}
                min={0}
                max={100}
                step={1}
                onChange={(value) => {
                  const next = clamp(value, 0, 100);
                  patch("mixN1Pct", next);
                  patch("mixN2Pct", 100 - next);
                }}
              />
              <RangeNumberField
                label="% N2"
                description="Participação de chamados N2"
                tooltip="Mix operacional por nível"
                value={inputs.mixN2Pct}
                min={0}
                max={100}
                step={1}
                onChange={(value) => {
                  const next = clamp(value, 0, 100);
                  patch("mixN2Pct", next);
                  patch("mixN1Pct", 100 - next);
                }}
              />
            </div>
          </SidebarSection>

          <SidebarSection title="Shrinkage operacional" description="Perdas de capacidade real ao longo do mês">
            <RangeNumberField
              label="% pausas"
              description="Paradas operacionais no turno"
              tooltip="Reduz capacidade efetiva"
              value={inputs.breaksPct}
              min={0}
              max={30}
              step={0.5}
              onChange={(value) => patchPercent("breaksPct", value)}
            />
            <RangeNumberField
              label="% offchat"
              description="Tempo gasto com demandas internas fora do fluxo de atendimento"
              tooltip="Reduz capacidade efetiva"
              value={inputs.offchatPct}
              min={0}
              max={40}
              step={0.5}
              onChange={(value) => patchPercent("offchatPct", value)}
            />
            <RangeNumberField
              label="% reuniões/feedback"
              description="Tempo de alinhamento e desenvolvimento"
              tooltip="Reduz capacidade efetiva"
              value={inputs.meetingsPct}
              min={0}
              max={20}
              step={0.5}
              onChange={(value) => patchPercent("meetingsPct", value)}
            />
            <RangeNumberField
              label="% férias"
              description="Impacto mensal médio de férias"
              tooltip="Aplicado apenas ao percentual elegível"
              value={inputs.vacationPct}
              min={0}
              max={20}
              step={0.5}
              onChange={(value) => patchPercent("vacationPct", value)}
            />
            <RangeNumberField
              label="% elegíveis a férias"
              description="Percentual do time apto a entrar em férias"
              tooltip="Férias ajustadas = %férias x %elegíveis"
              value={inputs.vacationEligiblePct}
              min={0}
              max={100}
              step={1}
              onChange={(value) => patchPercent("vacationEligiblePct", value)}
            />
          </SidebarSection>

          <SidebarSection title="Turnover" description="Saídas estimadas ao longo do ano">
            <div className="space-y-2">
              <p className="text-xs font-medium">Período de cálculo</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={inputs.turnoverPeriod === "mensal" ? "default" : "outline"}
                  onClick={() => patch("turnoverPeriod", "mensal")}
                >
                  Mensal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={inputs.turnoverPeriod === "semestral" ? "default" : "outline"}
                  onClick={() => patch("turnoverPeriod", "semestral")}
                >
                  Semestral
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={inputs.turnoverPeriod === "anual" ? "default" : "outline"}
                  onClick={() => patch("turnoverPeriod", "anual")}
                >
                  Anual
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium">Formato do valor</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={inputs.turnoverInputMode === "absoluto" ? "default" : "outline"}
                  onClick={() => patch("turnoverInputMode", "absoluto")}
                >
                  Absoluto
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={inputs.turnoverInputMode === "percentual" ? "default" : "outline"}
                  onClick={() => patch("turnoverInputMode", "percentual")}
                >
                  Percentual
                </Button>
              </div>
            </div>

            <SimpleNumberField
              label={`Turnover ${inputs.turnoverPeriod}`}
              description={
                inputs.turnoverInputMode === "percentual"
                  ? "Taxa em % (base: HC disponível do mês)"
                  : "Quantidade de saídas no período selecionado"
              }
              tooltip={
                inputs.turnoverInputMode === "percentual"
                  ? "A taxa é convertida para base mensal e aplicada sobre o HC disponível nos meses marcados."
                  : "O valor absoluto é convertido para base mensal e distribuído nos meses marcados."
              }
              value={inputs.turnoverValue}
              min={0}
              max={inputs.turnoverInputMode === "percentual" ? 100 : 200}
              formatType={inputs.turnoverInputMode === "percentual" ? "decimal" : "integer"}
              decimalDigits={inputs.turnoverInputMode === "percentual" ? 1 : 0}
              onChange={(value) => patch("turnoverValue", value)}
              replaceValueOnFocus
            />
            <div className="space-y-2">
              <p className="text-xs font-medium">Distribuição mensal</p>
              <div className="grid grid-cols-2 gap-2">
                {projection.timeline.map((point) => (
                  <label
                    key={point.label}
                    className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs"
                  >
                    <Checkbox
                      checked={inputs.turnoverMonths.includes(point.key)}
                      onCheckedChange={() => toggleTurnoverMonth(point.key)}
                    />
                    {point.label}
                  </label>
                ))}
              </div>
            </div>
          </SidebarSection>

          <SidebarSection title="Regras da calculadora" description="Configuração de antecedência e estratégia de contratação">
            <SimpleNumberField
              label="Meses de antecedência"
              description="Quantos meses antes abrir a vaga"
              tooltip="Abrir vaga em = mês da necessidade - antecedência"
              value={inputs.leadTimeMonths}
              min={0}
              max={6}
              onChange={(value) => patch("leadTimeMonths", value)}
            />
            <div className="space-y-2">
              <p className="text-xs font-medium">Modo de contratação</p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={inputs.hiringMode === "gap" ? "default" : "outline"}
                  onClick={() => patch("hiringMode", "gap")}
                >
                  Contratar quando o gap aparecer
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={inputs.hiringMode === "antecipado" ? "default" : "outline"}
                  onClick={() => patch("hiringMode", "antecipado")}
                >
                  Antecipar contratação com base no ramp-up
                </Button>
              </div>
            </div>
          </SidebarSection>
        </aside>

        <main className="ambient-stage space-y-4 lg:space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <KPIWidget
              title="Volume bruto em Q4"
              subtitle="Chamados totais projetados no fim do período"
              tooltip="Volume bruto = Base de clientes do mês x Contact rate"
              value={projection.summary.volumeQ4}
              format={(value) => formatInt(value)}
            />
            <KPIWidget
              title="Volume humano em Q4"
              subtitle="Carga que chega ao atendimento humano"
              tooltip="Volume humano = Volume bruto - Volume IA"
              value={projection.summary.volumeHumanQ4}
              format={(value) => formatInt(value)}
            />
            <KPIWidget
              title="Capacity efetivo por agente"
              subtitle="Capacidade mensal após shrinkage"
              tooltip="Produtividade base x (1-pausas) x (1-offchat) x (1-reuniões) x (1-férias ajustadas)"
              value={projection.summary.capacityPerAgent}
              format={(value) => formatInt(value)}
              tone={projection.summary.capacityPerAgent > 700 ? "success" : "default"}
            />
            <KPIWidget
              title="Agentes necessários em Q4"
              subtitle="Headcount necessário no cenário atual"
              tooltip="Agentes necessários (raw) = Volume humano / Capacidade efetiva; valor exibido = teto(raw)"
              value={projection.summary.agentsNeededQ4}
              format={(value) => formatInt(value)}
              tone={projection.summary.riskMonths.length > 0 ? "risk" : "default"}
            />
            <KPIWidget
              title="Admissões no ano"
              subtitle="Crescimento + reposição por turnover"
              tooltip="Soma mensal das contratações para fechar gap"
              value={projection.summary.hiresYear}
              format={(value) => formatInt(value)}
            />
            <KPIWidget
              title="Mês crítico para abrir vaga"
              subtitle="Último mês para contratação sem atraso operacional"
              tooltip={`Mês da necessidade - lead time - maturação da rampa (ramp-up ${inputs.rampUpMonths} meses)`}
              value={projection.summary.criticalOpenMonth}
              tone={projection.summary.riskMonths.length > 0 ? "risk" : "success"}
            />
          </section>

          <InsightBanner riskMonths={projection.summary.riskMonths} />

          <section className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Evolução de volume" subtitle="Volume bruto, IA e humano ao longo do período">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip formatter={(value: number) => formatInt(value)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="volumeBruto" stroke="hsl(var(--chart-info))" strokeWidth={2} dot={false} name="Volume bruto" />
                  <Line type="monotone" dataKey="volumeIA" stroke="hsl(var(--chart-success))" strokeWidth={2} dot={false} name="Volume IA" />
                  <Line type="monotone" dataKey="volumeHumano" stroke="hsl(var(--chart-danger))" strokeWidth={2} dot={false} name="Volume humano" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Evolução de headcount" subtitle={`Agentes necessários, HC efetivo (rampa ${inputs.rampUpMonths} meses) e gap mensal`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartRows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip formatter={(value: number) => formatInt(value)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="agentesNecessarios" fill="hsl(var(--chart-info))" radius={[4, 4, 0, 0]} name="Agentes necessários" />
                  <Bar dataKey="hcDisponivel" fill="hsl(var(--chart-success))" radius={[4, 4, 0, 0]} name="HC efetivo" />
                  <Line type="monotone" dataKey="gap" stroke="hsl(var(--chart-danger))" strokeWidth={2} dot={false} name="Gap" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Impacto da IA" subtitle="Quanto da demanda total é absorvida antes do atendimento humano">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartRows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip formatter={(value: number) => formatInt(value)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area type="monotone" dataKey="volumeIA" stackId="1" stroke="hsl(var(--chart-success))" fill="hsl(var(--chart-success) / 0.35)" name="Volume IA" />
                  <Area type="monotone" dataKey="volumeHumano" stackId="1" stroke="hsl(var(--chart-danger))" fill="hsl(var(--chart-danger) / 0.25)" name="Volume humano" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Capacity x shrinkage" subtitle="Composição de perdas até chegar na capacidade efetiva final">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shrinkageData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip formatter={(value: number) => formatDecimal(value, 0)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          <HiringTimeline rows={projection.rows} />

          <MonthlyAuditPanel
            rows={projection.rows}
            contactRateSource={contactRateSource}
            resolvedContactRate={resolvedContactRate}
          />

          <MonthlyTable rows={projection.rows} />

          <p className={cn("text-xs text-muted-foreground", projection.summary.riskMonths.length ? "text-warning" : "text-success")}>
            Rampa parcial ativa no modelo com maturação em {inputs.rampUpMonths} meses.
          </p>
        </main>
      </div>
    </div>
  );
};

export default Index;
