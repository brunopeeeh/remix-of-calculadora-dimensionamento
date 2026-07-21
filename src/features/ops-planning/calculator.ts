import { MonthPoint, PlannerInputs, ProjectionResult, MonthlyProjection, CohortContribution } from "./types";
import { buildTimeline, getTimelineKey } from "./timeline";
import { computeCapacityPerAgent, resolveContactRate } from "./capacity";
import { getRampFactor, getRampMaturationOffset, computeRookieEffectiveForMonth } from "./ramp";
import { buildTurnoverContext, resolveTurnoverForMonth, buildTurnoverFormula, TurnoverContext } from "./turnover";
import { computeDemandForMonth, computeFallbackManualGrowthPct } from "./demand";
import { computeAdjustedMix } from "./capacity";

export { getTimelineKey } from "./timeline";
export { getRampFactor } from "./ramp";
export { resolveContactRate, computeAdjustedMix } from "./capacity";

// ── Cohort tracking ──

interface HireCohort {
  openedAtIndex: number;
  startIndex: number;
  count: number;
}

interface SimulationState {
  legacyPleno: number;
  legacyRookie: number;
  cohorts: HireCohort[];
}

const computeRisk = (gap: number) => {
  if (gap === 0) return "ok" as const;
  if (gap <= 1) return "attention" as const;
  return "critical" as const;
};

const getActivePastCohorts = (cohorts: HireCohort[], index: number) =>
  cohorts.filter(c => c.startIndex < index);

const getAllActiveCohorts = (cohorts: HireCohort[], index: number) =>
  cohorts.filter(c => c.startIndex <= index);

const computeHCNominalStart = (state: SimulationState, activePastCohorts: HireCohort[]): number =>
  Math.max(0, state.legacyPleno + state.legacyRookie + activePastCohorts.reduce((acc, c) => acc + c.count, 0));

const applyTurnoverToLegacy = (state: SimulationState, amount: number) => {
  const remaining = amount;
  
  // Apply to rookies first (often higher turnover in training) or proportional?
  // We'll apply proportionally to maintain the ratio
  const totalLegacy = state.legacyPleno + state.legacyRookie;
  if (totalLegacy <= 0 || remaining <= 0) return;

  const ratioRookie = state.legacyRookie / totalLegacy;
  const turnoverRookie = Math.min(state.legacyRookie, remaining * ratioRookie);
  const turnoverPleno = Math.min(state.legacyPleno, remaining - turnoverRookie);

  state.legacyRookie -= turnoverRookie;
  state.legacyPleno -= turnoverPleno;
};

const applyTurnoverStartOfMonth = (
  state: SimulationState,
  turnover: number,
  hcNominalStart: number,
  activePastCohorts: HireCohort[]
): number => {
  const turnoverApplied = Math.min(turnover, hcNominalStart);
  let remainingTurnover = turnoverApplied;
  
  const legacyTurnover = Math.min(state.legacyPleno + state.legacyRookie, remainingTurnover);
  applyTurnoverToLegacy(state, legacyTurnover);
  remainingTurnover -= legacyTurnover;

  for (const c of activePastCohorts) {
    if (remainingTurnover <= 0) break;
    const ct = Math.min(c.count, remainingTurnover);
    c.count -= ct;
    remainingTurnover -= ct;
  }
  
  return turnoverApplied;
};

const applyTurnoverEndOfMonth = (
  state: SimulationState,
  turnover: number,
  activePastCohorts: HireCohort[]
): number => {
  const currentNominal = state.legacyPleno + state.legacyRookie + activePastCohorts.reduce((acc, c) => acc + c.count, 0);
  const turnoverApplied = Math.min(turnover, currentNominal);
  let remainingTurnover = turnoverApplied;
  
  const legacyTurnover = Math.min(state.legacyPleno + state.legacyRookie, remainingTurnover);
  applyTurnoverToLegacy(state, legacyTurnover);
  remainingTurnover -= legacyTurnover;

  for (const c of activePastCohorts) {
    if (remainingTurnover <= 0) break;
    const ct = Math.min(c.count, remainingTurnover);
    c.count -= ct;
    remainingTurnover -= ct;
  }
  
  return turnoverApplied;
};

import { RookieRampFactors } from "./types";

const computeHCEffective = (
  state: SimulationState,
  allActiveCohorts: HireCohort[],
  index: number,
  rampUpMonths: number,
  safeRampFactors: RookieRampFactors
): { hcEffective: number; contributions: CohortContribution[] } => {
  const contributions: CohortContribution[] = [];
  
  // Plenos are always 100% effective
  let hcEffective = state.legacyPleno;
  
  // Legacy Rookies scale up over the first 3 months according to factors
  // Month 0 -> factor 1, Month 1 -> factor 2, Month 2+ -> factor 3
  const rookieRampFactor = index === 0 ? safeRampFactors.month1 : index === 1 ? safeRampFactors.month2 : safeRampFactors.month3;
  hcEffective += state.legacyRookie * rookieRampFactor;

  for (const cohort of allActiveCohorts) {
    const monthsSinceStart = index - cohort.startIndex;
    const rampFactor = getRampFactor(monthsSinceStart, rampUpMonths);
    const effective = cohort.count * rampFactor;
    hcEffective += effective;
    contributions.push({
      monthIndex: cohort.openedAtIndex,
      nominal: cohort.count,
      effective,
      rampFactor,
    });
  }

  return { hcEffective, contributions };
};

const computeHireActions = (
  cohorts: HireCohort[],
  index: number
): { hiresOpened: number; hiresStarted: number } => {
  let hiresOpened = 0;
  let hiresStarted = 0;
  
  for (const cohort of cohorts) {
    if (cohort.startIndex === index) hiresStarted += cohort.count;
    if (cohort.openedAtIndex === index) hiresOpened += cohort.count;
  }
  
  return { hiresOpened, hiresStarted };
};

const computeOpenTiming = (
  inputs: Pick<PlannerInputs, "hiringMode" | "rampUpMonths" | "leadTimeMonths">,
  index: number,
  timeline: MonthPoint[]
): { openMonthIndex: number; openIn: string; targetImpactIndex: number; targetImpactLabel: string } => {
  const rampOffset = inputs.hiringMode === "antecipado" 
    ? getRampMaturationOffset(inputs.rampUpMonths) 
    : 0;
  const openOffset = inputs.leadTimeMonths + rampOffset;
  const openMonthIndex = index - openOffset;
  const openIn = openMonthIndex >= 0 && openMonthIndex < timeline.length
    ? timeline[openMonthIndex].label
    : "Antes do período";

  const targetImpactIndex = index + openOffset;
  const targetImpactLabel = targetImpactIndex < timeline.length
    ? timeline[targetImpactIndex].label
    : "Fora do período";

  return { openMonthIndex, openIn, targetImpactIndex, targetImpactLabel };
};

export const runPlannerProjection = (inputs: PlannerInputs): ProjectionResult => {
  const timeline = buildTimeline(inputs.startMonth, inputs.startYear, inputs.endMonth, inputs.endYear);

  if (timeline.length === 0) {
    return {
      timeline: [],
      rows: [],
      summary: {
        volumeQ4: 0, volumeHumanQ4: 0, capacityPerAgent: 0,
        agentsNeededQ4: 0, hcFinalQ4: 0, totalTurnoverYear: 0, hiresYear: 0,
        criticalOpenMonth: "Sem risco", riskMonths: [],
      },
    };
  }

  const baselineCapacityPerAgent = computeCapacityPerAgent(inputs);
  const contactRate = resolveContactRate(inputs);
  const turnoverContext = buildTurnoverContext(inputs, timeline);
  const totalMonths = timeline.length;
  const totalSteps = Math.max(1, timeline.length - 1);
  const linearStep = (inputs.targetClientsQ4 - inputs.currentClients) / totalSteps;
  const fallbackGrowth = computeFallbackManualGrowthPct(inputs, totalSteps);

  const cohorts: HireCohort[] = [];
  const demandCache: Map<number, { clientsBase: number; contactRate: number; volumeGross: number; aiPct: number; volumeAI: number; volumeHuman: number }> = new Map();
  let previousClients = inputs.currentClients;

  for (let index = 0; index < timeline.length; index++) {
    const point = timeline[index];
    const seasonalityPct = inputs.manualSeasonalityByMonth?.[point.key] ?? 0;
    const demand = computeDemandForMonth(
      inputs, point, index, previousClients, contactRate, linearStep, fallbackGrowth, seasonalityPct
    );
    demandCache.set(index, demand);
    previousClients = demand.clientsBase;
  }

  for (let index = 0; index < timeline.length; index++) {
    const point = timeline[index];
    const demand = demandCache.get(index)!;

    // C3: capacidade dinâmica — recalcula mix N1/N2 a cada mês para refletir promoções acumuladas
    const planningMix = inputs.useN1N2Split
      ? computeAdjustedMix(inputs.mixN1Pct, inputs.mixN2Pct, inputs.promotionsCount, inputs.headcountCurrent, index, totalMonths)
      : undefined;
    const planningCapacity = computeCapacityPerAgent(inputs, planningMix);
    const agentsNeededRaw = demand.volumeHuman / Math.max(1, planningCapacity);
    const agentsNeeded = Math.ceil(agentsNeededRaw);

    let hcEffective = inputs.headcountCurrent;
    for (const c of cohorts) {
      if (c.startIndex <= index) {
        const monthsSinceStart = index - c.startIndex;
        const rampFactor = getRampFactor(monthsSinceStart, inputs.rampUpMonths);
        hcEffective += c.count * rampFactor;
      }
    }

    // C2: descontar turnover estimado antes de comparar com agentsNeeded
    const turnoverThisMonth = resolveTurnoverForMonth(inputs, turnoverContext, point.key, hcEffective);
    hcEffective = Math.max(0, hcEffective - turnoverThisMonth);

    if (agentsNeeded > hcEffective) {
      const gapFte = agentsNeeded - hcEffective;
      // C1: modo "antecipado" antecipa o startIndex real para que o cohort esteja
      // com ramp completo no mês do gap. Mínimo de 1 mês (nunca no mês 0).
      const rampOffset = inputs.hiringMode === "antecipado"
        ? getRampMaturationOffset(inputs.rampUpMonths)
        : 0;
      const startIndex = Math.max(1, index + inputs.leadTimeMonths - rampOffset);
      if (startIndex < timeline.length) {
        const existingCohort = cohorts.find(c => c.startIndex === startIndex);
        if (existingCohort) {
          existingCohort.count = Math.max(existingCohort.count, Math.ceil(gapFte));
        } else {
          cohorts.push({
            openedAtIndex: index,
            startIndex,
            count: Math.ceil(gapFte),
          });
        }
      }
    }
  }

  const rows: MonthlyProjection[] = [];
  const safeHcNovo = inputs.headcountNovo ?? 0;
  const safeRampFactors = inputs.rookieRampFactors ?? { month1: 0.33, month2: 0.66, month3: 1.0 };
  const basePleno = inputs.headcountPleno ?? inputs.headcountCurrent;
  
  const state: SimulationState = {
    legacyPleno: basePleno,
    legacyRookie: safeHcNovo,
    cohorts: cohorts.map(c => ({ ...c })),
  };

  for (let index = 0; index < timeline.length; index++) {
    const point = timeline[index];
    const demand = demandCache.get(index)!;

    const adjustedMix = inputs.useN1N2Split
      ? computeAdjustedMix(
          inputs.mixN1Pct, inputs.mixN2Pct,
          inputs.promotionsCount, inputs.headcountCurrent,
          index, totalMonths
        )
      : undefined;
    const effectiveCapacity = computeCapacityPerAgent(inputs, adjustedMix);
    const agentsNeededRaw = demand.volumeHuman / Math.max(1, effectiveCapacity);
    const agentsNeeded = Math.ceil(agentsNeededRaw);

    const activePastCohorts = getActivePastCohorts(state.cohorts, index);
    const allActiveCohorts = getAllActiveCohorts(state.cohorts, index);

    const hcNominalStart = computeHCNominalStart(state, activePastCohorts);
    const turnoverBase = hcNominalStart;
    const turnover = resolveTurnoverForMonth(inputs, turnoverContext, point.key, turnoverBase);

    let turnoverAppliedStart = 0;
    let turnoverAppliedEnd = 0;

    if (inputs.turnoverTiming === "start_of_month" && turnover > 0) {
      turnoverAppliedStart = applyTurnoverStartOfMonth(state, turnover, hcNominalStart, activePastCohorts);
    }

    const hcNominalAfterTurnoverStart = computeHCNominalStart(state, activePastCohorts);
    const { hcEffective, contributions: cohortContributions } = computeHCEffective(
      state, allActiveCohorts, index, inputs.rampUpMonths, safeRampFactors
    );

    const capacityAvailableTotal = hcEffective * effectiveCapacity;
    const gapFte = Math.max(0, agentsNeeded - hcEffective);
    const gap = Math.ceil(gapFte);

    const turnoverFormula = buildTurnoverFormula(
      inputs, turnoverContext, point.key, turnoverBase, turnover,
    );

    if (inputs.turnoverTiming === "end_of_month" && turnover > 0) {
      turnoverAppliedEnd = applyTurnoverEndOfMonth(state, turnover, activePastCohorts);
    }

    const hcFinal = Math.max(0, state.legacyPleno + state.legacyRookie + allActiveCohorts.reduce((acc, c) => acc + c.count, 0));
    const risk = computeRisk(gap);

    const { hiresOpened, hiresStarted } = computeHireActions(state.cohorts, index);
    const { openMonthIndex, openIn, targetImpactIndex, targetImpactLabel } = computeOpenTiming(
      inputs, index, timeline
    );

    rows.push({
      month: point,
      ...demand,
      capacityPerAgent: effectiveCapacity,
      capacityAvailableTotal,
      agentsNeededRaw,
      agentsNeeded,
      hcNominalStart,
      turnoverAppliedStart,
      hcNominalAfterTurnoverStart,
      hcEffectiveBeforeHires: hcEffective,
      hcAvailableEffective: hcEffective,
      hcInitial: hcNominalStart,
      hcPleno: basePleno,
      hcRookieNominal: safeHcNovo,
      hcRookieEffective: computeRookieEffectiveForMonth(state.legacyRookie, index, safeRampFactors),
      hcTotalEffective: hcEffective,
      turnover,
      turnoverFormula,
      turnoverTiming: inputs.turnoverTiming,
      turnoverAppliedEnd,
      hcFinal,
      gapFte,
      gap,
      hire: hiresOpened,
      hiresOpened,
      hiresStarted,
      cohortContributions,
      openIn,
      openMonthIndex,
      targetImpactLabel,
      targetImpactIndex,
      risk,
    });
  }

  const last = rows[rows.length - 1];
  const hiresYear = rows.reduce((acc, r) => acc + r.hiresStarted, 0);
  const totalTurnoverYear = Math.round(rows.reduce((acc, r) => acc + r.turnover, 0));
  const riskMonths = rows.filter((r) => r.gap > 0).map((r) => r.month.label);
  const criticalOpenMonth = rows.find((r) => r.gap > 0)?.openIn ?? "Sem risco";

  return {
    timeline,
    rows,
    summary: {
      volumeQ4: last.volumeGross,
      volumeHumanQ4: last.volumeHuman,
      capacityPerAgent: last.capacityPerAgent,
      agentsNeededQ4: last.agentsNeeded,
      hcFinalQ4: last.hcFinal,
      totalTurnoverYear,
      hiresYear,
      criticalOpenMonth,
      riskMonths,
    },
  };
};
