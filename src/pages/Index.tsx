import { NumberFormattingProvider } from "@/features/ops-planning/number-formatting-context";
import { usePlannerState } from "@/features/ops-planning/usePlannerState";
import { usePlannerProjection } from "@/features/ops-planning/usePlannerProjection";
import { MetricAnalyzer } from "@/features/ops-planning/MetricAnalyzer";
import { Header } from "@/components/ops/Header";
import { SidebarPanel } from "@/components/ops/SidebarPanel";
import { ExecutiveSummary } from "@/components/ops/ExecutiveSummary";
import { KPISection } from "@/components/ops/KPISection";
import { InsightBanner } from "@/components/ops/InsightBanner";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, ClipboardCheck, Table2, ArrowRight, ChevronDown, ChevronUp, ShieldCheck, Menu, X, Loader2, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";

const ChartsSection = lazy(() => import("@/components/ops/ChartsSection").then(m => ({ default: m.ChartsSection })));
const HiringTimeline = lazy(() => import("@/components/ops/HiringTimeline").then(m => ({ default: m.HiringTimeline })));
const MonthlyAuditPanel = lazy(() => import("@/components/ops/MonthlyAuditPanel").then(m => ({ default: m.MonthlyAuditPanel })));
const MonthlyTable = lazy(() => import("@/components/ops/MonthlyTable").then(m => ({ default: m.MonthlyTable })));

const SectionLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const Index = () => {
  const state = usePlannerState();
  const { projection, contactRateSource, resolvedContactRate, contactRateDriftPct, inferredContactRate } =
    usePlannerProjection(state.inputs);

  const periodLabel = `${projection.timeline[0]?.label ?? "-"} → ${projection.timeline[projection.timeline.length - 1]?.label ?? "-"}`;

  const hasHiringPlan = projection.rows.some(r => r.hiresOpened > 0 || r.gap > 0);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAudit, setShowAudit] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const goToHiringTab = () => {
    if (hasHiringPlan) {
      setActiveTab("hiring");
    }
  };

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

        <div className="flex h-[calc(100vh-56px)] overflow-hidden">
          {/* Overlay para mobile */}
          {showSidebar && (
            <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setShowSidebar(false)} />
          )}

          {/* Sidebar */}
          <div className={cn(
            "fixed inset-y-0 left-0 z-50 w-[320px] translate-x-[-100%] transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:shrink-0",
            showSidebar && "translate-x-0"
          )}>
            <div className="flex h-full flex-col border-r bg-card">
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
            {/* Botão toggle sidebar (mobile) */}
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

                {/* ══ Tabs ══ */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview" className="gap-1.5 text-xs">
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Visão geral</span>
                    <span className="sm:hidden">Visão</span>
                  </TabsTrigger>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-1">
                        <TabsTrigger value="hiring" className="gap-1.5 text-xs w-full" disabled={!hasHiringPlan}>
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Plano</span>
                          <span className="sm:hidden">Ação</span>
                        </TabsTrigger>
                      </span>
                    </TooltipTrigger>
                    {!hasHiringPlan && (
                      <TooltipContent side="bottom" className="text-xs">
                        Disponível quando há gap de headcount detectado
                      </TooltipContent>
                    )}
                  </Tooltip>
                  <TabsTrigger value="details" className="gap-1.5 text-xs">
                    <Table2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Detalhes</span>
                    <span className="sm:hidden">Tabela</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="gap-1.5 text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">IA</span>
                  </TabsTrigger>
                </TabsList>

                {/* ═─ Tab 1: Visão geral ── */}
                <TabsContent value="overview" className="space-y-4">
                  <KPISection
                    summary={projection.summary}
                    rampUpMonths={state.inputs.rampUpMonths}
                    hiringAction={hasHiringPlan ? (
                      <button
                        type="button"
                        onClick={goToHiringTab}
                        className="flex items-center gap-1 rounded-md bg-warning/20 px-2 py-1 text-[10px] font-medium text-warning-foreground transition-colors hover:bg-warning/30"
                      >
                        Ver ação
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    ) : undefined}
                  />
                  <InsightBanner
                    riskMonths={projection.summary.riskMonths}
                    rows={projection.rows}
                    onGoToHiring={goToHiringTab}
                    hasHiringTab={hasHiringPlan}
                  />
                  <Suspense fallback={<SectionLoader />}>
                    <ChartsSection rows={projection.rows} inputs={state.inputs} capacityPerAgent={projection.summary.capacityPerAgent} />
                  </Suspense>
                </TabsContent>

                {/* ═─ Tab 2: Plano de ação ── */}
                <TabsContent value="hiring" className="space-y-4">
                  <Suspense fallback={<SectionLoader />}>
                    <HiringTimeline rows={projection.rows} />
                  </Suspense>
                </TabsContent>

                {/* ═─ Tab 3: Detalhes ── */}
                <TabsContent value="details" className="space-y-4">
                  <div className="space-y-3">
                    <Suspense fallback={<SectionLoader />}>
                      <MonthlyTable rows={projection.rows} />
                    </Suspense>

                    <div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAudit(!showAudit)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        {showAudit ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ShieldCheck className="mr-1 h-3.5 w-3.5" />}
                        Auditoria matemática
                        {showAudit ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                      </Button>
                      {showAudit && (
                        <div className="mt-2">
                          <Suspense fallback={<SectionLoader />}>
                            <MonthlyAuditPanel rows={projection.rows} contactRateSource={contactRateSource} resolvedContactRate={resolvedContactRate} />
                          </Suspense>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ═─ Tab 4: IA ── */}
                <TabsContent value="ai" className="h-full">
                  <MetricAnalyzer projection={projection} inputs={state.inputs} />
                </TabsContent>
              </Tabs>

              <p className={cn("text-xs text-muted-foreground", projection.summary.riskMonths.length ? "text-warning" : "text-success")}>
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
