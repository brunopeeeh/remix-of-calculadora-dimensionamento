import { MonthPoint, PlannerInputs, ProjectionResult, MonthlyProjection, CohortContribution } from "./types";
import { buildTimeline, getTimelineKey } from "./timeline";
import { computeCapacityPerAgent, resolveContactRate } from "./capacity";
import { getRampFactor, getRampMaturationOffset } from "./ramp";
import { buildTurnoverContext, resolveTurnoverForMonth, buildTurnoverFormula, TurnoverContext } from "./turnover";
import { computeDemandForMonth, computeFallbackManualGrowthPct } from "./demand";

export { getTimelineKey } from "./timeline";
export { getRampFactor } from "./ramp";
export { resolveContactRate } from "./capacity";

// ── Cohort tracking ──

interface HireCohort {
  /** Index in the timeline when this cohort was *opened* (vacancy created) */
  openedAtIndex: number;
  /** Index in the timeline when these hires actually start working */
  startIndex: number;
  count: number;
}

const computeRisk = (gap: number) => {
  if (gap === 0) return "ok" as const;
  if (gap <= 1) return "attention" as const;
  return "critical" as const;
};

// ── Main projection ──

/**
 * Helper to run the simulation month by month using a specific set of committed cohorts.
 * This does not evaluate or create new hires.
 */
function runSimulationWithCohorts(
  inputs: PlannerInputs,
  timeline: MonthPoint[],
  readonlyCohorts: HireCohort[]
): MonthlyProjection[] {
  const capacityPerAgent = computeCapacityPerAgent(inputs);
  const contactRate = resolveContactRate(inputs);
  const turnoverContext = buildTurnoverContext(inputs, timeline);
  const totalSteps = Math.max(1, timeline.length - 1);
  const linearStep = (inputs.targetClientsQ4 - inputs.currentClients) / totalSteps;
  const fallbackGrowth = computeFallbackManualGrowthPct(inputs, totalSteps);

  const rows: MonthlyProjection[] = [];
  let previousClients = inputs.currentClients;
  let legacyNominal = inputs.headcountCurrent;

  // Deep copy elements that we will mutate with turnover
  const simCohorts = readonlyCohorts.map((c) => ({ ...c }));

  for (let index = 0; index < timeline.length; index++) {
    const point = timeline[index];

    const demand = computeDemandForMonth(
      inputs, point, index, previousClients, contactRate, linearStep, fallbackGrowth,
    );

    const agentsNeededRaw = demand.volumeHuman / Math.max(1, capacityPerAgent);
    const agentsNeeded = Math.ceil(agentsNeededRaw);

    const hcNominalStart = Math.max(0,
      legacyNominal + simCohorts.reduce((acc, c) => acc + c.count, 0)
    );

    const turnoverBase = hcNominalStart;
    const turnover = resolveTurnoverForMonth(inputs, turnoverContext, point.key, turnoverBase);
    
    let turnoverAppliedStart = 0;
    let turnoverAppliedEnd = 0;

    if (inputs.turnoverTiming === "start_of_month" && turnover > 0) {
      turnoverAppliedStart = turnover;
      let remainingTurnover = turnoverAppliedStart;
      const legacyTurnover = Math.min(legacyNominal, remainingTurnover);
      legacyNominal = Math.max(0, legacyNominal - legacyTurnover);
      remainingTurnover -= legacyTurnover;

      for (let ci = 0; ci < simCohorts.length && remainingTurnover > 0; ci++) {
        const c = simCohorts[ci];
        const ct = Math.min(c.count, remainingTurnover);
        c.count -= ct;
        remainingTurnover -= ct;
      }
    }

    const hcNominalAfterTurnoverStart = Math.max(0,
      legacyNominal + simCohorts.reduce((acc, c) => acc + c.count, 0)
    );

    const cohortContributions: CohortContribution[] = [];
    let hcEffectiveFromExisting = legacyNominal;

    for (const cohort of simCohorts) {
      if (index >= cohort.startIndex) {
        const monthsSinceStart = index - cohort.startIndex;
        const rampFactor = getRampFactor(monthsSinceStart, inputs.rampUpMonths);
        const effective = cohort.count * rampFactor;
        hcEffectiveFromExisting += effective;
        cohortContributions.push({
          monthIndex: cohort.openedAtIndex,
          nominal: cohort.count,
          effective,
          rampFactor,
        });
      }
    }

    const hcEffectiveBeforeHires = hcEffectiveFromExisting;
    const hcAvailableEffective = hcEffectiveBeforeHires;
    const capacityAvailableTotal = hcAvailableEffective * capacityPerAgent;

    const gapFte = Math.max(0, agentsNeeded - hcAvailableEffective);
    const gap = Math.ceil(gapFte);

    const turnoverFormula = buildTurnoverFormula(
      inputs, turnoverContext, point.key, turnoverBase, turnover,
    );

    if (inputs.turnoverTiming === "end_of_month" && turnover > 0) {
      turnoverAppliedEnd = turnover;
      let remainingTurnover = turnoverAppliedEnd;
      const legacyTurnover = Math.min(legacyNominal, remainingTurnover);
      legacyNominal = Math.max(0, legacyNominal - legacyTurnover);
      remainingTurnover -= legacyTurnover;

      for (let ci = 0; ci < simCohorts.length && remainingTurnover > 0; ci++) {
        const c = simCohorts[ci];
        const ct = Math.min(c.count, remainingTurnover);
        c.count -= ct;
        remainingTurnover -= ct;
      }
    }

    const hcFinal = Math.max(0,
      legacyNominal + simCohorts.reduce((acc, c) => acc + c.count, 0),
    );

    const risk = computeRisk(gap);

    let hiresStarted = 0;
    let hiresOpened = 0;
    
    for (const cohort of readonlyCohorts) {
      if (cohort.startIndex === index) {
        hiresStarted += cohort.count;
      }
      if (cohort.openedAtIndex === index) {
        hiresOpened += cohort.count;
      }
    }
    
    const rampOffset = inputs.hiringMode === "antecipado" ? getRampMaturationOffset(inputs.rampUpMonths) : 0;
    const openOffset = inputs.leadTimeMonths + rampOffset;
    const openMonthIndex = index - openOffset;
    const openIn = openMonthIndex >= 0 && openMonthIndex < timeline.length
      ? timeline[openMonthIndex].label
      : "Antes do período";

    rows.push({
      month: point,
      ...demand,
      capacityPerAgent,
      capacityAvailableTotal,
      agentsNeededRaw,
      agentsNeeded,
      hcNominalStart,
      turnoverAppliedStart,
      hcNominalAfterTurnoverStart,
      hcEffectiveBeforeHires,
      hcAvailableEffective,
      hcInitial: hcNominalStart,
      turnover,
      turnoverFormula,
      turnoverTiming: inputs.turnoverTiming,
      turnoverAppliedEnd,
      hcFinal,
      gapFte,
      gap,
      // For backward compatibility: in the old system 'hire' mapped strictly to
      // 'vacancies opened AT THIS index'.
      hire: hiresOpened,
      hiresOpened,
      hiresStarted,
      cohortContributions,
      openIn,
      openMonthIndex,
      risk,
    });

    previousClients = demand.clientsBase;
  }

  return rows;
}

export const runPlannerProjection = (inputs: PlannerInputs): ProjectionResult => {
  const timeline = buildTimeline(inputs.startMonth, inputs.endMonth);

  if (timeline.length === 0) {
    return {
      timeline: [],
      rows: [],
      summary: {
        volumeQ4: 0, volumeHumanQ4: 0, capacityPerAgent: 0,
        agentsNeededQ4: 0, hiresYear: 0,
        criticalOpenMonth: "Sem risco", riskMonths: [],
      },
    };
  }

  const cohorts: HireCohort[] = [];

  for (let index = 0; index < timeline.length; index++) {
    const rampOffset = inputs.hiringMode === "antecipado" ? getRampMaturationOffset(inputs.rampUpMonths) : 0;
    const intendedImpactIndex = index + inputs.leadTimeMonths + rampOffset;

    const currentSimulation = runSimulationWithCohorts(inputs, timeline, cohorts);

    let maxGapToCover = 0;

    if (index === 0) {
      const limit = Math.min(timeline.length - 1, intendedImpactIndex);
      for (let k = inputs.leadTimeMonths; k <= limit; k++) {
        maxGapToCover = Math.max(maxGapToCover, currentSimulation[k].gapFte);
      }
    } else {
      if (intendedImpactIndex < timeline.length) {
        maxGapToCover = currentSimulation[intendedImpactIndex].gapFte;
      } else {
        const startIndex = index + inputs.leadTimeMonths;
        if (startIndex < timeline.length) {
          maxGapToCover = currentSimulation[timeline.length - 1].gapFte;
        }
      }
    }

    if (maxGapToCover > 0) {
      cohorts.push({
        openedAtIndex: index,
        startIndex: index + inputs.leadTimeMonths,
        count: Math.ceil(maxGapToCover),
      });
    }
  }

  const rows = runSimulationWithCohorts(inputs, timeline, cohorts);

  const last = rows[rows.length - 1];
  const hiresYear = rows.reduce((acc, r) => acc + r.hire, 0);
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
      hiresYear,
      criticalOpenMonth,
      riskMonths,
    },
  };
};
