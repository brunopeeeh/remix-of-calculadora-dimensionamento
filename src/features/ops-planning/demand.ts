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
  seasonalityPct = 0,
): DemandRow => {
  let clientsBase: number;

  if (index === 0) {
    clientsBase = inputs.currentClients;
  } else if (inputs.growthMode === "linear") {
    clientsBase = Math.max(inputs.currentClients * 0.1, inputs.currentClients + linearStep * index);
  } else {
    const growthRate = (inputs.manualGrowthByMonth?.[point.key] ?? fallbackManualGrowthPct) / 100;
    clientsBase = previousClients * (1 + growthRate);
  }

  clientsBase = Math.max(1, clientsBase);

  const volumeGross = (clientsBase * contactRate) * (1 + seasonalityPct / 100);
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
  if (inputs.currentClients <= 0 || inputs.targetClientsQ4 <= 0 || totalSteps <= 0) return 0;
  const growth = Math.pow(inputs.targetClientsQ4 / inputs.currentClients, 1 / totalSteps) - 1;
  return isFinite(growth) ? growth * 100 : 0;
};
