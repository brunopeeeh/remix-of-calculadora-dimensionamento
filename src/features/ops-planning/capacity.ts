import { clamp } from "./format";
import { PlannerInputs } from "./types";

/**
 * TMA de referência para cálculo do complexityFactor.
 * Representa o tempo médio de atendimento de um agente "padrão" da operação
 * (N1=20min * 80% + N2=45min * 20% = 25min).
 * Propósito: agentes com TMA menor que este valor ganham capacidade (são mais rápidos),
 * e agentes com TMA maior perdem (são mais lentos). O fator é clampado entre 0.7 e 1.4.
 * Não deve ser dinâmico — representa um benchmark fixo da operação.
 */
const BASE_WEIGHTED_TMA = 20 * 0.8 + 45 * 0.2; // = 25 minutos

export const computeTenureVacationPct = (agentsWithTenure: number, totalHeadcount: number): number => {
  if (agentsWithTenure <= 0 || totalHeadcount <= 0) return 0;
  const maxConcurrentAgents = 1;
  const periodsPerYear = agentsWithTenure * 2;
  const periodsPerMonth = periodsPerYear / 12;
  const actualAgentsOnVacation = Math.min(periodsPerMonth, maxConcurrentAgents);
  return actualAgentsOnVacation / totalHeadcount;
};

export const computeCapacityPerAgent = (inputs: PlannerInputs): number => {
  const tmaN1 = Number(inputs.tmaN1) || 0;
  const tmaN2 = Number(inputs.tmaN2) || 0;
  const mixN1Pct = Number(inputs.mixN1Pct) || 0;
  const mixN2Pct = Number(inputs.mixN2Pct) || 0;

  const weightedTma = inputs.useN1N2Split
    ? (tmaN1 * mixN1Pct) / 100 + (tmaN2 * mixN2Pct) / 100
    : tmaN1;

  if (!isFinite(weightedTma) || weightedTma <= 0) return 0;

  const complexityFactor = clamp(BASE_WEIGHTED_TMA / weightedTma, 0.7, 1.4);

  let vacationImpactPct = (inputs.vacationPct / 100) * (inputs.vacationEligiblePct / 100);

  if (inputs.useTenureVacation && inputs.agentsWithTenure > 0) {
    const tenureVacationPct = computeTenureVacationPct(inputs.agentsWithTenure, inputs.headcountCurrent);
    vacationImpactPct = tenureVacationPct;
  }

  const raw =
    inputs.productivityBase *
    complexityFactor *
    (1 - inputs.breaksPct / 100) *
    (1 - inputs.offchatPct / 100) *
    (1 - inputs.meetingsPct / 100) *
    (1 - vacationImpactPct);

  return Math.max(0, raw);
};

export const resolveContactRate = (inputs: PlannerInputs): number => {
  if (inputs.contactRate > 0) return inputs.contactRate;
  if (inputs.currentClients <= 0) return 0;
  return inputs.currentVolume / inputs.currentClients;
};
