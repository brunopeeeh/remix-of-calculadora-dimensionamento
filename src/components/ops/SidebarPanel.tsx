import { useState } from "react";
import { Zap, SlidersHorizontal, Info, TrendingUp, Users, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { MonthPoint, PlannerInputs } from "@/features/ops-planning/types";
import { PeriodSection } from "./PeriodSection";
import { ConfigSection } from "./ConfigSection";
import { DemandSection } from "./DemandSection";
import { AISection } from "./AISection";
import { CapacitySection } from "./CapacitySection";
import { ShrinkageSection } from "./ShrinkageSection";
import { TurnoverSection } from "./TurnoverSection";
import { RulesSection } from "./RulesSection";
import { ValidationAlert } from "./ValidationAlert";

interface SidebarPanelProps {
  inputs: PlannerInputs;
  advancedFormatting: boolean;
  setAdvancedFormatting: (v: boolean) => void;
  patch: <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => void;
  patchPercent: <K extends keyof PlannerInputs>(key: K, value: number) => void;
  setInputs: React.Dispatch<React.SetStateAction<PlannerInputs>>;
  toggleTurnoverMonth: (monthKey: string) => void;
  timeline: MonthPoint[];
  contactRateDriftPct: number;
  inferredContactRate: number;
}

export const SidebarPanel = ({
  inputs,
  advancedFormatting,
  setAdvancedFormatting,
  patch,
  patchPercent,
  setInputs,
  toggleTurnoverMonth,
  timeline,
  contactRateDriftPct,
  inferredContactRate,
}: SidebarPanelProps) => {
  const [sidebarMode, setSidebarMode] = useState<"essential" | "advanced">("essential");
  const [activeTab, setActiveTab] = useState<"demand" | "team" | "rules">("demand");
  const isAdvanced = sidebarMode === "advanced";

  return (
    <aside className="space-y-3 lg:sticky lg:top-[74px] lg:h-[calc(100vh-90px)] lg:overflow-auto lg:pb-10">
      {/* Seletor de Modo da Sidebar (Essencial vs Avançado) */}
      <div className="glass-panel p-2 space-y-2">
        <div className="flex items-center justify-between text-xs px-1 pt-0.5">
          <span className="font-semibold text-foreground">Modo de Configuração</span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {isAdvanced ? "Ajuste Completo" : "Simplificado"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-lg border border-border/40">
          <button
            type="button"
            onClick={() => setSidebarMode("essential")}
            className={cn(
              "py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5",
              !isAdvanced
                ? "bg-background text-primary shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Essencial
          </button>
          <button
            type="button"
            onClick={() => setSidebarMode("advanced")}
            className={cn(
              "py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5",
              isAdvanced
                ? "bg-background text-primary shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Avançado
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-1 text-[10.5px] text-muted-foreground leading-normal">
          <Info className="h-3 w-3 shrink-0 text-primary/70" />
          <span>
            {!isAdvanced
              ? "Exibindo os 6 parâmetros fundamentais da operação."
              : "Exibindo todos os parâmetros técnicos e relatórios de ajuste fino."}
          </span>
        </div>
      </div>

      <ValidationAlert inputs={inputs} />

      {/* 3 Abas Categorizadas da Sidebar */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "demand" | "team" | "rules")} className="w-full">
        <TabsList className="grid grid-cols-3 w-full bg-muted/70 p-1 h-9 rounded-lg border border-border/40">
          <TabsTrigger value="demand" className="text-xs gap-1.5 py-1 px-1 font-semibold data-[state=active]:bg-background data-[state=active]:text-primary shadow-none">
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Demanda</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="text-xs gap-1.5 py-1 px-1 font-semibold data-[state=active]:bg-background data-[state=active]:text-primary shadow-none">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Equipe</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="text-xs gap-1.5 py-1 px-1 font-semibold data-[state=active]:bg-background data-[state=active]:text-primary shadow-none">
            <Sliders className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Regras</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Demanda */}
        <TabsContent value="demand" className="mt-3 space-y-3 focus-visible:outline-none">
          <Accordion
            type="multiple"
            defaultValue={["period", "demand", "ai"]}
            className="space-y-3"
          >
            <PeriodSection inputs={inputs} patch={patch} />
            <DemandSection
              inputs={inputs}
              patch={patch}
              setInputs={setInputs}
              timeline={timeline}
              contactRateDriftPct={contactRateDriftPct}
              inferredContactRate={inferredContactRate}
              isAdvanced={isAdvanced}
            />
            <AISection inputs={inputs} patchPercent={patchPercent} patch={patch} isAdvanced={isAdvanced} />
          </Accordion>
        </TabsContent>

        {/* Aba 2: Equipe & Capacidade */}
        <TabsContent value="team" className="mt-3 space-y-3 focus-visible:outline-none">
          <Accordion
            type="multiple"
            defaultValue={["capacity", "shrinkage"]}
            className="space-y-3"
          >
            <CapacitySection inputs={inputs} patch={patch} patchPercent={patchPercent} isAdvanced={isAdvanced} />
            <ShrinkageSection inputs={inputs} patch={patch} patchPercent={patchPercent} isAdvanced={isAdvanced} />
          </Accordion>
        </TabsContent>

        {/* Aba 3: Regras & Turnover */}
        <TabsContent value="rules" className="mt-3 space-y-3 focus-visible:outline-none">
          <Accordion
            type="multiple"
            defaultValue={["turnover", "rules", "config"]}
            className="space-y-3"
          >
            <TurnoverSection inputs={inputs} patch={patch} toggleTurnoverMonth={toggleTurnoverMonth} timeline={timeline} isAdvanced={isAdvanced} />
            <RulesSection inputs={inputs} patch={patch} isAdvanced={isAdvanced} />
            {isAdvanced && (
              <ConfigSection advancedFormatting={advancedFormatting} setAdvancedFormatting={setAdvancedFormatting} />
            )}
          </Accordion>
        </TabsContent>
      </Tabs>
    </aside>
  );
};


