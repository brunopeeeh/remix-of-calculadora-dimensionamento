import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { MonthlyProjection } from "@/features/ops-planning/types";

interface HiringTimelineProps {
  rows: MonthlyProjection[];
}

export const HiringTimeline = ({ rows }: HiringTimelineProps) => {
  const criticalRows = rows.filter((row) => row.gap > 0);

  return (
    <section className="ops-panel p-4">
      <header className="mb-3">
        <h3 className="heading-tight text-sm font-semibold">Timeline de contratação</h3>
        <p className="text-xs text-muted-foreground">Mês da necessidade vs mês ideal para abrir vaga</p>
      </header>

      {criticalRows.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-md border border-success/40 bg-success/5 text-sm text-success">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Cenário coberto sem abertura adicional de vagas.
        </div>
      ) : (
        <div className="space-y-2">
          {criticalRows.map((row) => (
            <div key={row.month.label} className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Necessidade em <span className="mono-numbers font-semibold">{row.month.label}</span>
              </div>
              <div className="mono-numbers text-muted-foreground">
                Abrir vaga em <span className="font-semibold text-foreground">{row.openIn}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
