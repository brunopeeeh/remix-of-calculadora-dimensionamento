import { useState, useEffect } from "react";
import { clamp } from "./format";
import { DEFAULT_ROOKIE_RAMP_FACTORS, EMPTY_PLANNER_INPUTS, SCENARIO_PRESETS } from "./scenarios";
import { PlannerInputs, ScenarioKey } from "./types";

const STORAGE_KEY = "ops-planner-state-v1";

/** Backfill any missing rookie-composition fields for data saved before this feature */
const migrateInputs = (raw: Partial<PlannerInputs>): PlannerInputs => {
  const base = SCENARIO_PRESETS.base;
  const migrated = { ...base, ...raw } as PlannerInputs;

  // Ensure objects are never undefined
  if (!migrated.rookieRampFactors || typeof migrated.rookieRampFactors !== "object") {
    migrated.rookieRampFactors = { ...DEFAULT_ROOKIE_RAMP_FACTORS };
  }
  if (migrated.headcountPleno == null) {
    migrated.headcountPleno = migrated.headcountCurrent ?? base.headcountPleno;
  }
  if (migrated.headcountNovo == null) {
    migrated.headcountNovo = 0;
  }
  if (migrated.turnoverBaseMode == null) {
    // Retrocompatível: estados antigos e presets sem o campo mantêm o
    // comportamento anterior (percentual sobre o HC do mês).
    migrated.turnoverBaseMode = "hc_corrente";
  }
  return migrated;
};

const cloneInputs = (source: PlannerInputs): PlannerInputs => ({
  ...source,
  manualGrowthByMonth: { ...source.manualGrowthByMonth },
  manualSeasonalityByMonth: { ...source.manualSeasonalityByMonth },
  turnoverMonths: [...source.turnoverMonths],
  rookieRampFactors: { ...(source.rookieRampFactors ?? DEFAULT_ROOKIE_RAMP_FACTORS) },
});

/** Derive total headcount from pleno + novo */
const syncHeadcountCurrent = (inputs: PlannerInputs): PlannerInputs => ({
  ...inputs,
  headcountCurrent: inputs.headcountPleno + (inputs.headcountNovo ?? 0),
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
    // Migrate legacy data to include rookie fields
    parsed.inputs = migrateInputs(parsed.inputs);
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
      let next: PlannerInputs;
      if (typeof key === "function") {
        next = { ...prev, ...key(prev) };
      } else {
        next = { ...prev, [key]: value };
      }
      // Auto-sync headcountCurrent whenever composition changes
      if (
        (typeof key === "string" && (key === "headcountPleno" || key === "headcountNovo")) ||
        typeof key === "function"
      ) {
        return syncHeadcountCurrent(next);
      }
      return next;
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
