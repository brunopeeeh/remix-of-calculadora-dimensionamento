import { MonthlyProjection } from "@/features/ops-planning/types";
import { formatDecimal } from "@/features/ops-planning/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MonthlyAuditPanelProps {
  rows: MonthlyProjection[];
  contactRateSource: "manual" | "inferido";
  resolvedContactRate: number;
}

export const MonthlyAuditPanel = ({ rows, contactRateSource, resolvedContactRate }: MonthlyAuditPanelProps) => {
  return (
    <section className="ops-panel overflow-hidden">
      <header className="border-b px-4 py-3">
        <h3 className="heading-tight text-sm font-semibold">Painel de auditoria matemática</h3>
        <p className="text-xs text-muted-foreground">
          Conferência mensal de demanda bruta, gap efetivo e base do C.R. ({contactRateSource === "manual" ? "manual" : "inferido"} ={" "}
          {formatDecimal(resolvedContactRate, 2)}).
        </p>
      </header>

      <div className="max-h-[360px] overflow-auto">
        <Table className="text-xs">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="whitespace-nowrap">Mês</TableHead>
              <TableHead className="whitespace-nowrap">agentsNeededRaw</TableHead>
              <TableHead className="whitespace-nowrap">gapFte</TableHead>
              <TableHead className="whitespace-nowrap">Fator rampa aplicado</TableHead>
              <TableHead className="whitespace-nowrap">Origem do C.R.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const appliedRampFactor = row.hcInitial > 0 ? row.hcAvailableEffective / row.hcInitial : 0;

              return (
                <TableRow key={`audit-${row.month.key}`}>
                  <TableCell className="whitespace-nowrap font-medium">{row.month.label}</TableCell>
                  <TableCell className="mono-numbers">{formatDecimal(row.agentsNeededRaw, 2)}</TableCell>
                  <TableCell className="mono-numbers">{formatDecimal(row.gapFte, 2)}</TableCell>
                  <TableCell className="mono-numbers">{formatDecimal(appliedRampFactor, 2)}x</TableCell>
                  <TableCell className="capitalize">{contactRateSource}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};
