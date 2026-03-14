import { scenarioLabels } from "@/features/ops-planning/scenarios";
import { ScenarioKey } from "@/features/ops-planning/types";
import { cn } from "@/lib/utils";

interface ScenarioSelectorProps {
  value: ScenarioKey;
  onChange: (scenario: ScenarioKey) => void;
}

const scenarios: ScenarioKey[] = ["base", "otimista", "pessimista"];

export const ScenarioSelector = ({ value, onChange }: ScenarioSelectorProps) => {
  return (
    <div className="inline-flex rounded-md border bg-muted/50 p-1">
      {scenarios.map((scenario) => (
        <button
          key={scenario}
          type="button"
          onClick={() => onChange(scenario)}
          className={cn(
            "rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
            value === scenario ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {scenarioLabels[scenario]}
        </button>
      ))}
    </div>
  );
};
