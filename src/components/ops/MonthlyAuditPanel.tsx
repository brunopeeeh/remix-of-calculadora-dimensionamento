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
              <TableHead className="whitespace-nowrap bg-muted/30">HC iníc.</TableHead>
              <TableHead className="whitespace-nowrap bg-red-500/10 text-red-600">Turnover (início)</TableHead>
              <TableHead className="whitespace-nowrap bg-muted/30">HC após perda</TableHead>
              <TableHead className="whitespace-nowrap bg-blue-500/10 text-blue-600">HC Efetivo base</TableHead>
              <TableHead className="whitespace-nowrap bg-green-500/10 text-green-700">Capac. Disponível</TableHead>
              <TableHead className="whitespace-nowrap">Contrat. iniciadas</TableHead>
              <TableHead className="whitespace-nowrap bg-red-500/10 text-red-600">Turnover (fim)</TableHead>
              <TableHead className="whitespace-nowrap bg-muted/30">HC final</TableHead>
              <TableHead className="whitespace-nowrap">Detalhe turnover</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`audit-${row.month.key}`}>
                <TableCell className="whitespace-nowrap font-medium">{row.month.label}</TableCell>
                <TableCell className="mono-numbers">{formatDecimal(row.agentsNeededRaw, 2)}</TableCell>
                <TableCell className="mono-numbers">{formatDecimal(row.gapFte, 2)}</TableCell>
                
                <TableCell className="mono-numbers bg-muted/30">{formatDecimal(row.hcNominalStart, 0)}</TableCell>
                <TableCell className="mono-numbers bg-red-500/10 text-red-600">{row.turnoverAppliedStart > 0 ? `-${formatDecimal(row.turnoverAppliedStart, 2)}` : "-"}</TableCell>
                <TableCell className="mono-numbers bg-muted/30">{formatDecimal(row.hcNominalAfterTurnoverStart, 0)}</TableCell>
                
                <TableCell className="mono-numbers bg-blue-500/10 text-blue-600">{formatDecimal(row.hcEffectiveBeforeHires, 2)}</TableCell>
                <TableCell className="mono-numbers bg-green-500/10 text-green-700">{formatDecimal(row.hcAvailableEffective, 2)}</TableCell>
                
                <TableCell className="mono-numbers">{row.hiresStarted}</TableCell>
                
                <TableCell className="mono-numbers bg-red-500/10 text-red-600">{row.turnoverAppliedEnd > 0 ? `-${formatDecimal(row.turnoverAppliedEnd, 2)}` : "-"}</TableCell>
                <TableCell className="mono-numbers font-medium bg-muted/30">{formatDecimal(row.hcFinal, 0)}</TableCell>
                
                <TableCell>
                  <p className="text-[10px] text-muted-foreground">{row.turnoverFormula}</p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};
