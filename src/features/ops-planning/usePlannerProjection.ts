import { useMemo } from "react";
import { runPlannerProjection } from "./calculator";
import { resolveContactRate } from "./capacity";
import { PlannerInputs } from "./types";

export const usePlannerProjection = (inputs: PlannerInputs) => {
  const projection = useMemo(() => runPlannerProjection(inputs), [inputs]);

  const inferredContactRate = inputs.currentClients > 0
    ? inputs.currentVolume / inputs.currentClients
    : 0;
  const resolvedCR = resolveContactRate(inputs);
  const contactRateSource = (inputs.contactRate > 0 ? "manual" : "inferido") as "manual" | "inferido";
  const contactRateDriftPct = inferredContactRate > 0
    ? Math.abs(inputs.contactRate - inferredContactRate) / inferredContactRate * 100
    : 0;

  return {
    projection,
    inferredContactRate,
    resolvedContactRate: resolvedCR,
    contactRateSource,
    contactRateDriftPct,
  };
};
