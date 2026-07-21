import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Clock,
  Users,
  UserPlus,
  TrendingUp,
  CalendarClock,
  Target,
} from "lucide-react";
import { MonthlyProjection } from "@/features/ops-planning/types";
import { formatInt } from "@/features/ops-planning/format";
import { Button } from "@/components/ui/button";
import { KPIWidget } from "./KPIWidget";
import { HiringGantt } from "./HiringGantt";
import { HiringDetailTable } from "./HiringDetailTable";

interface HiringTimelineProps {
  rows: MonthlyProjection[];
  leadTimeMonths: number;
  rampUpMonths: number;
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

export const HiringTimeline = ({ rows, leadTimeMonths, rampUpMonths }: HiringTimelineProps) => {
  const [showDetail, setShowDetail] = useState(false);
  const criticalRows = rows.filter((row) => row.gap > 0);
  const actionableRows = rows.filter((row) => row.gap > 0 || row.hiresOpened > 0 || row.hiresStarted > 0);
  const groups = groupByAction(rows);

  if (criticalRows.length === 0) {
    return (
      <section className="ops-panel p-4">
        <header className="mb-3">
          <h3 className="heading-tight text-sm font-semibold">Plano de ação</h3>
          <p className="text-xs text-muted-foreground">Análise de gaps e timeline de contratação</p>
        </header>
        <div className="flex h-40 items-center justify-center rounded-md border border-success/40 bg-success/5 text-sm text-success">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Cenário coberto sem abertura adicional de vagas.
        </div>
      </section>
    );
  }

  // Compute plan-specific KPIs
  const totalHires = rows.reduce((acc, r) => acc + r.hiresOpened, 0);
  const peakGap = Math.max(...rows.map((r) => r.gap));
  const peakGapMonth = rows.find((r) => r.gap === peakGap);
  const firstAction = rows.find((r) => r.hiresOpened > 0);
  const urgentCount = groups.filter((g) => g.isUrgent).reduce((acc, g) => acc + g.totalGap, 0);

  return (
    <div className="space-y-4">
      {/* ══ 1. Plan KPIs ══ */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPIWidget
          index={0}
          icon={UserPlus}
          title="Total de contratações"
          subtitle="Vagas a abrir no período"
          tooltip="Soma de todas as aberturas de vaga planejadas para cobrir os gaps de capacidade"
          value={totalHires}
          format={(v) => formatInt(v as number)}
          tone={totalHires > 0 ? "risk" : "default"}
          isProminent
        />
        <KPIWidget
          index={1}
          icon={AlertTriangle}
          title="Meses em risco"
          subtitle="Com deficit de capacidade"
          tooltip="Quantidade de meses onde a demanda excede a capacidade efetiva disponível"
          value={criticalRows.length}
          format={(v) => `${v} mês(es)`}
          tone={criticalRows.length > 2 ? "risk" : "default"}
        />
        <KPIWidget
          index={2}
          icon={TrendingUp}
          title="Pico de gap"
          subtitle={peakGapMonth ? `em ${peakGapMonth.month.label}` : "—"}
          tooltip="Mês com maior deficit entre demanda e capacidade disponível"
          value={peakGap}
          format={(v) => `${formatInt(v as number)} agente(s)`}
          tone="risk"
        />
        <KPIWidget
          index={3}
          icon={CalendarClock}
          title="Primeira ação"
          subtitle="Mês para abrir primeira vaga"
          tooltip="Primeiro mês onde uma vaga deve ser aberta para evitar gap futuro"
          value={firstAction?.month.label ?? "—"}
          tone={firstAction ? "risk" : "success"}
          isProminent
        />
      </section>

      {/* ══ 2. Gantt Chart ══ */}
      <HiringGantt
        rows={rows}
        leadTimeMonths={leadTimeMonths}
        rampUpMonths={rampUpMonths}
      />

      {/* ══ 5. Action Groups (original) ══ */}
      <section className="ops-panel p-4">
        <header className="mb-4">
          <h3 className="heading-tight text-sm font-semibold">Ações de contratação</h3>
          <p className="text-xs text-muted-foreground">
            {criticalRows.length} mês(es) com gap — agrupado por prazo de abertura
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
                      <p className="text-[11px] text-muted-foreground">
                        Ação imediata necessária — antes do início do período
                      </p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-card">
                  Gap total: {formatInt(group.totalGap)}
                </span>
              </div>

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

      {/* ══ 6. Detail Table (opt-in) ══ */}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowDetail(!showDetail)}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {showDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Ver detalhamento mês a mês
        </Button>

        {showDetail && (
          <div className="mt-2">
            <HiringDetailTable rows={actionableRows} />
          </div>
        )}
      </div>
    </div>
  );
};
