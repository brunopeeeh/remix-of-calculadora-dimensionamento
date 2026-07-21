import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PlannerInputs } from "@/features/ops-planning/types";
import { DEFAULT_ROOKIE_RAMP_FACTORS } from "@/features/ops-planning/scenarios";
import { computeRookieEffectiveForMonth } from "@/features/ops-planning/ramp";

interface CapacitySectionProps {
  inputs: PlannerInputs;
  patch: <K extends keyof PlannerInputs>(key: K | ((prev: PlannerInputs) => Partial<PlannerInputs>), value?: PlannerInputs[K]) => void;
  patchPercent: <K extends keyof PlannerInputs>(key: K, value: number) => void;
  isAdvanced?: boolean;
}

export const CapacitySection = ({ inputs, patch, patchPercent, isAdvanced = true }: CapacitySectionProps) => {
  const hcNovo = inputs.headcountNovo ?? 0;
  const rampFactors = inputs.rookieRampFactors;
  const rookieMonth1 = computeRookieEffectiveForMonth(hcNovo, 0, rampFactors);
  const rookieMonth2 = computeRookieEffectiveForMonth(hcNovo, 1, rampFactors);
  const rookieMonth3 = computeRookieEffectiveForMonth(hcNovo, 2, rampFactors);
  const totalEffective = inputs.headcountPleno + rookieMonth1;

  return (
    <AccordionItem value="capacity" className="ops-panel border-b-0">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="text-left">
          <h3 className="heading-tight text-sm font-semibold">Capacidade humana</h3>
          <p className="mt-1 text-xs text-muted-foreground">Produtividade nominal e complexidade de atendimento</p>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 space-y-4">
        {/* ── Headcount ── */}
        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Headcount</p>
            <TooltipInfo content="Headcount atual (plenos a 100%) e novos contratados que passarão por ramp-up de 3 meses." />
          </div>

          <SimpleNumberField
            label="Headcount Atual"
            description="Agentes operando a 100% de produtividade"
            tooltip="Agentes que já completaram o treinamento e operam a capacidade máxima."
            value={inputs.headcountPleno}
            min={0}
            onChange={(v) => patch("headcountPleno", v)}
          />

          {isAdvanced && (
            <SimpleNumberField
              label="Headcount Novo"
              description="Novos agentes que entrarão em ramp-up"
              tooltip="Novos contratados que passarão por 3 meses de ramp-up progressivo antes de atingir 100% de produtividade."
              value={inputs.headcountNovo}
              min={0}
              onChange={(v) => patch("headcountNovo", v)}
            />
          )}

          {isAdvanced && hcNovo > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Projeção de Ramp-up ({hcNovo} novos)</p>
              {[
                { label: "Mês 1", factor: rampFactors.month1, fte: rookieMonth1 },
                { label: "Mês 2", factor: rampFactors.month2, fte: rookieMonth2 },
                { label: "Mês 3", factor: rampFactors.month3, fte: rookieMonth3 },
              ].map(({ label, factor, fte }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{label} ({Math.round(factor * 100)}%)</span>
                  <span className="mono-numbers font-medium">{formatDecimal(fte, 1)} FTE</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Plenos</span>
              <span className="mono-numbers font-medium">{formatInt(inputs.headcountPleno)}</span>
            </div>
            {hcNovo > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Novos (FTE mês 1)</span>
                <span className="mono-numbers font-medium text-warning">{formatDecimal(rookieMonth1, 1)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
              <span className="text-muted-foreground">HC Total Nominal</span>
              <span className="mono-numbers font-medium">{formatInt(inputs.headcountPleno + inputs.headcountNovo)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
              <span className="font-semibold">HC Total Efetivo</span>
              <span className="mono-numbers font-bold text-primary">{formatDecimal(totalEffective, 1)}</span>
            </div>
          </div>
        </div>

        {/* ── Fatores de Ramp-up ── */}
        {isAdvanced && (
          <div className="space-y-2 rounded-md border bg-card px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Fatores de Ramp-up</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => patch("rookieRampFactors" as keyof PlannerInputs, { ...DEFAULT_ROOKIE_RAMP_FACTORS } as unknown as PlannerInputs[keyof PlannerInputs])}
                >
                  Restaurar padrão
                </Button>
                <TooltipInfo content="Percentual de produtividade esperado para cada mês de treinamento. Padrão: 33% / 66% / 100%." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["month1", "month2", "month3"] as const).map((key, idx) => (
                <div key={key} className="space-y-1">
                  <label htmlFor={`rookie-factor-${key}`} className="text-[10px] text-muted-foreground">Mês {idx + 1}</label>
                  <Input
                    id={`rookie-factor-${key}`}
                    name={`rookie-factor-${key}`}
                    type="number"
                    value={Math.round(inputs.rookieRampFactors[key] * 100)}
                    min={0}
                    max={100}
                    step={1}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      const safeValue = Number.isNaN(raw) ? 0 : clamp(raw, 0, 100);
                      patch((prev) => ({
                        ...prev,
                        rookieRampFactors: {
                          ...prev.rookieRampFactors,
                          [key]: safeValue / 100,
                        },
                      }));
                    }}
                    className="mono-numbers h-7 text-center"
                  />
                  <p className="text-[9px] text-center text-muted-foreground">{Math.round(inputs.rookieRampFactors[key] * 100)}%</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAdvanced && (
          <SimpleNumberField
            label="Produtividade base por agente"
            description="Capacidade mensal nominal por agente antes de ajustes"
            tooltip="Base para cálculo de capacidade efetiva"
            value={inputs.productivityBase}
            min={100}
            onChange={(v) => patch("productivityBase", v)}
          />
        )}
        {isAdvanced && (
          <SimpleNumberField
            label="Ramp-up (meses)"
            description="Tempo até plena produtividade (para novas contratações)"
            tooltip="Contribuição progressiva de HC: mês i contribui (i+1)/ramp-up até 100%; usado também na antecedência de abertura"
            value={inputs.rampUpMonths}
            min={1} max={6}
            onChange={(v) => patch("rampUpMonths", v)}
          />
        )}

        {isAdvanced && (
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
        )}

        <div className={isAdvanced && inputs.useN1N2Split ? "grid grid-cols-2 gap-2" : "block"}>
          <SimpleNumberField
            label={isAdvanced && inputs.useN1N2Split ? "TMA N1" : "TMA Médio"}
            description={isAdvanced && inputs.useN1N2Split ? "Tempo médio N1 (min)" : "Tempo médio de atendimento (min)"}
            tooltip="Afeta fator de complexidade"
            value={inputs.tmaN1}
            min={5}
            onChange={(v) => patch("tmaN1", v)}
          />
          {isAdvanced && inputs.useN1N2Split && (
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

        {isAdvanced && inputs.useN1N2Split && (
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
  );
};
