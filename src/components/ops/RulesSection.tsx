import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SimpleNumberField } from "./SimpleNumberField";
import { PlannerInputs, HiringMode } from "@/features/ops-planning/types";

interface RulesSectionProps {
  inputs: PlannerInputs;
  patch: <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => void;
  isAdvanced?: boolean;
}

export const RulesSection = ({ inputs, patch, isAdvanced = true }: RulesSectionProps) => (
  <AccordionItem value="rules" className="ops-panel border-b-0">
    <AccordionTrigger className="px-4 py-3 hover:no-underline">
      <div className="text-left">
        <h3 className="heading-tight text-sm font-semibold">Regras da calculadora</h3>
        <p className="mt-1 text-xs text-muted-foreground">Configuração de antecedência e estratégia de contratação</p>
      </div>
    </AccordionTrigger>
    <AccordionContent className="px-4 space-y-4">
      {isAdvanced && (
        <div className="space-y-2">
          <p className="text-xs font-medium">Estratégia de contratação</p>
          <div className="grid grid-cols-2 gap-2">
            {(["antecipado", "gap"] as HiringMode[]).map((m) => (
              <Button
                key={m} type="button" size="sm"
                variant={inputs.hiringMode === m ? "default" : "outline"}
                onClick={() => patch("hiringMode", m)}
                className="capitalize"
              >
                {m === "antecipado" ? "Antecipado" : "Gap (reativo)"}
              </Button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {inputs.hiringMode === "antecipado"
              ? "Contrata antes do gap acontecer, considerando lead time e ramp-up para maturação."
              : "Contrata apenas quando o gap aparece, sem antecipação de ramp-up."}
          </p>
        </div>
      )}
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
);
