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

  const capacityPerAgent = computeCapacityPerAgent(inputs);
  const contactRate = resolveContactRate(inputs);
  const turnoverContext = buildTurnoverContext(inputs, timeline);
  const totalSteps = Math.max(1, timeline.length - 1);
  const linearStep = (inputs.targetClientsQ4 - inputs.currentClients) / totalSteps;
  const fallbackGrowth = computeFallbackManualGrowthPct(inputs, totalSteps);

  const rows: MonthlyProjection[] = [];
  let previousClients = inputs.currentClients;
  let legacyNominal = inputs.headcountCurrent;
  const cohorts: HireCohort[] = [];

  // Pre-compute: in "antecipado" mode, we do a forward-looking pass
  // to figure out how many hires to open NOW so they're ramped up LATER.
  // In "gap" mode, hires are opened with leadTime offset but start immediately after leadTime.

  /**
   * Key insight of the new model:
   *
   * - leadTimeMonths: delay between opening a vacancy and the hire starting work.
   *   A hire opened at month i starts at month i + leadTimeMonths.
   *
   * - hiringMode "gap": open the vacancy at month i (when gap is detected).
   *   The hire starts at i + leadTimeMonths. No ramp-up anticipation.
   *
   * - hiringMode "antecipado": open the vacancy earlier so the hire is fully
   *   ramped at month i. Open at i - leadTimeMonths - (rampUpMonths - 1).
   *
   * We use a two-pass approach:
   *   Pass 1: compute demand for all months
   *   Pass 2: compute hiring with proper lead time
   *
   * For simplicity and backward compat, we do a single forward pass but
   * track cohorts with their startIndex.
   */

  for (let index = 0; index < timeline.length; index++) {
    const point = timeline[index];

    // ── Demand ──
    const demand = computeDemandForMonth(
      inputs, point, index, previousClients, contactRate, linearStep, fallbackGrowth,
    );

    const agentsNeededRaw = demand.volumeHuman / Math.max(1, capacityPerAgent);
    const agentsNeeded = Math.ceil(agentsNeededRaw);

    // ── HC available (before this month's hires) ──
    const hcNominalStart = Math.max(0,
      legacyNominal + cohorts.reduce((acc, c) => acc + c.count, 0),
    );

    // Effective HC: legacy + each cohort's ramped contribution
    const cohortContributions: CohortContribution[] = [];
    let hcEffectiveFromExisting = legacyNominal;

    for (const cohort of cohorts) {
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

    // ── Turnover ──
    // Apply turnover based on timing configuration
    let hcAfterTurnover = hcEffectiveFromExisting;
    const turnoverBase = inputs.turnoverTiming === "start_of_month"
      ? hcEffectiveFromExisting
      : hcEffectiveFromExisting; // base is always current HC
    const turnover = resolveTurnoverForMonth(inputs, turnoverContext, point.key, turnoverBase);

    if (inputs.turnoverTiming === "start_of_month" && turnover > 0) {
      hcAfterTurnover = Math.max(0, hcEffectiveFromExisting - turnover);
    }

    // ── Gap & hiring ──
    const hcBeforeHire = inputs.turnoverTiming === "start_of_month" ? hcAfterTurnover : hcEffectiveFromExisting;
    const preHireGapFte = Math.max(0, agentsNeeded - hcBeforeHire);
    const hire = Math.ceil(preHireGapFte);

    // Determine when this hire actually starts working
    const hireStartIndex = index + inputs.leadTimeMonths;

    if (hire > 0) {
      cohorts.push({
        openedAtIndex: index,
        startIndex: hireStartIndex,
        count: hire,
      });
    }

    // For "antecipado" mode, check if there are future needs we should hire for now
    let hiresOpened = hire;
    let hiresStarted = 0;

    // Count hires that started this month (from previous openings)
    for (const cohort of cohorts) {
      if (cohort.startIndex === index) {
        hiresStarted += cohort.count;
      }
    }

    // Recalculate effective HC including new hires that start THIS month
    let hcAvailableEffective = hcBeforeHire;
    for (const cohort of cohorts) {
      if (cohort.startIndex === index) {
        // New hire starting this month with ramp factor
        hcAvailableEffective += cohort.count * getRampFactor(0, inputs.rampUpMonths);
      }
    }

    // For end-of-month turnover, apply after hiring
    if (inputs.turnoverTiming === "end_of_month" && turnover > 0) {
      hcAfterTurnover = Math.max(0, hcAvailableEffective - turnover);
    }

    const capacityAvailableTotal = hcAvailableEffective * capacityPerAgent;
    const gapFte = Math.max(0, agentsNeeded - hcAvailableEffective);
    const gap = Math.ceil(gapFte);

    const turnoverFormula = buildTurnoverFormula(
      inputs, turnoverContext, point.key, turnoverBase, turnover,
    );

    // ── Apply turnover to nominal counts ──
    let remainingTurnover = Math.min(turnover, hcNominalStart + hire);
    const legacyTurnover = Math.min(legacyNominal, remainingTurnover);
    legacyNominal = Math.max(0, legacyNominal - legacyTurnover);
    remainingTurnover -= legacyTurnover;

    for (let ci = 0; ci < cohorts.length && remainingTurnover > 0; ci++) {
      const c = cohorts[ci];
      const ct = Math.min(c.count, remainingTurnover);
      c.count -= ct;
      remainingTurnover -= ct;
    }

    // Clean up empty cohorts
    for (let ci = cohorts.length - 1; ci >= 0; ci--) {
      if (cohorts[ci].count <= 0) cohorts.splice(ci, 1);
    }

    const hcFinal = Math.max(0,
      legacyNominal + cohorts.reduce((acc, c) => acc + c.count, 0),
    );

    // ── Open vacancy timing ──
    const rampOffset = inputs.hiringMode === "antecipado" ? getRampMaturationOffset(inputs.rampUpMonths) : 0;
    const openOffset = inputs.leadTimeMonths + rampOffset;
    const openMonthIndex = index - openOffset;

    const risk = computeRisk(gap);

    rows.push({
      month: point,
      ...demand,
      capacityPerAgent,
      capacityAvailableTotal,
      agentsNeededRaw,
      agentsNeeded,
      hcNominalStart,
      hcAvailableEffective,
      hcInitial: hcNominalStart,
      turnover,
      turnoverFormula,
      turnoverTiming: inputs.turnoverTiming,
      hcFinal,
      gapFte,
      gap,
      hire,
      hiresOpened: hiresOpened,
      hiresStarted,
      cohortContributions,
      openIn: openMonthIndex >= 0 && openMonthIndex < timeline.length
        ? timeline[openMonthIndex].label
        : "Antes do período",
      openMonthIndex,
      risk,
    });

    previousClients = demand.clientsBase;
  }

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
