import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

interface ConfigSectionProps {
  advancedFormatting: boolean;
  setAdvancedFormatting: (v: boolean) => void;
}

export const ConfigSection = ({ advancedFormatting, setAdvancedFormatting }: ConfigSectionProps) => (
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
);
