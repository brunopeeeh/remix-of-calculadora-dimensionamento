import { useMemo } from "react";
import { PlannerInputs } from "./types";
import { computeCapacityPerAgent } from "./capacity";

export const useCapacityEstimate = (inputs: PlannerInputs) => {
  return useMemo(() => {
    const capacityPerAgent = computeCapacityPerAgent(inputs);
    const monthlyDemand = inputs.currentClients * inputs.contactRate;
    const projectedDemand = inputs.targetClientsQ4 * inputs.contactRate;
    const agentsNeededNow = Math.ceil(monthlyDemand / Math.max(1, capacityPerAgent));
    const agentsNeededQ4 = Math.ceil(projectedDemand / Math.max(1, capacityPerAgent));
    const totalGrowthPct = inputs.currentClients > 0
      ? ((inputs.targetClientsQ4 - inputs.currentClients) / inputs.currentClients * 100)
      : 0;
    const totalVolumeGrowth = inputs.currentVolume > 0
      ? ((inputs.targetClientsQ4 * inputs.contactRate - inputs.currentVolume) / inputs.currentVolume * 100)
      : 0;

    return {
      capacityPerAgent,
      monthlyDemand,
      projectedDemand,
      agentsNeededNow,
      agentsNeededQ4,
      totalGrowthPct,
      totalVolumeGrowth,
    };
  }, [inputs]);
};
