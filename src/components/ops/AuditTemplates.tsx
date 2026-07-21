import { Sparkles, Scale, BrainCircuit, TrendingUp } from "lucide-react";

interface AuditTemplatesProps {
  onRunAudit: (type: "general" | "ai_impact" | "turnover_sensitivity") => void;
  isDisabled: boolean;
  isLoading: boolean;
}

export const AuditTemplates = ({ onRunAudit, isDisabled, isLoading }: AuditTemplatesProps) => (
  <div className="glass-panel p-4 flex flex-col gap-3">
    <div>
      <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        Modelos de Auditoria Rápida
      </h4>
      <p className="text-xs text-muted-foreground mt-1">
        Dispare análises imediatas alimentando a IA com os dados calculados da sua planilha.
      </p>
    </div>

    <div className="flex flex-col gap-2">
      <button
        onClick={() => onRunAudit("general")}
        disabled={isDisabled || isLoading}
        className="flex items-start text-left p-3 rounded-lg border border-border bg-card hover:bg-muted/30 hover:border-primary/40 transition-all active:scale-[0.99] disabled:opacity-50"
      >
        <Scale className="h-5 w-5 text-primary shrink-0 mr-3 mt-0.5" />
        <div>
          <span className="text-xs font-semibold block text-foreground">Auditoria Geral de Staffing & Janela de Contratação</span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block leading-normal">
            Identifica meses de déficit e calcula datas retroativas de recrutamento (lead time + rampa).
          </span>
        </div>
      </button>

      <button
        onClick={() => onRunAudit("ai_impact")}
        disabled={isDisabled || isLoading}
        className="flex items-start text-left p-3 rounded-lg border border-border bg-card hover:bg-muted/30 hover:border-primary/40 transition-all active:scale-[0.99] disabled:opacity-50"
      >
        <BrainCircuit className="h-5 w-5 text-primary shrink-0 mr-3 mt-0.5" />
        <div>
          <span className="text-xs font-semibold block text-foreground">Estudo de Deflexão e Eficiência por IA</span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block leading-normal">
            Mapeia a economia real de headcount gerada pela cobertura de IA e sugere o ponto ideal de automação.
          </span>
        </div>
      </button>

      <button
        onClick={() => onRunAudit("turnover_sensitivity")}
        disabled={isDisabled || isLoading}
        className="flex items-start text-left p-3 rounded-lg border border-border bg-card hover:bg-muted/30 hover:border-primary/40 transition-all active:scale-[0.99] disabled:opacity-50"
      >
        <TrendingUp className="h-5 w-5 text-primary shrink-0 mr-3 mt-0.5" />
        <div>
          <span className="text-xs font-semibold block text-foreground">Análise de Risco de Turnover & Sensibilidade de TMA</span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block leading-normal">
            Simula cenários de estresse de +20% no TMA e prevê colapsos por rotatividade de pessoal.
          </span>
        </div>
      </button>
    </div>
  </div>
);
