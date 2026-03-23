import { clamp } from "./format";
import { PlannerInputs } from "./types";

const BASE_WEIGHTED_TMA = 20 * 0.8 + 45 * 0.2;

export const computeCapacityPerAgent = (inputs: PlannerInputs): number => {
  const mixN1 = inputs.mixN1Pct / 100;
  const mixN2 = inputs.mixN2Pct / 100;
  const weightedTma = inputs.tmaN1 * mixN1 + inputs.tmaN2 * mixN2;
  const complexityFactor = clamp(BASE_WEIGHTED_TMA / Math.max(1, weightedTma), 0.7, 1.4);

  const adjustedVacationPct = (inputs.vacationPct / 100) * (inputs.vacationEligiblePct / 100);

  const raw =
    inputs.productivityBase *
    complexityFactor *
    (1 - inputs.breaksPct / 100) *
    (1 - inputs.offchatPct / 100) *
    (1 - inputs.meetingsPct / 100) *
    (1 - adjustedVacationPct);

  return Math.max(0, raw);
};

export const resolveContactRate = (inputs: PlannerInputs): number => {
  if (inputs.contactRate > 0) return inputs.contactRate;
  if (inputs.currentClients <= 0) return 0;
  return inputs.currentVolume / inputs.currentClients;
};
