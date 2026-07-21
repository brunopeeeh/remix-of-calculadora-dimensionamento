import { PlannerInputs } from "@/features/ops-planning/types";

interface ValidationAlertProps {
  inputs: PlannerInputs;
}

const timelineMonths = (inputs: PlannerInputs) => {
  const startTotal = inputs.startYear * 12 + inputs.startMonth;
  const endTotal = inputs.endYear * 12 + inputs.endMonth;
  return endTotal - startTotal + 1;
};

export const ValidationAlert = ({ inputs }: ValidationAlertProps) => {
  const warnings: { field: string; message: string }[] = [];
  if (inputs.headcountCurrent < 1) warnings.push({ field: "HC", message: "Headcount deve ser ≥ 1" });
  if (inputs.productivityBase < 100) warnings.push({ field: "Prod.", message: "Produtividade mínima recomendada: 100" });
  if (inputs.tmaN1 <= 0) warnings.push({ field: "TMA", message: "TMA deve ser > 0" });
  if (inputs.contactRate <= 0) warnings.push({ field: "C.R.", message: "Contact rate deve ser > 0" });
  if (inputs.rampUpMonths < 1) warnings.push({ field: "Ramp-up", message: "Ramp-up mínimo: 1 mês" });
  if (inputs.leadTimeMonths < 0) warnings.push({ field: "Lead time", message: "Lead time não pode ser negativo" });

  const totalMonths = timelineMonths(inputs);
  if (inputs.leadTimeMonths + inputs.rampUpMonths > totalMonths) {
    warnings.push({
      field: "Timeline",
      message: `Lead time (${inputs.leadTimeMonths}m) + ramp-up (${inputs.rampUpMonths}m) excede a projeção (${totalMonths}m). Contratações podem não maturar a tempo.`,
    });
  }
  if (inputs.aiCoveragePct + inputs.extraAutomationPct > 100) {
    warnings.push({
      field: "Automação",
      message: `Cobertura IA (${inputs.aiCoveragePct}%) + automações extras (${inputs.extraAutomationPct}%) ultrapassa 100%.`,
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="ops-panel p-4 border-l-4 border-l-warning">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-warning text-sm font-semibold">Validação</span>
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
};
