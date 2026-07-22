import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SimpleNumberField } from "./SimpleNumberField";
import { MonthPoint, PlannerInputs } from "@/features/ops-planning/types";
import { getAutoTurnoverMonths } from "@/features/ops-planning/turnover";

interface TurnoverSectionProps {
  inputs: PlannerInputs;
  patch: <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => void;
  toggleTurnoverMonth: (monthKey: string) => void;
  timeline: MonthPoint[];
  isAdvanced?: boolean;
}

export const TurnoverSection = ({ inputs, patch, toggleTurnoverMonth, timeline, isAdvanced = true }: TurnoverSectionProps) => (
  <AccordionItem value="turnover" className="ops-panel border-b-0">
    <AccordionTrigger className="px-4 py-3 hover:no-underline">
      <div className="text-left">
        <h3 className="heading-tight text-sm font-semibold">Turnover</h3>
        <p className="mt-1 text-xs text-muted-foreground">Saídas estimadas ao longo do ano</p>
      </div>
    </AccordionTrigger>
    <AccordionContent className="px-4 space-y-4">
      {isAdvanced && (
        <>
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

          {inputs.turnoverInputMode === "percentual" && (
            <div className="space-y-2">
              <p className="text-xs font-medium">Base do percentual</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={(inputs.turnoverBaseMode ?? "hc_corrente") === "hc_inicial" ? "default" : "outline"}
                  onClick={() => patch("turnoverBaseMode", "hc_inicial")}
                >
                  HC inicial
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={(inputs.turnoverBaseMode ?? "hc_corrente") === "hc_corrente" ? "default" : "outline"}
                  onClick={() => patch("turnoverBaseMode", "hc_corrente")}
                >
                  HC do mês
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {(inputs.turnoverBaseMode ?? "hc_corrente") === "hc_inicial"
                  ? "Total de saídas = taxa × HC de hoje (bate com o número do RH)."
                  : "Incide sobre o HC de cada mês; como o time cresce, o total fica acima da taxa nominal."}
              </p>
            </div>
          )}

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
        </>
      )}

      <SimpleNumberField
        label={`Turnover ${inputs.turnoverPeriod}`}
        description={inputs.turnoverInputMode === "percentual" ? ((inputs.turnoverBaseMode ?? "hc_corrente") === "hc_inicial" ? "Taxa em % (base: HC inicial, fixo)" : "Taxa em % (base: HC do mês)") : "Quantidade de saídas no período selecionado"}
        tooltip={inputs.turnoverInputMode === "percentual" ? "A taxa é convertida para base mensal e aplicada sobre o HC disponível nos meses marcados." : "O valor absoluto é convertido para base mensal e distribuído nos meses marcados."}
        value={inputs.turnoverValue}
        min={0}
        max={inputs.turnoverInputMode === "percentual" ? 100 : 200}
        formatType={inputs.turnoverInputMode === "percentual" ? "decimal" : "integer"}
        decimalDigits={inputs.turnoverInputMode === "percentual" ? 1 : 0}
        onChange={(v) => patch("turnoverValue", v)}
        replaceValueOnFocus
      />

      {isAdvanced && (
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
                <label key={point.key} htmlFor={`turnover-month-${point.key}`} className={`flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs ${isManual ? "cursor-pointer" : "opacity-70"}`}>
                  <Checkbox
                    id={`turnover-month-${point.key}`}
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
      )}
    </AccordionContent>
  </AccordionItem>
);
