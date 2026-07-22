import { MonthlyProjection, ProjectionSummary, PlannerInputs } from "@/features/ops-planning/types";
import { formatInt } from "@/features/ops-planning/format";
import { CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutiveSummaryProps {
  rows: MonthlyProjection[];
  summary: ProjectionSummary;
  inputs: PlannerInputs;
}

/** Resume uma lista de meses em texto curto: "Jan, Fev e Mar" / "Jan–Mar" quando contíguos vira a UI, aqui só junta. */
const joinMonths = (labels: string[]): string => {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
};

export const ExecutiveSummary = ({ rows, summary, inputs }: ExecutiveSummaryProps) => {
  if (rows.length === 0) return null;

  const firstMonth = rows[0].month.label;
  const lastMonth = rows[rows.length - 1].month.label;

  // C6: somar valores brutos e arredondar o total uma vez — evita perda por
  // arredondamento de frações pequenas em múltiplos meses (ex. 0.3/mês × 12 = 3.6 → não vira 0).
  const totalTurnover = Math.round(rows.reduce((acc, r) => acc + r.turnover, 0));

  const uncoverable = summary.uncoverableMonths ?? [];
  const uncoverableAgents = summary.hiresScheduledLate ?? 0;
  const hasStructuralDeficit = uncoverable.length > 0 && uncoverableAgents > 0;
  const hasRisk = summary.riskMonths.length > 0;

  // Três estados, do pior para o melhor:
  // 1) déficit estrutural: nem contratando hoje dá para cobrir alguns meses → vai ter fila
  // 2) risco cobrível: há gap, mas contratar a tempo resolve
  // 3) balanceado
  const state: "structural" | "coverable" | "ok" = hasStructuralDeficit
    ? "structural"
    : hasRisk
    ? "coverable"
    : "ok";

  const tone =
    state === "structural"
      ? "border-danger/25 bg-danger/5"
      : state === "coverable"
      ? "border-warning/20 bg-warning/5"
      : "border-success/20 bg-success/5";

  return (
    <section className="ops-panel overflow-hidden animate-slide-up flex flex-col md:flex-row md:items-center justify-between p-4 gap-3">
      <div>
        <h2 className="heading-tight text-sm font-semibold">Resumo da Projeção</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {firstMonth} → {lastMonth} • {rows.length} meses
        </p>
      </div>

      <div className={cn("rounded-lg border px-4 py-2.5 flex items-start gap-2.5 md:max-w-2xl", tone)}>
        {state === "structural" && (
          <>
            <ShieldAlert className="h-4 w-4 shrink-0 text-danger mt-0.5" />
            <div className="text-xs leading-normal">
              <span className="font-semibold text-danger-foreground">
                Déficit inevitável em {joinMonths(uncoverable)}.
              </span>{" "}
              <span className="text-muted-foreground">
                Faltam <span className="font-medium text-foreground">{formatInt(uncoverableAgents)} agente(s)</span> que
                nenhuma contratação cobre a tempo (lead time + rampa). Antecipe o recrutamento ou planeje fila nesses meses.
                {" "}Além disso, admitir <span className="font-medium text-foreground">{formatInt(summary.hiresYear)}</span> para o restante do período.
              </span>
            </div>
          </>
        )}

        {state === "coverable" && (
          <>
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
            <div className="text-xs leading-normal">
              <span className="font-semibold text-warning-foreground">
                {summary.riskMonths.length} mês(es) com gap — cobrível contratando a tempo.
              </span>{" "}
              <span className="text-muted-foreground">
                Admitir <span className="font-medium text-foreground">{formatInt(summary.hiresYear)} agentes</span>
                {totalTurnover > 0 && <> e repor <span className="font-medium text-foreground">~{formatInt(totalTurnover)} saídas</span></>}.
                Abertura crítica até <span className="font-semibold text-foreground">{summary.criticalOpenMonth}</span>.
              </span>
            </div>
          </>
        )}

        {state === "ok" && (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success mt-0.5" />
            <span className="text-xs font-medium text-success-foreground">
              Capacidade balanceada: headcount atual atende à demanda no período.
            </span>
          </>
        )}
      </div>
    </section>
  );
};
