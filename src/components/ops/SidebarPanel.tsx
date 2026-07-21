import {
  Accordion,
} from "@/components/ui/accordion";
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
  return (
    <aside className="space-y-3 lg:sticky lg:top-[74px] lg:h-[calc(100vh-90px)] lg:overflow-auto lg:pb-10">
      <ValidationAlert inputs={inputs} />

      <Accordion
        type="multiple"
        defaultValue={["period", "demand", "ai", "capacity", "shrinkage", "turnover", "rules"]}
        className="space-y-3"
      >
        <PeriodSection inputs={inputs} patch={patch} />
        <ConfigSection advancedFormatting={advancedFormatting} setAdvancedFormatting={setAdvancedFormatting} />
        <DemandSection
          inputs={inputs}
          patch={patch}
          setInputs={setInputs}
          timeline={timeline}
          contactRateDriftPct={contactRateDriftPct}
          inferredContactRate={inferredContactRate}
        />
        <AISection inputs={inputs} patchPercent={patchPercent} patch={patch} />
        <CapacitySection inputs={inputs} patch={patch} patchPercent={patchPercent} />
        <ShrinkageSection inputs={inputs} patch={patch} patchPercent={patchPercent} />
        <TurnoverSection inputs={inputs} patch={patch} toggleTurnoverMonth={toggleTurnoverMonth} timeline={timeline} />
        <RulesSection inputs={inputs} patch={patch} />
      </Accordion>
    </aside>
  );
};
