import { NumberFormattingProvider } from "@/features/ops-planning/number-formatting-context";
import { usePlannerState } from "@/features/ops-planning/usePlannerState";
import { usePlannerProjection } from "@/features/ops-planning/usePlannerProjection";
import { MetricAnalyzer } from "@/features/ops-planning/MetricAnalyzer";
import { Header } from "@/components/ops/Header";
import { SidebarPanel } from "@/components/ops/SidebarPanel";
import { ExecutiveSummary } from "@/components/ops/ExecutiveSummary";
import { KPISection } from "@/components/ops/KPISection";
import { ChartsSkeleton, TableSkeleton, SectionSkeleton } from "@/components/ops/Skeletons";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";

const ChartsSection = lazy(() =>
  import("@/components/ops/ChartsSection").then((m) => ({ default: m.ChartsSection }))
);
const HiringTimeline = lazy(() =>
  import("@/components/ops/HiringTimeline").then((m) => ({ default: m.HiringTimeline }))
);
const MonthlyAuditPanel = lazy(() =>
  import("@/components/ops/MonthlyAuditPanel").then((m) => ({ default: m.MonthlyAuditPanel }))
);
const MonthlyTable = lazy(() =>
  import("@/components/ops/MonthlyTable").then((m) => ({ default: m.MonthlyTable }))
);

const Index = () => {
  const state = usePlannerState();
  const { projection, contactRateSource, resolvedContactRate, contactRateDriftPct, inferredContactRate } =
    usePlannerProjection(state.inputs);

  const periodLabel = `${projection.timeline[0]?.label ?? "–"} → ${
    projection.timeline[projection.timeline.length - 1]?.label ?? "–"
  }`;

  const hasHiringPlan = projection.rows.some((r) => r.hiresOpened > 0 || r.gap > 0);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAudit, setShowAudit] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const goToHiringTab = () => {
    if (hasHiringPlan) {
      setActiveTab("hiring");
    }
  };

  return (
    <NumberFormattingProvider value={state.advancedFormatting}>
      <div className="ops-shell">
        <Header
          onClearAll={state.handleClearAll}
          periodLabel={periodLabel}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          hasHiringPlan={hasHiringPlan}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => {
            setSidebarCollapsed((v) => !v);
            // On mobile, toggle the mobile sidebar overlay
            if (window.innerWidth < 1024) {
              setShowSidebar((v) => !v);
            }
          }}
        />

        <div className="flex h-[calc(100vh-49px)] overflow-hidden">
          {/* Overlay mobile */}
          {showSidebar && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}

          {/* Sidebar — collapsible */}
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-[320px] translate-x-[-100%] transition-all duration-200 lg:static lg:z-auto lg:translate-x-0 lg:shrink-0",
              showSidebar && "translate-x-0",
              sidebarCollapsed && "lg:w-0 lg:overflow-hidden lg:border-r-0"
            )}
          >
            <div
              className={cn(
                "flex h-full w-[320px] flex-col border-r bg-card transition-opacity duration-200",
                sidebarCollapsed && "lg:opacity-0 lg:pointer-events-none"
              )}
            >
              <div className="flex items-center justify-between border-b px-4 py-3 lg:hidden">
                <span className="text-sm font-semibold">Configurações</span>
                <Button variant="ghost" size="sm" onClick={() => setShowSidebar(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
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
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <main className="flex-1 overflow-y-auto">
            {/* Toggle sidebar (mobile only) */}
            <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/80 px-4 py-2 backdrop-blur-sm lg:hidden">
              <span className="text-xs text-muted-foreground">{periodLabel}</span>
              <Button variant="outline" size="sm" onClick={() => setShowSidebar(true)}>
                <Menu className="mr-1.5 h-3.5 w-3.5" />
                Configurações
              </Button>
            </div>

            <div className="space-y-4 p-4 lg:space-y-6 lg:p-6">
              {/* ══ Resumo executivo (sempre visível) ══ */}
              <ExecutiveSummary
                rows={projection.rows}
                summary={projection.summary}
                inputs={state.inputs}
              />

              {/* ══ Tab Content — controlado pelo Header ══ */}

              {/* ─── Tab 1: Visão geral ─── */}
              {activeTab === "overview" && (
                <div className="space-y-4 animate-in fade-in-0 duration-200">
                  <KPISection
                    summary={projection.summary}
                    inputs={state.inputs}
                    hiringAction={
                      hasHiringPlan ? (
                        <button
                          type="button"
                          onClick={goToHiringTab}
                          className="flex items-center gap-1 rounded-md bg-warning/20 px-2 py-1 text-[10px] font-medium text-warning-foreground transition-colors hover:bg-warning/30 active:scale-95"
                        >
                          Ver ação
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ) : undefined
                    }
                  />
                  <Suspense fallback={<ChartsSkeleton />}>
                    <ChartsSection
                      rows={projection.rows}
                      inputs={state.inputs}
                      capacityPerAgent={projection.summary.capacityPerAgent}
                    />
                  </Suspense>
                </div>
              )}

              {/* ─── Tab 2: Plano de ação ─── */}
              {activeTab === "hiring" && (
                <div className="space-y-4 animate-in fade-in-0 duration-200">
                  <Suspense fallback={<SectionSkeleton />}>
                    <HiringTimeline
                      rows={projection.rows}
                      leadTimeMonths={state.inputs.leadTimeMonths}
                      rampUpMonths={state.inputs.rampUpMonths}
                    />
                  </Suspense>
                </div>
              )}

              {/* ─── Tab 3: Detalhes ─── */}
              {activeTab === "details" && (
                <div className="space-y-4 animate-in fade-in-0 duration-200">
                  <div className="space-y-3">
                    <Suspense fallback={<TableSkeleton />}>
                      <MonthlyTable rows={projection.rows} />
                    </Suspense>

                    <div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAudit(!showAudit)}
                        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {showAudit ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        )}
                        Auditoria matemática
                        {showAudit ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>

                      {showAudit && (
                        <div className="mt-2">
                          <Suspense fallback={<SectionSkeleton />}>
                            <MonthlyAuditPanel
                              rows={projection.rows}
                              contactRateSource={contactRateSource}
                              resolvedContactRate={resolvedContactRate}
                            />
                          </Suspense>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Tab 4: IA ─── */}
              {activeTab === "ai" && (
                <div className="h-full animate-in fade-in-0 duration-200">
                  <MetricAnalyzer projection={projection} inputs={state.inputs} />
                </div>
              )}

              <p
                className={cn(
                  "text-xs text-muted-foreground",
                  projection.summary.riskMonths.length ? "text-warning" : "text-success"
                )}
              >
                Rampa parcial ativa no modelo com maturação em {state.inputs.rampUpMonths} meses.
              </p>
            </div>
          </main>
        </div>
      </div>
    </NumberFormattingProvider>
  );
};

export default Index;
