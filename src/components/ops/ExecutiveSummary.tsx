import { MonthlyProjection, ProjectionSummary, PlannerInputs } from "@/features/ops-planning/types";
import { formatInt } from "@/features/ops-planning/format";
import { TrendingUp, Users, Brain, Shield, CheckCircle2, AlertTriangle } from "lucide-react";

interface ExecutiveSummaryProps {
  rows: MonthlyProjection[];
  summary: ProjectionSummary;
  inputs: PlannerInputs;
}

export const ExecutiveSummary = ({ rows, summary, inputs }: ExecutiveSummaryProps) => {
  if (rows.length === 0) return null;

  const firstMonth = rows[0].month.label;
  const lastMonth = rows[rows.length - 1].month.label;

  const clientGrowth = inputs.targetClientsQ4 - inputs.currentClients;
  const clientGrowthPct = inputs.currentClients > 0
    ? ((clientGrowth / inputs.currentClients) * 100).toFixed(0)
    : "0";

  const aiNow = inputs.aiCoveragePct;
  const aiLater = rows.length > 0
    ? rows[rows.length - 1].aiPct.toFixed(0)
    : aiNow.toString();

  const hasRisk = summary.riskMonths.length > 0;
  const totalTurnover = rows.reduce((acc, r) => acc + Math.round(r.turnover), 0);

  return (
    <section className="rounded-lg border bg-card">
      {/* Header */}
      <div className="border-b px-4 py-2.5">
        <h2 className="text-xs font-semibold text-foreground">Resumo da projeção</h2>
        <p className="text-[11px] text-muted-foreground">
          {firstMonth} → {lastMonth} • {rows.length} meses
        </p>
      </div>

      <div className="grid gap-px border-b bg-muted/30 sm:grid-cols-2 lg:grid-cols-4">
        {/* Clientes */}
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Clientes</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="mono-numbers text-lg font-semibold text-foreground">
              {formatInt(inputs.currentClients)} → {formatInt(inputs.targetClientsQ4)}
            </span>
            {clientGrowth > 0 && (
              <span className="text-xs font-medium text-success">+{clientGrowthPct}%</span>
            )}
          </div>
        </div>

        {/* Volume humano */}
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Vol. humano/mês</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="mono-numbers text-lg font-semibold text-foreground">
              {formatInt(rows[0].volumeHuman)} → {formatInt(summary.volumeHumanQ4)}
            </span>
          </div>
        </div>

        {/* IA */}
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Cobertura IA</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="mono-numbers text-lg font-semibold text-foreground">
              {aiNow}% → {aiLater}%
            </span>
          </div>
        </div>

        {/* Agentes necessários */}
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Agentes Q4</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="mono-numbers text-lg font-semibold text-foreground">
              {formatInt(summary.agentsNeededQ4)}
            </span>
            <span className="text-[10px] text-muted-foreground">({formatInt(summary.capacityPerAgent)}/agente)</span>
          </div>
        </div>
      </div>

      {/* Rodapé: ação necessária */}
      <div className={`px-4 py-3 ${hasRisk ? "bg-warning/5" : "bg-success/5"}`}>
        {hasRisk ? (
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="text-sm">
              <span className="font-medium text-foreground">
                {summary.riskMonths.length} mês(es) com gap de capacidade
              </span>
              <p className="text-xs text-muted-foreground">
                Precisará de <span className="font-medium text-foreground">{formatInt(summary.hiresYear)} admissão(ões)</span>
                {totalTurnover > 0 && (
                  <> e repor <span className="font-medium text-foreground">~{formatInt(totalTurnover)} saída(s)</span></>
                )}
                . Abrir vagas até <span className="font-medium text-foreground">{summary.criticalOpenMonth}</span>.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span className="text-sm text-success">
              Headcount atual suficiente — nenhuma contratação adicional necessária.
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
