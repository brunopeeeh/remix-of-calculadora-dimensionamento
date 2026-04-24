import { PlannerInputs, ScenarioKey } from "./types";

export const BASE_YEAR = 2026;

const toTimelineKey = (month: number, year = BASE_YEAR) => `${year}-${String(month).padStart(2, "0")}`;

const baseManualGrowthByMonth: Record<number, number> = {
  3: 3.4, 4: 3.4, 5: 3.6, 6: 3.6,
  7: 3.8, 8: 3.8, 9: 3.9, 10: 3.9,
  11: 4, 12: 4,
};

const baseManualGrowth = Object.fromEntries(
  Object.entries(baseManualGrowthByMonth).map(([month, growth]) => [toTimelineKey(Number(month)), growth]),
);

const defaultTurnoverMonths = [5, 8, 11].map((month) => toTimelineKey(month));

const defaultPeriod = { startYear: BASE_YEAR, endYear: BASE_YEAR };

export const SCENARIO_PRESETS: Record<ScenarioKey, PlannerInputs> = {
  base: {
    currentClients: 6800,
    targetClientsQ4: 9500,
    targetClientsGrowthPct: 40,
    currentVolume: 18000,
    contactRate: 2.65,
    startMonth: 3,
    endMonth: 12,
    ...defaultPeriod,
    growthMode: "linear",
    manualGrowthByMonth: { ...baseManualGrowth },
    manualSeasonalityByMonth: {},

    aiCoveragePct: 27,
    aiGrowthMonthlyPct: 0.7,
    extraAutomationPct: 2,

    headcountCurrent: 12,
    productivityBase: 900,
    rampUpMonths: 3,
    tmaN1: 20,
    tmaN2: 45,
    mixN1Pct: 80,
    mixN2Pct: 20,

    breaksPct: 8,
    offchatPct: 11,
    meetingsPct: 6,
    vacationPct: 9,
    vacationEligiblePct: 70,
    useTenureVacation: false,
    agentsWithTenure: 0,
    promotionsCount: 0,

    turnoverValue: 3,
    turnoverPeriod: "anual",
    turnoverInputMode: "absoluto",
    turnoverTiming: "end_of_month",
    turnoverMonths: [...defaultTurnoverMonths],

    leadTimeMonths: 2,
    hiringMode: "antecipado",
    useN1N2Split: true,
  },
  otimista: {
    currentClients: 6800,
    targetClientsQ4: 9100,
    targetClientsGrowthPct: 34,
    currentVolume: 17500,
    contactRate: 2.5,
    startMonth: 3,
    endMonth: 12,
    ...defaultPeriod,
    growthMode: "linear",
    manualGrowthByMonth: { ...baseManualGrowth },
    manualSeasonalityByMonth: {},

    aiCoveragePct: 33,
    aiGrowthMonthlyPct: 1,
    extraAutomationPct: 4,

    headcountCurrent: 12,
    productivityBase: 980,
    rampUpMonths: 3,
    tmaN1: 18,
    tmaN2: 40,
    mixN1Pct: 82,
    mixN2Pct: 18,

    breaksPct: 7,
    offchatPct: 9,
    meetingsPct: 5,
    vacationPct: 8,
    vacationEligiblePct: 65,
    useTenureVacation: false,
    agentsWithTenure: 0,
    promotionsCount: 0,

    turnoverValue: 2,
    turnoverPeriod: "anual",
    turnoverInputMode: "absoluto",
    turnoverTiming: "end_of_month",
    turnoverMonths: [...defaultTurnoverMonths],

    leadTimeMonths: 2,
    hiringMode: "antecipado",
    useN1N2Split: true,
  },
  pessimista: {
    currentClients: 6800,
    targetClientsQ4: 9900,
    targetClientsGrowthPct: 46,
    currentVolume: 18800,
    contactRate: 2.85,
    startMonth: 3,
    endMonth: 12,
    ...defaultPeriod,
    growthMode: "linear",
    manualGrowthByMonth: { ...baseManualGrowth },
    manualSeasonalityByMonth: {},

    aiCoveragePct: 22,
    aiGrowthMonthlyPct: 0.4,
    extraAutomationPct: 1,

    headcountCurrent: 12,
    productivityBase: 830,
    rampUpMonths: 3,
    tmaN1: 22,
    tmaN2: 48,
    mixN1Pct: 76,
    mixN2Pct: 24,

    breaksPct: 10,
    offchatPct: 14,
    meetingsPct: 8,
    vacationPct: 11,
    vacationEligiblePct: 75,
    useTenureVacation: false,
    agentsWithTenure: 0,
    promotionsCount: 0,

    turnoverValue: 4,
    turnoverPeriod: "anual",
    turnoverInputMode: "absoluto",
    turnoverTiming: "end_of_month",
    turnoverMonths: [...defaultTurnoverMonths],

    leadTimeMonths: 3,
    hiringMode: "gap",
    useN1N2Split: true,
  },
};

export const EMPTY_PLANNER_INPUTS: PlannerInputs = {
  currentClients: 0,
  targetClientsQ4: 0,
  targetClientsGrowthPct: 0,
  currentVolume: 0,
  contactRate: 0,
  startMonth: 3,
  endMonth: 12,
  startYear: BASE_YEAR,
  endYear: BASE_YEAR,
  growthMode: "linear",
  manualGrowthByMonth: {},
  manualSeasonalityByMonth: {},

  aiCoveragePct: 0,
  aiGrowthMonthlyPct: 0,
  extraAutomationPct: 0,

  headcountCurrent: 0,
  productivityBase: 0,
  rampUpMonths: 3,
  tmaN1: 20,
  tmaN2: 45,
  mixN1Pct: 80,
  mixN2Pct: 20,

  breaksPct: 0,
  offchatPct: 0,
  meetingsPct: 0,
  vacationPct: 0,
  vacationEligiblePct: 0,
  useTenureVacation: false,
  agentsWithTenure: 0,
  promotionsCount: 0,

  turnoverValue: 0,
  turnoverPeriod: "anual",
  turnoverInputMode: "absoluto",
  turnoverTiming: "end_of_month",
  turnoverMonths: [],

  leadTimeMonths: 0,
  hiringMode: "gap",
  useN1N2Split: false,
};

export const scenarioLabels: Record<ScenarioKey, string> = {
  base: "Base",
  otimista: "Otimista",
  pessimista: "Desafiante",
};
