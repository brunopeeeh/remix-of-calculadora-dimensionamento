import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RangeNumberField } from "./RangeNumberField";
import { SimpleNumberField } from "./SimpleNumberField";
import { TooltipInfo } from "./TooltipInfo";
import { clamp, formatDecimal, formatInt } from "@/features/ops-planning/format";
import { MonthPoint, PlannerInputs } from "@/features/ops-planning/types";

interface DemandSectionProps {
  inputs: PlannerInputs;
  patch: <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => void;
  setInputs: React.Dispatch<React.SetStateAction<PlannerInputs>>;
  timeline: MonthPoint[];
  contactRateDriftPct: number;
  inferredContactRate: number;
  isAdvanced?: boolean;
}

export const DemandSection = ({
  inputs,
  patch,
  setInputs,
  timeline,
  contactRateDriftPct,
  inferredContactRate,
  isAdvanced = true,
}: DemandSectionProps) => (
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
          if (inputs.currentClients > 0) {
            const pct = Math.round(((v - inputs.currentClients) / inputs.currentClients) * 10000) / 100;
            patch("targetClientsGrowthPct", pct);
          }
        }}
      />
      {isAdvanced && (
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
      )}

      <SimpleNumberField
        label="Volume atual"
        description="Referência para calibrar premissas"
        tooltip="Volume observado no cenário atual. Alterar atualiza o C.R. automaticamente."
        value={inputs.currentVolume}
        min={0}
        onChange={(v) => {
          patch("currentVolume", v);
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

      {isAdvanced && (
        <>
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
        </>
      )}
    </AccordionContent>
  </AccordionItem>
);
