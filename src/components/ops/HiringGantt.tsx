import { MonthlyProjection } from "@/features/ops-planning/types";
import { formatInt } from "@/features/ops-planning/format";
import { cn } from "@/lib/utils";

interface CohortBar {
  id: number;
  count: number;
  openIdx: number;
  startIdx: number;
  fullRampIdx: number;
  openLabel: string;
}

interface HiringGanttProps {
  rows: MonthlyProjection[];
  leadTimeMonths: number;
  rampUpMonths: number;
}

const extractCohorts = (
  rows: MonthlyProjection[],
  leadTime: number,
  rampUp: number,
): CohortBar[] => {
  const cohorts: CohortBar[] = [];
  let id = 0;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].hiresOpened > 0) {
      cohorts.push({
        id: id++,
        count: rows[i].hiresOpened,
        openIdx: i,
        startIdx: i + leadTime,
        fullRampIdx: i + leadTime + Math.max(0, rampUp - 1),
        openLabel: rows[i].month.label,
      });
    }
  }

  return cohorts;
};

type Phase = "open" | "lead" | "ramp-early" | "ramp-mid" | "ramp-late" | "full" | "none";

const getPhase = (
  cellIdx: number,
  cohort: CohortBar,
  rampUpMonths: number,
): Phase => {
  if (cellIdx < cohort.openIdx || cellIdx > cohort.fullRampIdx) return "none";
  if (cellIdx === cohort.openIdx) return "open";
  if (cellIdx > cohort.openIdx && cellIdx < cohort.startIdx) return "lead";
  if (cellIdx >= cohort.startIdx && cellIdx < cohort.fullRampIdx) {
    const rampProgress = (cellIdx - cohort.startIdx + 1) / Math.max(1, rampUpMonths);
    if (rampProgress <= 0.33) return "ramp-early";
    if (rampProgress <= 0.66) return "ramp-mid";
    return "ramp-late";
  }
  if (cellIdx === cohort.fullRampIdx) return "full";
  return "none";
};

const phaseStyles: Record<Exclude<Phase, "none">, string> = {
  open: "bg-danger/70 border-danger/90 shadow-[0_0_6px_hsl(var(--chart-danger)/0.3)]",
  lead: "bg-warning/30 border-warning/50",
  "ramp-early": "bg-warning/40 border-warning/60",
  "ramp-mid": "bg-amber-500/40 border-amber-500/50 dark:bg-amber-400/30 dark:border-amber-400/40",
  "ramp-late": "bg-success/40 border-success/50",
  full: "bg-success/70 border-success/90 shadow-[0_0_6px_hsl(var(--chart-success)/0.3)]",
};

const phaseLabels: Record<Exclude<Phase, "none">, string> = {
  open: "🔴",
  lead: "⏳",
  "ramp-early": "⅓",
  "ramp-mid": "⅔",
  "ramp-late": "⅔+",
  full: "✅",
};

export const HiringGantt = ({ rows, leadTimeMonths, rampUpMonths }: HiringGanttProps) => {
  const cohorts = extractCohorts(rows, leadTimeMonths, rampUpMonths);
  const totalMonths = rows.length;

  if (cohorts.length === 0) return null;

  return (
    <section className="ops-panel p-4">
      <header className="mb-4">
        <h3 className="heading-tight text-sm font-semibold">Gantt de contratações</h3>
        <p className="text-xs text-muted-foreground">
          Ciclo de vida de cada cohort: abertura → lead time ({leadTimeMonths}m) → ramp-up ({rampUpMonths}m) → 100%
        </p>
      </header>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-danger/70" /> Abertura
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-warning/40" /> Lead time
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500/40 dark:bg-amber-400/30" /> Ramp-up
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-success/70" /> Produtivo
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/50">
        <div className="min-w-[640px]">
          {/* Timeline header */}
          <div
            className="grid border-b border-border/50 bg-muted/30"
            style={{ gridTemplateColumns: `100px repeat(${totalMonths}, 1fr)` }}
          >
            <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
              Turma
            </div>
            {rows.map((r, i) => (
              <div
                key={i}
                className={cn(
                  "px-0.5 py-1.5 text-center text-[10px] text-muted-foreground truncate",
                  r.gap > 0 && "text-warning font-medium",
                )}
              >
                {r.month.label.replace("/", "\n").split("\n")[0]}
              </div>
            ))}
          </div>

          {/* Cohort rows */}
          {cohorts.map((cohort) => (
            <div
              key={cohort.id}
              className="grid items-center border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors"
              style={{ gridTemplateColumns: `100px repeat(${totalMonths}, 1fr)` }}
            >
              {/* Cohort label */}
              <div className="flex items-center gap-1 px-2 py-2">
                <span className="text-[11px] font-medium truncate">{cohort.openLabel}</span>
                <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                  {formatInt(cohort.count)}
                </span>
              </div>

              {/* Timeline cells */}
              {Array.from({ length: totalMonths }, (_, i) => {
                const phase = getPhase(i, cohort, rampUpMonths);

                if (phase === "none") {
                  return <div key={i} className="h-7" />;
                }

                return (
                  <div key={i} className="px-px py-0.5 h-7 flex items-center">
                    <div
                      className={cn(
                        "h-full w-full rounded-sm border flex items-center justify-center text-[9px] transition-all",
                        phaseStyles[phase],
                      )}
                      title={`${cohort.openLabel} — ${phase}`}
                    >
                      {phaseLabels[phase]}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
