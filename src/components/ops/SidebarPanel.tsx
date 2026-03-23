import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RangeNumberField } from "./RangeNumberField";
import { SimpleNumberField } from "./SimpleNumberField";
import { SidebarSection } from "./SidebarSection";
import { TooltipInfo } from "./TooltipInfo";
import { clamp, formatDecimal, monthNames } from "@/features/ops-planning/format";
import { PlannerInputs, MonthPoint } from "@/features/ops-planning/types";

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
  return (
    <aside className="space-y-3 lg:sticky lg:top-[74px] lg:h-[calc(100vh-90px)] lg:overflow-auto lg:pb-10">
      <SidebarSection title="Experiência de entrada" description="Controle visual de máscara numérica">
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
      </SidebarSection>

      <SidebarSection title="Demanda" description="Drivers de crescimento de base e volume de contatos">
        <SimpleNumberField
          label="Clientes atuais"
          description="Base ativa no mês inicial"
          tooltip="Base de clientes atual usada para projetar o período"
          value={inputs.currentClients}
          min={1}
          onChange={(v) => patch("currentClients", v)}
        />
        <SimpleNumberField
          label="Meta de clientes até Q4"
          description="Objetivo final da base"
          tooltip="Meta de base para o mês final analisado"
          value={inputs.targetClientsQ4}
          min={1}
          onChange={(v) => patch("targetClientsQ4", v)}
        />
        <SimpleNumberField
          label="Volume atual"
          description="Referência para calibrar premissas"
          tooltip="Volume observado no cenário atual"
          value={inputs.currentVolume}
          min={0}
          onChange={(v) => patch("currentVolume", v)}
        />
        <RangeNumberField
          label="Contact rate (C.R.)"
          description="Quantidade média de chamados por cliente por mês"
          tooltip="Volume bruto = base de clientes x contact rate (se C.R. for 0, usamos volume atual / clientes atuais)"
          value={inputs.contactRate}
          min={0.5}
          max={4.5}
          step={0.01}
          onChange={(v) => patch("contactRate", clamp(v, 0.5, 4.5))}
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
              onChange={(e) => patch("startMonth", Number(e.target.value))}
              className="h-8 w-full rounded-md border bg-card px-2 text-xs"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Mês final</label>
            <select
              value={inputs.endMonth}
              onChange={(e) => patch("endMonth", Number(e.target.value))}
              className="h-8 w-full rounded-md border bg-card px-2 text-xs"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx + 1}>{name}</option>
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
            <Button type="button" size="sm" variant={inputs.growthMode === "linear" ? "default" : "outline"} onClick={() => patch("growthMode", "linear")}>Linear</Button>
            <Button type="button" size="sm" variant={inputs.growthMode === "manual" ? "default" : "outline"} onClick={() => patch("growthMode", "manual")}>Manual por mês</Button>
          </div>
        </div>

        {inputs.growthMode === "manual" ? (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <p className="text-[11px] text-muted-foreground">Crescimento mensal (%)</p>
            {timeline.slice(1).map((point) => (
              <div key={point.label} className="grid grid-cols-[72px_1fr] items-center gap-2">
                <span className="mono-numbers text-xs text-muted-foreground">{point.label}</span>
                <Input
                  type="number"
                  value={inputs.manualGrowthByMonth[point.key] ?? 0}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      manualGrowthByMonth: {
                        ...prev.manualGrowthByMonth,
                        [point.key]: Number(e.target.value),
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
      </SidebarSection>

      <SidebarSection title="Capacidade humana" description="Produtividade nominal e complexidade de atendimento">
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
        <div className="grid grid-cols-2 gap-2">
          <SimpleNumberField label="TMA N1" description="Tempo médio de atendimento N1 (min)" tooltip="Afeta fator de complexidade" value={inputs.tmaN1} min={5} onChange={(v) => patch("tmaN1", v)} />
          <SimpleNumberField label="TMA N2" description="Tempo médio de atendimento N2 (min)" tooltip="Afeta fator de complexidade" value={inputs.tmaN2} min={5} onChange={(v) => patch("tmaN2", v)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <RangeNumberField
            label="% N1" description="Participação de chamados N1" tooltip="Mix operacional por nível"
            value={inputs.mixN1Pct} min={0} max={100} step={1}
            onChange={(v) => { const next = clamp(v, 0, 100); patch("mixN1Pct", next); patch("mixN2Pct", 100 - next); }}
          />
          <RangeNumberField
            label="% N2" description="Participação de chamados N2" tooltip="Mix operacional por nível"
            value={inputs.mixN2Pct} min={0} max={100} step={1}
            onChange={(v) => { const next = clamp(v, 0, 100); patch("mixN2Pct", next); patch("mixN1Pct", 100 - next); }}
          />
        </div>
      </SidebarSection>

      <SidebarSection title="Shrinkage operacional" description="Perdas de capacidade real ao longo do mês">
        <RangeNumberField label="% pausas" description="Paradas operacionais no turno" tooltip="Reduz capacidade efetiva" value={inputs.breaksPct} min={0} max={30} step={0.5} onChange={(v) => patchPercent("breaksPct", v)} />
        <RangeNumberField label="% offchat" description="Tempo gasto com demandas internas fora do fluxo de atendimento" tooltip="Reduz capacidade efetiva" value={inputs.offchatPct} min={0} max={40} step={0.5} onChange={(v) => patchPercent("offchatPct", v)} />
        <RangeNumberField label="% reuniões/feedback" description="Tempo de alinhamento e desenvolvimento" tooltip="Reduz capacidade efetiva" value={inputs.meetingsPct} min={0} max={20} step={0.5} onChange={(v) => patchPercent("meetingsPct", v)} />
        <RangeNumberField label="% férias" description="Impacto mensal médio de férias" tooltip="Aplicado apenas ao percentual elegível" value={inputs.vacationPct} min={0} max={20} step={0.5} onChange={(v) => patchPercent("vacationPct", v)} />
        <RangeNumberField label="% elegíveis a férias" description="Percentual do time apto a entrar em férias" tooltip="Férias ajustadas = %férias x %elegíveis" value={inputs.vacationEligiblePct} min={0} max={100} step={1} onChange={(v) => patchPercent("vacationEligiblePct", v)} />
      </SidebarSection>

      <SidebarSection title="Turnover" description="Saídas estimadas ao longo do ano">
        <div className="space-y-2">
          <p className="text-xs font-medium">Período de cálculo</p>
          <div className="grid grid-cols-3 gap-2">
            {(["mensal", "semestral", "anual"] as const).map((p) => (
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
          <p className="text-xs font-medium">Distribuição mensal</p>
          <div className="grid grid-cols-2 gap-2">
            {timeline.map((point) => (
              <label key={point.label} className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs">
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
          label="Meses de antecedência (lead time)"
          description="Quantos meses entre abrir a vaga e o contratado iniciar"
          tooltip="Lead time: tempo entre abertura da vaga e início do trabalho. Afeta diretamente quando a capacidade entra na simulação."
          value={inputs.leadTimeMonths}
          min={0} max={6}
          onChange={(v) => patch("leadTimeMonths", v)}
        />
        <div className="space-y-2">
          <p className="text-xs font-medium">Modo de contratação</p>
          <div className="grid grid-cols-1 gap-2">
            <Button type="button" size="sm" variant={inputs.hiringMode === "gap" ? "default" : "outline"} onClick={() => patch("hiringMode", "gap")}>
              Contratar quando o gap aparecer
            </Button>
            <Button type="button" size="sm" variant={inputs.hiringMode === "antecipado" ? "default" : "outline"} onClick={() => patch("hiringMode", "antecipado")}>
              Antecipar contratação com base no ramp-up
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {inputs.hiringMode === "gap"
              ? "Vaga aberta no mês do gap. Contratado inicia após lead time, sem antecipação para maturação."
              : "Vaga aberta antecipadamente para que o contratado esteja maduro no mês do gap."}
          </p>
        </div>
      </SidebarSection>
    </aside>
  );
};
