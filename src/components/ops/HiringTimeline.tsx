import { AlertTriangle, CheckCircle2, Flame, Clock } from "lucide-react";
import { MonthlyProjection } from "@/features/ops-planning/types";
import { formatInt } from "@/features/ops-planning/format";

interface HiringTimelineProps {
  rows: MonthlyProjection[];
}

interface ActionGroup {
  openIn: string;
  months: { label: string; gap: number }[];
  totalGap: number;
  isUrgent: boolean;
}

const groupByAction = (rows: MonthlyProjection[]): ActionGroup[] => {
  const criticalRows = rows.filter((row) => row.gap > 0);
  const grouped: Record<string, ActionGroup> = {};

  for (const row of criticalRows) {
    const key = row.openIn;
    if (!grouped[key]) {
      grouped[key] = {
        openIn: key,
        months: [],
        totalGap: 0,
        isUrgent: key === "Antes do período",
      };
    }
    grouped[key].months.push({ label: row.month.label, gap: row.gap });
    grouped[key].totalGap += row.gap;
  }

  return Object.values(grouped);
};

export const HiringTimeline = ({ rows }: HiringTimelineProps) => {
  const criticalRows = rows.filter((row) => row.gap > 0);
  const groups = groupByAction(rows);

  if (criticalRows.length === 0) {
    return (
      <section className="ops-panel p-4">
        <header className="mb-3">
          <h3 className="heading-tight text-sm font-semibold">Timeline de contratação</h3>
          <p className="text-xs text-muted-foreground">Mês da necessidade vs mês ideal para abrir vaga</p>
        </header>
        <div className="flex h-40 items-center justify-center rounded-md border border-success/40 bg-success/5 text-sm text-success">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Cenário coberto sem abertura adicional de vagas.
        </div>
      </section>
    );
  }

  return (
    <section className="ops-panel p-4">
      <header className="mb-4">
        <h3 className="heading-tight text-sm font-semibold">Timeline de contratação</h3>
        <p className="text-xs text-muted-foreground">
          {criticalRows.length} mês(es) com gap detectado — agrupado por prazo de abertura de vaga
        </p>
      </header>

      <div className="space-y-3">
        {groups.map((group) => (
          <div
            key={group.openIn}
            className={`rounded-lg border p-3 ${
              group.isUrgent
                ? "border-danger/40 bg-danger/5"
                : "border-warning/40 bg-warning/5"
            }`}
          >
            {/* Cabeçalho do grupo */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                {group.isUrgent ? (
                  <Flame className="h-4 w-4 text-danger shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-warning shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Abrir vaga até:{" "}
                    <span className={group.isUrgent ? "text-danger" : "text-warning"}>
                      {group.openIn}
                    </span>
                  </p>
                  {group.isUrgent && (
                    <p className="text-[11px] text-muted-foreground">Ação imediata necessária — antes do início do período</p>
                  )}
                </div>
              </div>
              <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-card">
                Gap total: {formatInt(group.totalGap)}
              </span>
            </div>

            {/* Meses do grupo */}
            <div className="flex flex-wrap gap-2">
              {group.months.map((m) => (
                <span
                  key={m.label}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs"
                >
                  <AlertTriangle className="h-3 w-3 text-warning" />
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted-foreground">gap: {formatInt(m.gap)}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
