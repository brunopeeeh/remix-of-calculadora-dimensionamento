import { AlertTriangle, ShieldCheck } from "lucide-react";

interface InsightBannerProps {
  riskMonths: string[];
}

export const InsightBanner = ({ riskMonths }: InsightBannerProps) => {
  if (riskMonths.length === 0) {
    return (
      <div className="ops-panel flex items-center gap-2 border-success/40 bg-success/5 px-4 py-3 text-sm text-success">
        <ShieldCheck className="h-4 w-4" /> A capacidade atual cobre a demanda projetada neste cenário.
      </div>
    );
  }

  return (
    <div className="ops-panel flex flex-col gap-1 border-warning/50 bg-warning/10 px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-foreground">
        <AlertTriangle className="h-4 w-4 text-warning" /> Atenção: a capacidade atual não cobre a demanda em {riskMonths.length} meses do período.
      </p>
      <p className="text-muted-foreground">Risco de backlog em {riskMonths.join(", ")}.</p>
    </div>
  );
};
