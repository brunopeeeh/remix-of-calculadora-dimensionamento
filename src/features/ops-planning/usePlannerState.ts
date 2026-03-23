import { useState } from "react";
import { clamp } from "./format";
import { EMPTY_PLANNER_INPUTS, SCENARIO_PRESETS } from "./scenarios";
import { PlannerInputs, ScenarioKey } from "./types";

const cloneInputs = (source: PlannerInputs): PlannerInputs => ({
  ...source,
  manualGrowthByMonth: { ...source.manualGrowthByMonth },
  turnoverMonths: [...source.turnoverMonths],
});

export const usePlannerState = () => {
  const [scenario, setScenario] = useState<ScenarioKey>("base");
  const [inputs, setInputs] = useState<PlannerInputs>(cloneInputs(SCENARIO_PRESETS.base));
  const [advancedFormatting, setAdvancedFormatting] = useState(true);

  const patch = <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const patchPercent = <K extends keyof PlannerInputs>(key: K, value: number) => {
    patch(key, clamp(value, 0, 100) as PlannerInputs[K]);
  };

  const handleScenarioChange = (next: ScenarioKey) => {
    setScenario(next);
    setInputs(cloneInputs(SCENARIO_PRESETS[next]));
  };

  const handleRestoreBase = () => {
    setScenario("base");
    setInputs(cloneInputs(SCENARIO_PRESETS.base));
  };

  const handleClearAll = () => {
    setScenario("base");
    setInputs(cloneInputs(EMPTY_PLANNER_INPUTS));
  };

  const toggleTurnoverMonth = (monthKey: string) => {
    setInputs((prev) => {
      const active = prev.turnoverMonths.includes(monthKey);
      const next = active
        ? prev.turnoverMonths.filter((item) => item !== monthKey)
        : [...prev.turnoverMonths, monthKey].sort((a, b) => a.localeCompare(b));
      return { ...prev, turnoverMonths: next };
    });
  };

  return {
    scenario,
    inputs,
    advancedFormatting,
    setAdvancedFormatting,
    patch,
    patchPercent,
    setInputs,
    handleScenarioChange,
    handleRestoreBase,
    handleClearAll,
    toggleTurnoverMonth,
  };
};
