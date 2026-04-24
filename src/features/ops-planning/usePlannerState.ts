import { useState, useEffect } from "react";
import { clamp } from "./format";
import { EMPTY_PLANNER_INPUTS, SCENARIO_PRESETS } from "./scenarios";
import { PlannerInputs, ScenarioKey } from "./types";

const STORAGE_KEY = "ops-planner-state-v1";

const cloneInputs = (source: PlannerInputs): PlannerInputs => ({
  ...source,
  manualGrowthByMonth: { ...source.manualGrowthByMonth },
  manualSeasonalityByMonth: { ...source.manualSeasonalityByMonth },
  turnoverMonths: [...source.turnoverMonths],
});

interface PersistedState {
  scenario: ScenarioKey;
  inputs: PlannerInputs;
  advancedFormatting: boolean;
}

const loadFromStorage = (): PersistedState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    // Validate minimally
    if (!parsed.inputs || !parsed.scenario) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveToStorage = (state: PersistedState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors (private mode, quota exceeded)
  }
};

export const usePlannerState = () => {
  const saved = loadFromStorage();

  const [scenario, setScenario] = useState<ScenarioKey>(saved?.scenario ?? "base");
  const [inputs, setInputs] = useState<PlannerInputs>(
    saved ? cloneInputs(saved.inputs) : cloneInputs(SCENARIO_PRESETS.base),
  );
  const [advancedFormatting, setAdvancedFormatting] = useState(saved?.advancedFormatting ?? true);

  // Persist on every change with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveToStorage({ scenario, inputs, advancedFormatting });
    }, 500);
    return () => clearTimeout(timeout);
  }, [scenario, inputs, advancedFormatting]);

  const patch = <K extends keyof PlannerInputs>(key: K | ((prev: PlannerInputs) => Partial<PlannerInputs>), value?: PlannerInputs[K]) => {
    setInputs((prev) => {
      if (typeof key === "function") {
        return { ...prev, ...key(prev) };
      }
      return { ...prev, [key]: value };
    });
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
