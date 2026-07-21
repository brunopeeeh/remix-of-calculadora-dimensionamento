import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RangeNumberField } from "./RangeNumberField";
import { PlannerInputs } from "@/features/ops-planning/types";

interface AISectionProps {
  inputs: PlannerInputs;
  patchPercent: <K extends keyof PlannerInputs>(key: K, value: number) => void;
  patch: <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => void;
  isAdvanced?: boolean;
}

export const AISection = ({ inputs, patchPercent, patch, isAdvanced = true }: AISectionProps) => (
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
      {isAdvanced && (
        <>
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
        </>
      )}
    </AccordionContent>
  </AccordionItem>
);
