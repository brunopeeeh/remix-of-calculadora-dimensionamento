import { PlannerInputs, ScenarioKey } from "./types";

const baseManualGrowth: Record<number, number> = {
  3: 3.4,
  4: 3.4,
  5: 3.6,
  6: 3.6,
  7: 3.8,
  8: 3.8,
  9: 3.9,
  10: 3.9,
  11: 4,
  12: 4,
};

export const SCENARIO_PRESETS: Record<ScenarioKey, PlannerInputs> = {
  base: {
    currentClients: 6800,
    targetClientsQ4: 9500,
    currentVolume: 18000,
    contactRate: 2.65,
    startMonth: 3,
    endMonth: 12,
    growthMode: "linear",
    manualGrowthByMonth: { ...baseManualGrowth },

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

    turnoverAnnual: 3,
    turnoverMonths: [5, 8, 11],

    leadTimeMonths: 2,
    hiringMode: "antecipado",
  },
  otimista: {
    currentClients: 6800,
    targetClientsQ4: 9100,
    currentVolume: 17500,
    contactRate: 2.5,
    startMonth: 3,
    endMonth: 12,
    growthMode: "linear",
    manualGrowthByMonth: { ...baseManualGrowth },

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

    turnoverAnnual: 2,
    turnoverMonths: [5, 8, 11],

    leadTimeMonths: 2,
    hiringMode: "antecipado",
  },
  pessimista: {
    currentClients: 6800,
    targetClientsQ4: 9900,
    currentVolume: 18800,
    contactRate: 2.85,
    startMonth: 3,
    endMonth: 12,
    growthMode: "linear",
    manualGrowthByMonth: { ...baseManualGrowth },

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

    turnoverAnnual: 4,
    turnoverMonths: [5, 8, 11],

    leadTimeMonths: 3,
    hiringMode: "gap",
  },
};

export const scenarioLabels: Record<ScenarioKey, string> = {
  base: "Base",
  otimista: "Otimista",
  pessimista: "Pessimista",
};
