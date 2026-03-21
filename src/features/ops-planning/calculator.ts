import { clamp, monthNames } from "./format";
import { MonthPoint, PlannerInputs, ProjectionResult } from "./types";

const MONTH_LIMIT = 24;
const BASE_YEAR = 2026;

const buildTimeline = (startMonth: number, endMonth: number): MonthPoint[] => {
  const timeline: MonthPoint[] = [];
  const start = new Date(BASE_YEAR, startMonth - 1, 1);
  const endYear = endMonth >= startMonth ? BASE_YEAR : BASE_YEAR + 1;
  const end = new Date(endYear, endMonth - 1, 1);

  const cursor = new Date(start);
  while (cursor <= end && timeline.length < MONTH_LIMIT) {
    const month = cursor.getMonth() + 1;
    const year = cursor.getFullYear();
    timeline.push({
      month,
      year,
      label: `${monthNames[month - 1]}/${String(year).slice(-2)}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return timeline;
};

const distributeTurnover = (inputs: PlannerInputs, timeline: MonthPoint[]) => {
  const activeMonths = timeline
    .map((point) => point.month)
    .filter((month, index, all) => inputs.turnoverMonths.includes(month) && all.indexOf(month) === index);

  if (activeMonths.length === 0 || inputs.turnoverAnnual <= 0) {
    return new Map<number, number>();
  }

  const base = Math.floor(inputs.turnoverAnnual / activeMonths.length);
  const remainder = inputs.turnoverAnnual % activeMonths.length;
  const map = new Map<number, number>();

  activeMonths.forEach((month, idx) => {
    map.set(month, base + (idx < remainder ? 1 : 0));
  });

  return map;
};

const baseWeightedTma = 20 * 0.8 + 45 * 0.2;

const rampFactor = (monthsSinceHire: number) => {
  if (monthsSinceHire < 0) return 0;
  if (monthsSinceHire === 0) return 0.33;
  if (monthsSinceHire === 1) return 0.66;
  return 1;
};

interface HireCohort {
  monthIndex: number;
  count: number;
}

export const runPlannerProjection = (inputs: PlannerInputs): ProjectionResult => {
  const timeline = buildTimeline(inputs.startMonth, inputs.endMonth);
  const rows = [] as ProjectionResult["rows"];

  if (timeline.length === 0) {
    return {
      timeline: [],
      rows: [],
      summary: {
        volumeQ4: 0,
        volumeHumanQ4: 0,
        capacityPerAgent: 0,
        agentsNeededQ4: 0,
        hiresYear: 0,
        criticalOpenMonth: "Sem risco",
        riskMonths: [],
      },
    };
  }

  const turnoverByMonth = distributeTurnover(inputs, timeline);
  const totalSteps = Math.max(1, timeline.length - 1);
  const linearStep = (inputs.targetClientsQ4 - inputs.currentClients) / totalSteps;
  const fallbackManualGrowth = (Math.pow(inputs.targetClientsQ4 / inputs.currentClients, 1 / totalSteps) - 1) * 100;

  const mixN1 = inputs.mixN1Pct / 100;
  const mixN2 = inputs.mixN2Pct / 100;
  const weightedTma = inputs.tmaN1 * mixN1 + inputs.tmaN2 * mixN2;
  const complexityFactor = clamp(baseWeightedTma / Math.max(1, weightedTma), 0.7, 1.4);

  const adjustedVacationPct = (inputs.vacationPct / 100) * (inputs.vacationEligiblePct / 100);
  const capacityPerAgent =
    inputs.productivityBase *
    complexityFactor *
    (1 - inputs.breaksPct / 100) *
    (1 - inputs.offchatPct / 100) *
    (1 - inputs.meetingsPct / 100) *
    (1 - adjustedVacationPct);

  let previousClients = inputs.currentClients;
  let legacyNominal = inputs.headcountCurrent;
  const hireCohorts: HireCohort[] = [];

  timeline.forEach((point, index) => {
    const clientsBase =
      index === 0
        ? inputs.currentClients
        : inputs.growthMode === "linear"
          ? inputs.currentClients + linearStep * index
          : previousClients * (1 + (inputs.manualGrowthByMonth[point.month] ?? fallbackManualGrowth) / 100);

    const volumeGross = clientsBase * inputs.contactRate;
    const aiPct = clamp(inputs.aiCoveragePct + inputs.aiGrowthMonthlyPct * index + inputs.extraAutomationPct, 0, 95);
    const volumeAI = volumeGross * (aiPct / 100);
    const volumeHuman = volumeGross - volumeAI;

    const agentsNeeded = Math.ceil(volumeHuman / Math.max(1, capacityPerAgent));

    const hcInitial = Math.max(0, legacyNominal + hireCohorts.reduce((acc, cohort) => acc + cohort.count, 0));
    const hcAvailableFromExisting =
      legacyNominal +
      hireCohorts.reduce((acc, cohort) => acc + cohort.count * rampFactor(index - cohort.monthIndex), 0);

    const preHireGapFte = Math.max(0, agentsNeeded - hcAvailableFromExisting);
    const hire = Math.ceil(preHireGapFte);
    const hcAvailableEffective = hcAvailableFromExisting + hire * rampFactor(0);
    const capacityAvailableTotal = hcAvailableEffective * capacityPerAgent;

    const gapFte = Math.max(0, agentsNeeded - hcAvailableEffective);
    const gap = Math.ceil(gapFte);
    const turnover = turnoverByMonth.get(point.month) ?? 0;

    if (hire > 0) {
      hireCohorts.push({ monthIndex: index, count: hire });
    }

    let remainingTurnover = Math.min(turnover, hcInitial + hire);
    const legacyTurnover = Math.min(legacyNominal, remainingTurnover);
    legacyNominal = Math.max(0, legacyNominal - legacyTurnover);
    remainingTurnover -= legacyTurnover;

    for (let cohortIdx = 0; cohortIdx < hireCohorts.length && remainingTurnover > 0; cohortIdx += 1) {
      const cohort = hireCohorts[cohortIdx];
      const cohortTurnover = Math.min(cohort.count, remainingTurnover);
      cohort.count -= cohortTurnover;
      remainingTurnover -= cohortTurnover;
    }

    for (let cohortIdx = hireCohorts.length - 1; cohortIdx >= 0; cohortIdx -= 1) {
      if (hireCohorts[cohortIdx].count <= 0) {
        hireCohorts.splice(cohortIdx, 1);
      }
    }

    const hcFinal = Math.max(0, legacyNominal + hireCohorts.reduce((acc, cohort) => acc + cohort.count, 0));

    const openOffset = inputs.leadTimeMonths + (inputs.hiringMode === "antecipado" ? 2 : 0);
    const openMonthIndex = index - openOffset;

    const risk = gap === 0 ? "ok" : gap <= 1 ? "attention" : "critical";

    rows.push({
      month: point,
      clientsBase,
      contactRate: inputs.contactRate,
      volumeGross,
      aiPct,
      volumeAI,
      volumeHuman,
      capacityPerAgent,
      capacityAvailableTotal,
      agentsNeeded,
      hcAvailableEffective,
      hcInitial,
      turnover,
      hcFinal,
      gapFte,
      gap,
      hire,
      openIn: openMonthIndex >= 0 ? timeline[openMonthIndex].label : "Antes do período",
      openMonthIndex,
      risk,
    });

    previousClients = clientsBase;
  });

  const last = rows[rows.length - 1];
  const hiresYear = rows.reduce((acc, row) => acc + row.hire, 0);
  const riskMonths = rows.filter((row) => row.gap > 0).map((row) => row.month.label);
  const criticalOpenMonth =
    rows.find((row) => row.gap > 0)?.openIn ??
    "Sem risco";

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
