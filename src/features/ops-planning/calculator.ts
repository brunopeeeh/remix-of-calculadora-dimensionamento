import { clamp, monthNames } from "./format";
import { MonthPoint, PlannerInputs, ProjectionResult } from "./types";

const MONTH_LIMIT = 24;
const BASE_YEAR = 2026;

export const getTimelineKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

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
      key: getTimelineKey(year, month),
      month,
      year,
      label: `${monthNames[month - 1]}/${String(year).slice(-2)}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return timeline;
};

const getTurnoverPeriodMonths = (period: PlannerInputs["turnoverPeriod"]) => {
  if (period === "mensal") return 1;
  if (period === "semestral") return 6;
  return 12;
};

interface TurnoverContext {
  activeTimelineKeySet: Set<string>;
  activeCount: number;
  distributionFactor: number;
  periodMonths: number;
}

const formatTurnoverPeriod = (period: PlannerInputs["turnoverPeriod"]) => {
  if (period === "mensal") return "Mensal";
  if (period === "semestral") return "Semestral";
  return "Anual";
};

const formatTurnoverMode = (mode: PlannerInputs["turnoverInputMode"]) => {
  if (mode === "percentual") return "Percentual";
  return "Absoluto";
};

const formatAuditNumber = (value: number) => value.toFixed(2);

const buildTurnoverContext = (inputs: PlannerInputs, timeline: MonthPoint[]): TurnoverContext => {
  const activeTimelineKeys = timeline
    .map((point) => point.key)
    .filter((key, index, all) => inputs.turnoverMonths.includes(key) && all.indexOf(key) === index);

  return {
    activeTimelineKeySet: new Set(activeTimelineKeys),
    activeCount: activeTimelineKeys.length,
    distributionFactor: activeTimelineKeys.length > 0 ? timeline.length / activeTimelineKeys.length : 0,
    periodMonths: getTurnoverPeriodMonths(inputs.turnoverPeriod),
  };
};

const resolveTurnoverForMonth = (
  inputs: PlannerInputs,
  turnoverContext: TurnoverContext,
  monthKey: string,
  hcAvailableEffective: number,
) => {
  if (inputs.turnoverValue <= 0 || !turnoverContext.activeTimelineKeySet.has(monthKey)) {
    return 0;
  }

  if (inputs.turnoverInputMode === "percentual") {
    const monthlyRate = (inputs.turnoverValue / 100) / turnoverContext.periodMonths;
    return hcAvailableEffective * monthlyRate * turnoverContext.distributionFactor;
  }

  const monthlyAbsolute = turnoverContext.activeCount > 0 ? inputs.turnoverValue / turnoverContext.activeCount : 0;
  return monthlyAbsolute;
};

const buildTurnoverFormula = (
  inputs: PlannerInputs,
  turnoverContext: TurnoverContext,
  monthKey: string,
  hcAvailableEffective: number,
  turnover: number,
) => {
  const periodLabel = formatTurnoverPeriod(inputs.turnoverPeriod);
  const modeLabel = formatTurnoverMode(inputs.turnoverInputMode);
  const isActiveMonth = turnoverContext.activeTimelineKeySet.has(monthKey);

  if (inputs.turnoverInputMode === "percentual") {
    return `${modeLabel} ${periodLabel} | Base: HC disp. mês (${formatAuditNumber(hcAvailableEffective)}) | Fórmula: (${formatAuditNumber(inputs.turnoverValue)}% ÷ ${turnoverContext.periodMonths}) × ${formatAuditNumber(hcAvailableEffective)} × ${formatAuditNumber(turnoverContext.distributionFactor)} = ${formatAuditNumber(turnover)}`;
  }

  if (turnoverContext.activeCount === 0) {
    return `${modeLabel} ${periodLabel} | Base: meses selecionados (0) | Fórmula: sem meses ativos = 0`;
  }

  if (!isActiveMonth) {
    return `${modeLabel} ${periodLabel} | Base: meses selecionados (${turnoverContext.activeCount}) | Fórmula: mês inativo = 0`;
  }

  return `${modeLabel} ${periodLabel} | Base: meses selecionados (${turnoverContext.activeCount}) | Fórmula: ${formatAuditNumber(inputs.turnoverValue)} ÷ ${turnoverContext.activeCount} = ${formatAuditNumber(turnover)}`;
};

const baseWeightedTma = 20 * 0.8 + 45 * 0.2;

export const getRampFactor = (monthsSinceHire: number, rampUpMonths: number) => {
  if (monthsSinceHire < 0) return 0;
  if (rampUpMonths <= 1) return 1;
  if (monthsSinceHire >= rampUpMonths - 1) return 1;
  return (monthsSinceHire + 1) / rampUpMonths;
};

const getRampMaturationOffset = (rampUpMonths: number) => {
  if (rampUpMonths <= 1) return 0;
  return rampUpMonths - 1;
};

export const resolveContactRate = (inputs: PlannerInputs) => {
  if (inputs.contactRate > 0) return inputs.contactRate;
  if (inputs.currentClients <= 0) return 0;
  return inputs.currentVolume / inputs.currentClients;
};

const fallbackManualGrowthPct = (inputs: PlannerInputs, totalSteps: number) => {
  if (inputs.currentClients <= 0 || inputs.targetClientsQ4 <= 0) return 0;
  return (Math.pow(inputs.targetClientsQ4 / inputs.currentClients, 1 / totalSteps) - 1) * 100;
};

interface HireCohort {
  monthIndex: number;
  count: number;
}

const computeRisk = (gap: number) => {
  if (gap === 0) return "ok" as const;
  if (gap <= 1) return "attention" as const;
  return "critical" as const;
};

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

  const turnoverContext = buildTurnoverContext(inputs, timeline);
  const totalSteps = Math.max(1, timeline.length - 1);
  const linearStep = (inputs.targetClientsQ4 - inputs.currentClients) / totalSteps;
  const fallbackManualGrowth = fallbackManualGrowthPct(inputs, totalSteps);
  const contactRate = resolveContactRate(inputs);

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
          : previousClients * (1 + (inputs.manualGrowthByMonth[point.key] ?? fallbackManualGrowth) / 100);

    const volumeGross = clientsBase * contactRate;
    const aiPct = clamp(inputs.aiCoveragePct + inputs.aiGrowthMonthlyPct * index + inputs.extraAutomationPct, 0, 95);
    const volumeAI = volumeGross * (aiPct / 100);
    const volumeHuman = volumeGross - volumeAI;

    const agentsNeededRaw = volumeHuman / Math.max(1, capacityPerAgent);
    const agentsNeeded = Math.ceil(agentsNeededRaw);

    const hcInitial = Math.max(0, legacyNominal + hireCohorts.reduce((acc, cohort) => acc + cohort.count, 0));
    const hcAvailableFromExisting =
      legacyNominal +
      hireCohorts.reduce((acc, cohort) => acc + cohort.count * getRampFactor(index - cohort.monthIndex, inputs.rampUpMonths), 0);

    const preHireGapFte = Math.max(0, agentsNeeded - hcAvailableFromExisting);
    const hire = Math.ceil(preHireGapFte);
    const hcAvailableEffective = hcAvailableFromExisting + hire * getRampFactor(0, inputs.rampUpMonths);
    const capacityAvailableTotal = hcAvailableEffective * capacityPerAgent;

    const gapFte = Math.max(0, agentsNeeded - hcAvailableEffective);
    const gap = Math.ceil(gapFte);
    const turnover = resolveTurnoverForMonth(inputs, turnoverContext, point.key, hcAvailableEffective);
    const turnoverFormula = buildTurnoverFormula(inputs, turnoverContext, point.key, hcAvailableEffective, turnover);

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

    const openOffset =
      inputs.leadTimeMonths +
      (inputs.hiringMode === "antecipado" ? getRampMaturationOffset(inputs.rampUpMonths) : 0);
    const openMonthIndex = index - openOffset;

    const risk = computeRisk(gap);

    rows.push({
      month: point,
      clientsBase,
      contactRate,
      volumeGross,
      aiPct,
      volumeAI,
      volumeHuman,
      capacityPerAgent,
      capacityAvailableTotal,
      agentsNeededRaw,
      agentsNeeded,
      hcAvailableEffective,
      hcInitial,
      turnover,
      turnoverFormula,
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
