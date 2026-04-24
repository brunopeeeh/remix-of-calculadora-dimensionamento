import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RangeNumberField } from "./RangeNumberField";
import { SimpleNumberField } from "./SimpleNumberField";
import { TooltipInfo } from "./TooltipInfo";
import { clamp, formatDecimal, formatInt, monthNames } from "@/features/ops-planning/format";
import { PlannerInputs, MonthPoint } from "@/features/ops-planning/types";
import { getAutoTurnoverMonths } from "@/features/ops-planning/turnover";
import { BASE_YEAR } from "@/features/ops-planning/scenarios";

interface SidebarPanelProps {
  inputs: PlannerInputs;
  advancedFormatting: boolean;
  setAdvancedFormatting: (v: boolean) => void;
  patch: <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => void;
  patchPercent: <K extends keyof PlannerInputs>(key: K, value: number) => void;
  setInputs: React.Dispatch<React.SetStateAction<PlannerInputs>>;
  toggleTurnoverMonth: (monthKey: string) => void;
  timeline: MonthPoint[];
  contactRateDriftPct: number;
  inferredContactRate: number;
}

export const SidebarPanel = ({
  inputs,
  advancedFormatting,
  setAdvancedFormatting,
  patch,
  patchPercent,
  setInputs,
  toggleTurnoverMonth,
  timeline,
  contactRateDriftPct,
  inferredContactRate,
}: SidebarPanelProps) => {
  // Mirror computeCapacityPerAgent exactly so sidebar estimates match the engine.
  const BASE_WEIGHTED_TMA = 20 * 0.8 + 45 * 0.2; // 25 min — same constant as capacity.ts
  const weightedTma = inputs.useN1N2Split
    ? (inputs.tmaN1 * inputs.mixN1Pct) / 100 + (inputs.tmaN2 * inputs.mixN2Pct) / 100
    : inputs.tmaN1;
  const complexityFactor = weightedTma > 0 ? clamp(BASE_WEIGHTED_TMA / weightedTma, 0.7, 1.4) : 1;
  const adjustedVacationPct = (inputs.vacationPct / 100) * (inputs.vacationEligiblePct / 100);
  const shrinkageFactor =
    (1 - inputs.breaksPct / 100) *
    (1 - inputs.offchatPct / 100) *
    (1 - inputs.meetingsPct / 100) *
    (1 - adjustedVacationPct);
  const capacityPerAgent = inputs.productivityBase * complexityFactor * shrinkageFactor;
  const monthlyDemand = inputs.currentClients * inputs.contactRate;
  const projectedDemand = inputs.targetClientsQ4 * inputs.contactRate;
  const agentsNeededNow = Math.ceil(monthlyDemand / Math.max(1, capacityPerAgent));
  const agentsNeededQ4 = Math.ceil(projectedDemand / Math.max(1, capacityPerAgent));
  const totalGrowthPct = inputs.currentClients > 0 ? ((inputs.targetClientsQ4 - inputs.currentClients) / inputs.currentClients * 100).toFixed(1) : 0;
  const totalVolumeGrowth = inputs.currentVolume > 0 ? ((inputs.targetClientsQ4 * inputs.contactRate - inputs.currentVolume) / inputs.currentVolume * 100).toFixed(1) : 0;

  return (
    <aside className="space-y-3 lg:sticky lg:top-[74px] lg:h-[calc(100vh-90px)] lg:overflow-auto lg:pb-10">
      {/* ── Alertas de Validação ── */}
      {(() => {
        const warnings: { field: string; message: string }[] = [];
        if (inputs.headcountCurrent < 1) warnings.push({ field: "HC", message: "Headcount deve ser ≥ 1" });
        if (inputs.productivityBase < 100) warnings.push({ field: "Prod.", message: "Produtividade mínima recomendada: 100" });
        if (inputs.tmaN1 <= 0) warnings.push({ field: "TMA", message: "TMA deve ser > 0" });
        if (inputs.contactRate <= 0) warnings.push({ field: "C.R.", message: "Contact rate deve ser > 0" });
        if (inputs.rampUpMonths < 1) warnings.push({ field: "Ramp-up", message: "Ramp-up mínimo: 1 mês" });
        if (inputs.leadTimeMonths < 0) warnings.push({ field: "Lead time", message: "Lead time não pode ser negativo" });
        
        if (warnings.length > 0) {
          return (
            <div className="ops-panel p-4 border-l-4 border-l-warning">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-warning text-sm font-semibold">⚠️ Validação</span>
              </div>
              <ul className="space-y-1 text-xs">
                {warnings.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-medium text-muted-foreground">{w.field}:</span>
                    <span>{w.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return null;
      })()}

      <Accordion
        type="multiple"
        defaultValue={["period", "demand", "ai", "capacity", "shrinkage", "turnover", "rules"]}
        className="space-y-3"
      >
        {/* ── Período ── */}
        <AccordionItem value="period" className="ops-panel border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="text-left">
              <h3 className="heading-tight text-sm font-semibold">Período de análise</h3>
              <p className="mt-1 text-xs text-muted-foreground">Mês e ano inicial/final da projeção</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Mês inicial</label>
                <Select
                  value={String(inputs.startMonth)}
                  onValueChange={(v) => {
                    const newStart = Number(v);
                    patch("startMonth", newStart);
                    if (newStart > inputs.endMonth && inputs.startYear === inputs.endYear) {
                      patch("endMonth", Math.min(newStart + 1, 12));
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((name, idx) => (
                      <SelectItem key={name} value={String(idx + 1)} className="text-xs">{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Mês final</label>
                <Select
                  value={String(inputs.endMonth)}
                  onValueChange={(v) => {
                    const newEnd = Number(v);
                    if (newEnd < inputs.startMonth && inputs.endYear === inputs.startYear) {
                      patch("startMonth", Math.max(newEnd - 1, 1));
                    }
                    patch("endMonth", newEnd);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((name, idx) => (
                      <SelectItem key={name} value={String(idx + 1)} className="text-xs">{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Ano inicial</label>
                <Select
                  value={String(inputs.startYear)}
                  onValueChange={(v) => {
                    const newStartYear = Number(v);
                    patch("startYear", newStartYear);
                    if (newStartYear > inputs.endYear) {
                      patch("endYear", newStartYear);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => BASE_YEAR + i).map((year) => (
                      <SelectItem key={year} value={String(year)} className="text-xs">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Ano final</label>
                <Select
                  value={String(inputs.endYear)}
                  onValueChange={(v) => {
                    const newEndYear = Number(v);
                    patch("endYear", newEndYear);
                    if (newEndYear < inputs.startYear) {
                      patch("startYear", newEndYear);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => BASE_YEAR + i).map((year) => (
                      <SelectItem key={year} value={String(year)} className="text-xs">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Configurações ── */}
        <AccordionItem value="config" className="ops-panel border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="text-left">
              <h3 className="heading-tight text-sm font-semibold">Experiência de entrada</h3>
              <p className="mt-1 text-xs text-muted-foreground">Controle visual de máscara numérica</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4">
            <div className="space-y-2 rounded-md border bg-card px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">Formato avançado</p>
                <Button
                  type="button"
                  size="sm"
                  variant={advancedFormatting ? "default" : "outline"}
                  onClick={() => setAdvancedFormatting(!advancedFormatting)}
                >
                  {advancedFormatting ? "Ativado" : "Desativado"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ativado: exibe máscara pt-BR no blur. Desativado: mantém números crus.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Demanda ── */}
        <AccordionItem value="demand" className="ops-panel border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="text-left">
              <h3 className="heading-tight text-sm font-semibold">Demanda</h3>
              <p className="mt-1 text-xs text-muted-foreground">Drivers de crescimento de base e volume de contatos</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-4">
            <SimpleNumberField
              label="Clientes atuais"
              description="Base ativa no mês inicial"
              tooltip="Base de clientes atual usada para projetar o período"
              value={inputs.currentClients}
              min={1}
              onChange={(v) => {
                patch("currentClients", v);
                // Recalculate currentVolume from contactRate when clients change
                if (inputs.contactRate > 0) {
                  patch("currentVolume", Math.round(v * inputs.contactRate));
                }
              }}
            />
            <SimpleNumberField
              label="Meta de clientes até o período final"
              description="Objetivo final da base de clientes"
              tooltip="Meta de base para o mês final analisado"
              value={inputs.targetClientsQ4}
              min={1}
              onChange={(v) => {
                patch("targetClientsQ4", v);
                // Auto-calculate growth percentage when clients > 0
                if (inputs.currentClients > 0) {
                  const pct = Math.round(((v - inputs.currentClients) / inputs.currentClients) * 10000) / 100;
                  patch("targetClientsGrowthPct", pct);
                }
              }}
            />
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Definir meta por</p>
                <TooltipInfo content="Escolha inserir o valor absoluto da meta ou a % de crescimento sobre a base atual." />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <SimpleNumberField
                  label={inputs.targetClientsGrowthPct > 0 ? `% crescimento (${formatInt(inputs.currentClients)} → ${formatInt(Math.round(inputs.currentClients * (1 + inputs.targetClientsGrowthPct / 100)))})` : "% crescimento"}
                  description="Percentual de crescimento sobre a base atual"
                  tooltip="Meta = Clientes atuais × (1 + % / 100)"
                  value={inputs.targetClientsGrowthPct}
                  min={0}
                  formatType="decimal"
                  decimalDigits={1}
                  onChange={(v) => {
                    patch("targetClientsGrowthPct", v);
                    // Auto-calculate targetClientsQ4 when percentage changes
                    if (inputs.currentClients > 0) {
                      patch("targetClientsQ4", Math.round(inputs.currentClients * (1 + v / 100)));
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Sync: recalculate percentage from current target
                    if (inputs.currentClients > 0 && inputs.targetClientsQ4 > 0) {
                      const pct = Math.round(((inputs.targetClientsQ4 - inputs.currentClients) / inputs.currentClients) * 10000) / 100;
                      patch("targetClientsGrowthPct", pct);
                    }
                  }}
                  className="h-8 shrink-0 text-xs"
                >
                  Sincronizar
                </Button>
              </div>
            </div>
            <SimpleNumberField
              label="Volume atual"
              description="Referência para calibrar premissas"
              tooltip="Volume observado no cenário atual. Alterar atualiza o C.R. automaticamente."
              value={inputs.currentVolume}
              min={0}
              onChange={(v) => {
                patch("currentVolume", v);
                // Auto-calculate contactRate when volume changes and clients > 0
                if (inputs.currentClients > 0) {
                  patch("contactRate", Math.round((v / inputs.currentClients) * 100) / 100);
                }
              }}
            />
            <RangeNumberField
              label="Contact rate (C.R.)"
              description="Quantidade média de chamados por cliente por mês"
              tooltip="Volume bruto = base de clientes x contact rate. Alterar atualiza o volume automaticamente."
              value={inputs.contactRate}
              min={0.5}
              max={4.5}
              step={0.01}
              onChange={(v) => {
                const clamped = clamp(v, 0.5, 4.5);
                patch("contactRate", clamped);
                // Auto-calculate currentVolume when contactRate changes and clients > 0
                if (inputs.currentClients > 0) {
                  patch("currentVolume", Math.round(inputs.currentClients * clamped));
                }
              }}
            />
            {inputs.currentVolume > 0 && inputs.currentClients > 0 && contactRateDriftPct > 10 ? (
              <p className="text-[11px] text-warning">
                C.R. informado diverge {formatDecimal(contactRateDriftPct, 1)}% do C.R. inferido ({formatDecimal(inferredContactRate, 2)}) por volume/base atuais.
              </p>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Modo de crescimento</p>
                <TooltipInfo content="Linear aplica trajetória contínua até a meta; manual permite ajustar mês a mês." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" size="sm" variant={inputs.growthMode === "linear" ? "default" : "outline"} onClick={() => patch("growthMode", "linear")}>Linear</Button>
                <Button type="button" size="sm" variant={inputs.growthMode === "manual" ? "default" : "outline"} onClick={() => patch("growthMode", "manual")}>Manual por mês</Button>
              </div>
            </div>

            {inputs.growthMode === "manual" ? (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">Crescimento mensal (%)</p>
                {timeline.slice(1).map((point) => {
                  const currentValue = inputs.manualGrowthByMonth?.[point.key] ?? 0;
                  const displayValue = Number.isNaN(currentValue) ? 0 : currentValue;
                  return (
                    <div key={point.key} className="grid grid-cols-[72px_1fr] items-center gap-2">
                      <span className="mono-numbers text-xs text-muted-foreground">{point.label}</span>
                      <Input
                        type="number"
                        value={displayValue}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          const safeValue = Number.isNaN(raw) ? 0 : raw;
                          setInputs((prev) => ({
                            ...prev,
                            manualGrowthByMonth: {
                              ...(prev.manualGrowthByMonth || {}),
                              [point.key]: safeValue,
                            },
                          }));
                        }}
                        className="mono-numbers h-7"
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Sazonalidade de Volume (%)</p>
                <TooltipInfo content="Ajuste manual para prever picos de volume que não dependem do crescimento da base de clientes." />
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">Variação extra sobre o volume bruto do mês.</p>
              {timeline.slice(1).map((point) => {
                const currentValue = inputs.manualSeasonalityByMonth?.[point.key] ?? 0;
                const numericValue = Number.isNaN(currentValue) ? 0 : currentValue;
                // Show empty string when 0 so the user can type directly without clearing "0"
                const displayValue = numericValue === 0 ? "" : String(numericValue);
                const hasValue = numericValue !== 0;
                return (
                  <div key={point.key} className="grid grid-cols-[72px_1fr] items-center gap-2 mb-2">
                    <span className={`mono-numbers text-xs ${hasValue ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {point.label}
                    </span>
                    <Input
                      type="number"
                      value={displayValue}
                      placeholder="0"
                      onChange={(e) => {
                        const raw = Number(e.target.value);
                        const safeValue = Number.isNaN(raw) ? 0 : raw;
                        setInputs((prev) => ({
                          ...prev,
                          manualSeasonalityByMonth: {
                            ...(prev.manualSeasonalityByMonth || {}),
                            [point.key]: safeValue,
                          },
                        }));
                      }}
                      onBlur={(e) => {
                        if (e.target.value === "") {
                          setInputs((prev) => ({
                            ...prev,
                            manualSeasonalityByMonth: {
                              ...(prev.manualSeasonalityByMonth || {}),
                              [point.key]: 0,
                            },
                          }));
                        }
                      }}
                      className={`mono-numbers h-7 ${hasValue ? "border-primary/50 bg-primary/5" : ""}`}
                    />
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── IA / automação ── */}
        <AccordionItem value="ai" className="ops-panel border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="text-left">
              <h3 className="heading-tight text-sm font-semibold">IA / automação</h3>
              <p className="mt-1 text-xs text-muted-foreground">Deflexão do volume antes do atendimento humano</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-4">
            <RangeNumberField
              label="% de atendimento da IA"
              description="Parcela do volume bruto absorvida antes do atendimento humano"
              tooltip="Volume IA = volume bruto x % IA"
              value={inputs.aiCoveragePct}
              min={0} max={90} step={0.5}
              onChange={(v) => patchPercent("aiCoveragePct", v)}
            />
            <RangeNumberField
              label="Crescimento mensal da IA"
              description="Ganho incremental esperado mês a mês"
              tooltip="Incremento mensal aplicado na cobertura de IA"
              value={inputs.aiGrowthMonthlyPct}
              min={0} max={5} step={0.1}
              onChange={(v) => patch("aiGrowthMonthlyPct", v)}
            />
            <RangeNumberField
              label="% automações adicionais"
              description="Impacto extra sobre redução de volume humano"
              tooltip="Aumento estrutural da deflexão por automações"
              value={inputs.extraAutomationPct}
              min={0} max={20} step={0.5}
              onChange={(v) => patchPercent("extraAutomationPct", v)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ── Capacidade humana ── */}
        <AccordionItem value="capacity" className="ops-panel border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="text-left">
              <h3 className="heading-tight text-sm font-semibold">Capacidade humana</h3>
              <p className="mt-1 text-xs text-muted-foreground">Produtividade nominal e complexidade de atendimento</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-4">
            <SimpleNumberField
              label="Headcount atual"
              description="Time disponível no início do período"
              tooltip="HC inicial para simulação mensal"
              value={inputs.headcountCurrent}
              min={1}
              onChange={(v) => patch("headcountCurrent", v)}
            />
            <SimpleNumberField
              label="Produtividade base por agente"
              description="Capacidade mensal nominal por agente antes de ajustes"
              tooltip="Base para cálculo de capacidade efetiva"
              value={inputs.productivityBase}
              min={100}
              onChange={(v) => patch("productivityBase", v)}
            />
            <SimpleNumberField
              label="Ramp-up (meses)"
              description="Tempo até plena produtividade"
              tooltip="Contribuição progressiva de HC: mês i contribui (i+1)/ramp-up até 100%; usado também na antecedência de abertura"
              value={inputs.rampUpMonths}
              min={1} max={6}
              onChange={(v) => patch("rampUpMonths", v)}
            />
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
              <Checkbox
                id="useN1N2Split"
                checked={inputs.useN1N2Split}
                onCheckedChange={(checked) => patch("useN1N2Split", !!checked)}
              />
              <label htmlFor="useN1N2Split" className="text-xs font-medium cursor-pointer">
                Dividir TMA por Nível (N1/N2)
              </label>
              <TooltipInfo content="Ative para ponderar a capacidade entre chamados simples (N1) e complexos (N2)." />
            </div>

            <div className={inputs.useN1N2Split ? "grid grid-cols-2 gap-2" : "block"}>
              <SimpleNumberField
                label={inputs.useN1N2Split ? "TMA N1" : "TMA Médio"}
                description={inputs.useN1N2Split ? "Tempo médio N1 (min)" : "Tempo médio de atendimento (min)"}
                tooltip="Afeta fator de complexidade"
                value={inputs.tmaN1}
                min={5}
                onChange={(v) => patch("tmaN1", v)}
              />
              {inputs.useN1N2Split && (
                <SimpleNumberField
                  label="TMA N2"
                  description="Tempo médio N2 (min)"
                  tooltip="Afeta fator de complexidade"
                  value={inputs.tmaN2}
                  min={5}
                  onChange={(v) => patch("tmaN2", v)}
                />
              )}
            </div>

            {inputs.useN1N2Split && (
              <div className="grid grid-cols-2 gap-2">
                <RangeNumberField
                  label="% N1"
                  description="Chamados N1"
                  tooltip="Mix operacional por nível"
                  value={inputs.mixN1Pct}
                  min={1} max={99} step={1}
                  onChange={(v) => {
                    const next = clamp(v, 1, 99);
                    patch("mixN1Pct", next);
                    patch("mixN2Pct", 100 - next);
                  }}
                />
                <RangeNumberField
                  label="% N2"
                  description="Chamados N2"
                  tooltip="Mix operacional por nível"
                  value={inputs.mixN2Pct}
                  min={1} max={99} step={1}
                  onChange={(v) => {
                    const next = clamp(v, 1, 99);
                    patch("mixN2Pct", next);
                    patch("mixN1Pct", 100 - next);
                  }}
                />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ── Shrinkage operacional ── */}
        <AccordionItem value="shrinkage" className="ops-panel border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="text-left">
              <h3 className="heading-tight text-sm font-semibold">Shrinkage operacional</h3>
              <p className="mt-1 text-xs text-muted-foreground">Perdas de capacidade real ao longo do mês</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-4">
            <RangeNumberField label="% offchat" description="Tempo gasto com demandas internas fora do fluxo de atendimento" tooltip="Reduz capacidade efetiva" value={inputs.offchatPct} min={0} max={40} step={0.5} onChange={(v) => patchPercent("offchatPct", v)} />
            <RangeNumberField label="% reuniões/feedback" description="Tempo de alinhamento e desenvolvimento" tooltip="Reduz capacidade efetiva" value={inputs.meetingsPct} min={0} max={20} step={0.5} onChange={(v) => patchPercent("meetingsPct", v)} />
            <RangeNumberField label="% férias" description="Impacto mensal médio de férias" tooltip="Aplicado apenas ao percentual elegível" value={inputs.vacationPct} min={0} max={20} step={0.5} onChange={(v) => patchPercent("vacationPct", v)} />
            <RangeNumberField label="% elegíveis a férias" description="Percentual do time apto a entrar em férias" tooltip="Férias ajustadas = %férias x %elegíveis" value={inputs.vacationEligiblePct} min={0} max={100} step={1} onChange={(v) => patchPercent("vacationEligiblePct", v)} />
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="useTenureVacation"
                  checked={inputs.useTenureVacation}
                  onCheckedChange={(checked) => patch("useTenureVacation", !!checked)}
                />
                <label htmlFor="useTenureVacation" className="text-xs font-medium cursor-pointer">
                  Calcular por tempo de casa
                </label>
              </div>
              {inputs.useTenureVacation && (
                <SimpleNumberField
                  label="Agentes com +1 ano"
                  description="Agentes com direito a férias (mais de 1 ano de casa)"
                  tooltip="Informe quantos agentes têm mais de 1 ano de casa e têm direito a férias. Máximo 1 agente por período de 15 dias."
                  value={inputs.agentsWithTenure}
                  min={0}
                  max={inputs.headcountCurrent}
                  formatType="integer"
                  onChange={(v) => patch("agentsWithTenure", v)}
                />
              )}
            </div>
            <SimpleNumberField
              label="Promoções no ano"
              description="Quantidade de agentes promovidos durante o ano"
              tooltip="Agentes promovidos mudam de perfil e podem impactar a capacidade"
              value={inputs.promotionsCount}
              min={0}
              formatType="integer"
              onChange={(v) => patch("promotionsCount", v)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ── Turnover ── */}
        <AccordionItem value="turnover" className="ops-panel border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="text-left">
              <h3 className="heading-tight text-sm font-semibold">Turnover</h3>
              <p className="mt-1 text-xs text-muted-foreground">Saídas estimadas ao longo do ano</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium">Período de cálculo</p>
              <div className="grid grid-cols-2 gap-2">
                {(["mensal", "trimestral", "semestral", "anual"] as const).map((p) => (
                  <Button key={p} type="button" size="sm" variant={inputs.turnoverPeriod === p ? "default" : "outline"} onClick={() => patch("turnoverPeriod", p)} className="capitalize">{p}</Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium">Formato do valor</p>
              <div className="grid grid-cols-2 gap-2">
                {(["absoluto", "percentual"] as const).map((m) => (
                  <Button key={m} type="button" size="sm" variant={inputs.turnoverInputMode === m ? "default" : "outline"} onClick={() => patch("turnoverInputMode", m)} className="capitalize">{m}</Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium">Aplicação no mês</p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" size="sm" variant={inputs.turnoverTiming === "start_of_month" ? "default" : "outline"} onClick={() => patch("turnoverTiming", "start_of_month")}>Início do mês</Button>
                <Button type="button" size="sm" variant={inputs.turnoverTiming === "end_of_month" ? "default" : "outline"} onClick={() => patch("turnoverTiming", "end_of_month")}>Fim do mês</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {inputs.turnoverTiming === "start_of_month"
                  ? "Saídas são descontadas antes de avaliar gap e contratação."
                  : "Saídas são descontadas após contratação e ramp-up do mês."}
              </p>
            </div>

            <SimpleNumberField
              label={`Turnover ${inputs.turnoverPeriod}`}
              description={inputs.turnoverInputMode === "percentual" ? "Taxa em % (base: HC disponível do mês)" : "Quantidade de saídas no período selecionado"}
              tooltip={inputs.turnoverInputMode === "percentual" ? "A taxa é convertida para base mensal e aplicada sobre o HC disponível nos meses marcados." : "O valor absoluto é convertido para base mensal e distribuído nos meses marcados."}
              value={inputs.turnoverValue}
              min={0}
              max={inputs.turnoverInputMode === "percentual" ? 100 : 200}
              formatType={inputs.turnoverInputMode === "percentual" ? "decimal" : "integer"}
              decimalDigits={inputs.turnoverInputMode === "percentual" ? 1 : 0}
              onChange={(v) => patch("turnoverValue", v)}
              replaceValueOnFocus
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Distribuição mensal</p>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">
                    {inputs.turnoverMonths.length > 0 ? "Manual" : "Automático"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {timeline.map((point) => {
                  const autoMonths = getAutoTurnoverMonths(inputs.turnoverPeriod, timeline);
                  const isManual = inputs.turnoverMonths.length > 0;
                  const isChecked = isManual
                    ? inputs.turnoverMonths.includes(point.key)
                    : autoMonths.includes(point.key);
                  return (
                    <label key={point.key} className={`flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs ${isManual ? "cursor-pointer" : "opacity-70"}`}>
                      <Checkbox
                        checked={!!isChecked}
                        disabled={!isManual}
                        onCheckedChange={() => {
                          if (isManual) {
                            toggleTurnoverMonth(point.key);
                          }
                        }}
                      />
                      {point.label}
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {inputs.turnoverMonths.length > 0
                  ? "Seleção manual ativa. Clique para alternar meses."
                  : "Baseado no período selecionado. Defina um valor de turnover para ativar."}
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Regras da calculadora ── */}
        <AccordionItem value="rules" className="ops-panel border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="text-left">
              <h3 className="heading-tight text-sm font-semibold">Regras da calculadora</h3>
              <p className="mt-1 text-xs text-muted-foreground">Configuração de antecedência e estratégia de contratação</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-4">
            <SimpleNumberField
              label="Meses de antecedência (lead time)"
              description="Quantos meses entre abrir a vaga e o contratado iniciar"
              tooltip="Lead time: tempo entre abertura da vaga e início do trabalho. Afeta diretamente quando a capacidade entra na simulação."
              value={inputs.leadTimeMonths}
              min={0} max={6}
              onChange={(v) => patch("leadTimeMonths", v)}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </aside>
  );
};
