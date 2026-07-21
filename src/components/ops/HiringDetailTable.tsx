import { MonthlyProjection } from "@/features/ops-planning/types";
import { formatInt, formatDecimal } from "@/features/ops-planning/format";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, Flame } from "lucide-react";

interface HiringDetailTableProps {
  rows: MonthlyProjection[];
}

const RiskBadge = ({ risk }: { risk: MonthlyProjection["risk"] }) => {
  if (risk === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
        <CheckCircle2 className="h-3 w-3" /> OK
      </span>
    );
  }
  if (risk === "attention") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
        <Clock className="h-3 w-3" /> Atenção
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
      <Flame className="h-3 w-3" /> Crítico
    </span>
  );
};

export const HiringDetailTable = ({ rows }: HiringDetailTableProps) => {
  return (
    <section className="ops-panel p-4">
      <header className="mb-3">
        <h3 className="heading-tight text-sm font-semibold">Detalhamento mensal do plano</h3>
        <p className="text-xs text-muted-foreground">
          Visão mês a mês de demanda, capacidade, gap e ações de contratação
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Mês</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Demanda</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">HC Efetivo</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Gap</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Vagas abertas</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Admissões</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Abrir até</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.month.key}
                className={cn(
                  "border-b border-border/20 transition-colors hover:bg-muted/20",
                  row.risk === "critical" && "bg-danger/5",
                  row.risk === "attention" && "bg-warning/5",
                )}
              >
                <td className="px-3 py-2 font-medium text-foreground">
                  {row.month.label}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {formatInt(row.agentsNeeded)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {formatDecimal(row.hcAvailableEffective, 1)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums font-semibold",
                    row.gap > 0 ? "text-danger" : "text-success",
                  )}
                >
                  {row.gap > 0 ? `−${formatInt(row.gap)}` : "0"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {row.hiresOpened > 0 ? formatInt(row.hiresOpened) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {row.hiresStarted > 0 ? formatInt(row.hiresStarted) : "—"}
                </td>
                <td className="px-3 py-2 text-left text-muted-foreground">
                  {row.gap > 0 ? (
                    <span
                      className={cn(
                        "font-medium",
                        row.openIn === "Antes do período" ? "text-danger" : "text-warning",
                      )}
                    >
                      {row.openIn}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <RiskBadge risk={row.risk} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
