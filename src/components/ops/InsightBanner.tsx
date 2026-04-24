import { AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import { MonthlyProjection } from "@/features/ops-planning/types";
import { formatInt } from "@/features/ops-planning/format";

interface InsightBannerProps {
  riskMonths: string[];
  rows: MonthlyProjection[];
  onGoToHiring?: () => void;
  hasHiringTab: boolean;
}

export const InsightBanner = ({ riskMonths, rows, onGoToHiring, hasHiringTab }: InsightBannerProps) => {
  if (riskMonths.length === 0) {
    return (
      <div className="ops-panel flex items-center gap-2 border-success/40 bg-success/5 px-4 py-3 text-sm text-success">
        <ShieldCheck className="h-4 w-4" /> A capacidade atual cobre a demanda projetada neste cenário.
      </div>
    );
  }

  // Calculate total gap and total hires needed
  const totalGap = rows.reduce((acc, r) => acc + r.gap, 0);
  const totalHiresStarted = rows.reduce((acc, r) => acc + r.hiresStarted, 0);
  const totalHiresOpened = rows.reduce((acc, r) => acc + r.hiresOpened, 0);

  // Find the first month where hiring action is recommended
  const firstHiringAction = rows.find(r => r.hiresOpened > 0 || r.openIn !== "Antes do período");
  const firstActionLabel = firstHiringAction
    ? firstHiringAction.openIn
    : riskMonths[0];

  // Find the peak gap month
  const peakGapRow = rows.length > 0
    ? rows.reduce((max, r) => r.gap > max.gap ? r : max, rows[0])
    : null;

  return (
    <div className="ops-panel space-y-2 border-warning/50 bg-warning/10 px-4 py-3 text-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" /> Gap de {formatInt(totalGap)} agente(s) em {riskMonths.length} mês(es)
          </p>
          <p className="text-muted-foreground">
            Pico de {formatInt(peakGapRow?.gap ?? 0)} agente(s) em <strong className="text-foreground">{peakGapRow?.month.label ?? "N/A"}</strong>.
            {totalHiresStarted > 0 && <> O plano prevê <strong className="text-foreground">{formatInt(totalHiresStarted)} admissão(ões)</strong> para cobrir o gap.</>}
          </p>
        </div>
        {hasHiringTab && onGoToHiring && (
          <button
            type="button"
            onClick={onGoToHiring}
            className="mt-1 flex shrink-0 items-center gap-1 rounded-md bg-warning/20 px-3 py-1.5 text-xs font-medium text-warning-foreground transition-colors hover:bg-warning/30"
          >
            Ver plano de ação
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
