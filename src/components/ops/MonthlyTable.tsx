import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { MonthlyProjection } from "@/features/ops-planning/types";
import { formatDecimal, formatInt, formatPct } from "@/features/ops-planning/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MonthlyTableProps {
  rows: MonthlyProjection[];
}

const exportToCSV = (rows: MonthlyProjection[]) => {
  const headers = [
    "Mês", "Base de clientes", "C.R.", "Volume bruto", "% IA",
    "Volume IA", "Volume humano", "Cap./agente", "Cap. disponível",
    "Agentes necessários", "HC nominal", "HC efetivo", "Turnover",
    "HC final", "Gap", "Contratar", "Abrir vaga em",
  ];

  const csvRows = rows.map((row) => [
    row.month.label,
    row.clientsBase,
    formatDecimal(row.contactRate, 2),
    row.volumeGross,
    formatPct(row.aiPct, 1),
    row.volumeAI,
    row.volumeHuman,
    row.capacityPerAgent,
    row.capacityAvailableTotal,
    row.agentsNeeded,
    row.hcNominalStart,
    formatDecimal(row.hcAvailableEffective, 2),
    row.turnover,
    row.hcFinal,
    row.gap,
    row.hire,
    row.openIn,
  ]);

  const csvContent = [headers, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dimensionamento-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const MonthlyTable = ({ rows }: MonthlyTableProps) => {
  return (
    <section className="ops-panel overflow-hidden">
      <header className="border-b px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="heading-tight text-sm font-semibold">Ledger Operacional</h3>
          <p className="text-xs text-muted-foreground">Visão detalhada mês a mês para demanda, capacidade e contratação.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportToCSV(rows)}
          className="gap-2 shrink-0"
          title="Exportar como CSV"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </header>

      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b text-muted-foreground">
              {[
                "Mês", "Base de clientes", "C.R.", "Volume bruto", "% IA",
                "Volume IA", "Volume humano", "Cap./agente", "Cap. disponível",
                "Agentes necessários", "HC nominal", "HC efetivo", "Turnover",
                "HC final", "Gap", "Contratar", "Abrir vaga em",
              ].map((column, colIdx) => (
                <th
                  key={column}
                  className={cn(
                    "whitespace-nowrap px-3 py-2 text-left font-medium",
                    colIdx === 0 && "sticky left-0 z-20 bg-card",
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isGapCritical = row.gap > 1;
              const bgClass = idx % 2 === 0 ? "bg-background" : "bg-muted/20";
              return (
                <tr
                  key={row.month.key}
                  className={cn(
                    bgClass,
                    isGapCritical && "bg-destructive/5",
                  )}
                >
                  <td className={cn(
                    "whitespace-nowrap px-3 py-2 font-medium sticky left-0 z-10",
                    isGapCritical ? "bg-destructive/5" : bgClass,
                  )}>
                    {row.month.label}
                  </td>
                  <td className="mono-numbers px-3 py-2">{formatInt(row.clientsBase)}</td>
                  <td className="mono-numbers px-3 py-2">{formatDecimal(row.contactRate, 2)}</td>
                  <td className="mono-numbers px-3 py-2">{formatInt(row.volumeGross)}</td>
                  <td className="mono-numbers px-3 py-2">{formatPct(row.aiPct, 1)}</td>
                  <td className="mono-numbers px-3 py-2">{formatInt(row.volumeAI)}</td>
                  <td className="mono-numbers px-3 py-2">{formatInt(row.volumeHuman)}</td>
                  <td className="mono-numbers px-3 py-2">{formatInt(row.capacityPerAgent)}</td>
                  <td className="mono-numbers px-3 py-2">{formatInt(row.capacityAvailableTotal)}</td>
                  <td className="mono-numbers px-3 py-2">{formatInt(row.agentsNeeded)}</td>
                  <td className="mono-numbers px-3 py-2">{formatInt(row.hcNominalStart)}</td>
                  <td className="mono-numbers px-3 py-2">{formatDecimal(row.hcAvailableEffective, 2)}</td>
                  <td className="mono-numbers px-3 py-2">{formatInt(row.turnover)}</td>
                  <td className="mono-numbers px-3 py-2">{formatInt(row.hcFinal)}</td>
                  <td className="mono-numbers px-3 py-2">
                    <span className={cn(
                      "inline-flex items-center rounded px-1.5 py-0.5 font-semibold",
                      row.gap === 0 ? "text-success" : row.gap <= 1 ? "text-warning" : "bg-destructive/10 text-danger",
                    )}>
                      {formatInt(row.gap)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="mono-numbers">{formatInt(row.hire)}</span>
                      {row.hire > 0 && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap leading-tight mt-0.5">
                          P/ {row.targetImpactLabel}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 rounded border bg-card px-2 py-1">
                      {row.gap > 0 ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      )}
                      {row.openIn}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
