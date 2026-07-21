import { Checkbox } from "@/components/ui/checkbox";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RangeNumberField } from "./RangeNumberField";
import { SimpleNumberField } from "./SimpleNumberField";
import { PlannerInputs } from "@/features/ops-planning/types";

interface ShrinkageSectionProps {
  inputs: PlannerInputs;
  patch: <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => void;
  patchPercent: <K extends keyof PlannerInputs>(key: K, value: number) => void;
}

export const ShrinkageSection = ({ inputs, patch, patchPercent }: ShrinkageSectionProps) => (
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
      <RangeNumberField label="% pausas/descanso" description="Tempo de pausas legais e intervalos" tooltip="Reduz capacidade efetiva" value={inputs.breaksPct} min={0} max={30} step={0.5} onChange={(v) => patchPercent("breaksPct", v)} />
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
        label="Promoções no período"
        description="Quantidade de agentes promovidos (N1 → N2) durante a projeção"
        tooltip="Agentes promovidos reduzem o mix N1 e aumentam o mix N2, elevando o TMA ponderado e reduzindo a capacidade por agente"
        value={inputs.promotionsCount}
        min={0}
        formatType="integer"
        onChange={(v) => patch("promotionsCount", v)}
      />
    </AccordionContent>
  </AccordionItem>
);
