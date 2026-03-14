import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { MonthlyProjection } from "@/features/ops-planning/types";
import { formatDecimal, formatInt, formatPct } from "@/features/ops-planning/format";

interface MonthlyTableProps {
  rows: MonthlyProjection[];
}

export const MonthlyTable = ({ rows }: MonthlyTableProps) => {
  return (
    <section className="ops-panel overflow-hidden">
      <header className="border-b px-4 py-3">
        <h3 className="heading-tight text-sm font-semibold">Operational Ledger</h3>
        <p className="text-xs text-muted-foreground">Visão detalhada mês a mês para demanda, capacidade e contratação.</p>
      </header>

      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b text-muted-foreground">
              {[
                "Mês",
                "Base de clientes",
                "C.R.",
                "Volume bruto",
                "% IA",
                "Volume IA",
                "Volume humano",
                "Capacidade efetiva/agente",
                "Agentes necessários",
                "HC inicial",
                "Turnover",
                "HC final",
                "Gap",
                "Contratar",
                "Abrir vaga em",
              ].map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.month.label} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                <td className="whitespace-nowrap px-3 py-2 font-medium">{row.month.label}</td>
                <td className="mono-numbers px-3 py-2">{formatInt(row.clientsBase)}</td>
                <td className="mono-numbers px-3 py-2">{formatDecimal(row.contactRate, 2)}</td>
                <td className="mono-numbers px-3 py-2">{formatInt(row.volumeGross)}</td>
                <td className="mono-numbers px-3 py-2">{formatPct(row.aiPct, 1)}</td>
                <td className="mono-numbers px-3 py-2">{formatInt(row.volumeAI)}</td>
                <td className="mono-numbers px-3 py-2">{formatInt(row.volumeHuman)}</td>
                <td className="mono-numbers px-3 py-2">{formatInt(row.capacityPerAgent)}</td>
                <td className="mono-numbers px-3 py-2">{formatInt(row.agentsNeeded)}</td>
                <td className="mono-numbers px-3 py-2">{formatInt(row.hcInitial)}</td>
                <td className="mono-numbers px-3 py-2">{formatInt(row.turnover)}</td>
                <td className="mono-numbers px-3 py-2">{formatInt(row.hcFinal)}</td>
                <td className="mono-numbers px-3 py-2">
                  <span
                    className={
                      row.gap === 0
                        ? "text-success"
                        : row.gap <= 1
                          ? "text-warning"
                          : "text-danger"
                    }
                  >
                    {formatInt(row.gap)}
                  </span>
                </td>
                <td className="mono-numbers px-3 py-2">{formatInt(row.hire)}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
