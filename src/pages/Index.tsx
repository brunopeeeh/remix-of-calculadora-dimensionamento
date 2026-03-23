import { NumberFormattingProvider } from "@/features/ops-planning/number-formatting-context";
import { usePlannerState } from "@/features/ops-planning/usePlannerState";
import { usePlannerProjection } from "@/features/ops-planning/usePlannerProjection";
import { Header } from "@/components/ops/Header";
import { SidebarPanel } from "@/components/ops/SidebarPanel";
import { KPISection } from "@/components/ops/KPISection";
import { InsightBanner } from "@/components/ops/InsightBanner";
import { ChartsSection } from "@/components/ops/ChartsSection";
import { HiringTimeline } from "@/components/ops/HiringTimeline";
import { MonthlyAuditPanel } from "@/components/ops/MonthlyAuditPanel";
import { MonthlyTable } from "@/components/ops/MonthlyTable";
import { cn } from "@/lib/utils";

const Index = () => {
  const state = usePlannerState();
  const { projection, contactRateSource, resolvedContactRate, contactRateDriftPct, inferredContactRate } =
    usePlannerProjection(state.inputs);

  const periodLabel = `${projection.timeline[0]?.label ?? "-"} → ${projection.timeline[projection.timeline.length - 1]?.label ?? "-"}`;

  return (
    <NumberFormattingProvider value={state.advancedFormatting}>
      <div className="ops-shell">
        <Header
          scenario={state.scenario}
          onScenarioChange={state.handleScenarioChange}
          onReset={state.handleRestoreBase}
          onClearAll={state.handleClearAll}
          periodLabel={periodLabel}
        />

        <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[320px_1fr] lg:gap-6 lg:px-6">
          <SidebarPanel
            inputs={state.inputs}
            advancedFormatting={state.advancedFormatting}
            setAdvancedFormatting={state.setAdvancedFormatting}
            patch={state.patch}
            patchPercent={state.patchPercent}
            setInputs={state.setInputs}
            toggleTurnoverMonth={state.toggleTurnoverMonth}
            timeline={projection.timeline}
            contactRateDriftPct={contactRateDriftPct}
            inferredContactRate={inferredContactRate}
          />

          <main className="ambient-stage space-y-4 lg:space-y-6">
            <KPISection summary={projection.summary} rampUpMonths={state.inputs.rampUpMonths} />
            <InsightBanner riskMonths={projection.summary.riskMonths} />
            <ChartsSection rows={projection.rows} inputs={state.inputs} capacityPerAgent={projection.summary.capacityPerAgent} />
            <HiringTimeline rows={projection.rows} />
            <MonthlyAuditPanel rows={projection.rows} contactRateSource={contactRateSource} resolvedContactRate={resolvedContactRate} />
            <MonthlyTable rows={projection.rows} />
            <p className={cn("text-xs text-muted-foreground", projection.summary.riskMonths.length ? "text-warning" : "text-success")}>
              Rampa parcial ativa no modelo com maturação em {state.inputs.rampUpMonths} meses.
            </p>
          </main>
        </div>
      </div>
    </NumberFormattingProvider>
  );
};

export default Index;
