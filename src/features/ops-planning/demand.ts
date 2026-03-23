import { clamp } from "./format";
import { MonthPoint, PlannerInputs } from "./types";

export interface DemandRow {
  clientsBase: number;
  contactRate: number;
  volumeGross: number;
  aiPct: number;
  volumeAI: number;
  volumeHuman: number;
}

export const computeDemandForMonth = (
  inputs: PlannerInputs,
  point: MonthPoint,
  index: number,
  previousClients: number,
  contactRate: number,
  linearStep: number,
  fallbackManualGrowthPct: number,
): DemandRow => {
  const clientsBase =
    index === 0
      ? inputs.currentClients
      : inputs.growthMode === "linear"
        ? inputs.currentClients + linearStep * index
        : previousClients * (1 + (inputs.manualGrowthByMonth[point.key] ?? fallbackManualGrowthPct) / 100);

  const volumeGross = clientsBase * contactRate;
  const aiPct = clamp(
    inputs.aiCoveragePct + inputs.aiGrowthMonthlyPct * index + inputs.extraAutomationPct,
    0,
    95,
  );
  const volumeAI = volumeGross * (aiPct / 100);
  const volumeHuman = volumeGross - volumeAI;

  return { clientsBase, contactRate, volumeGross, aiPct, volumeAI, volumeHuman };
};

export const computeFallbackManualGrowthPct = (inputs: PlannerInputs, totalSteps: number): number => {
  if (inputs.currentClients <= 0 || inputs.targetClientsQ4 <= 0) return 0;
  return (Math.pow(inputs.targetClientsQ4 / inputs.currentClients, 1 / totalSteps) - 1) * 100;
};
