export type ScenarioKey = "base" | "otimista" | "pessimista";
export type GrowthMode = "linear" | "manual";
export type HiringMode = "gap" | "antecipado";

export interface PlannerInputs {
  currentClients: number;
  targetClientsQ4: number;
  currentVolume: number;
  contactRate: number;
  startMonth: number;
  endMonth: number;
  growthMode: GrowthMode;
  manualGrowthByMonth: Record<number, number>;

  aiCoveragePct: number;
  aiGrowthMonthlyPct: number;
  extraAutomationPct: number;

  headcountCurrent: number;
  productivityBase: number;
  rampUpMonths: number;
  tmaN1: number;
  tmaN2: number;
  mixN1Pct: number;
  mixN2Pct: number;

  breaksPct: number;
  offchatPct: number;
  meetingsPct: number;
  vacationPct: number;
  vacationEligiblePct: number;

  turnoverAnnual: number;
  turnoverMonths: number[];

  leadTimeMonths: number;
  hiringMode: HiringMode;
}

export interface MonthPoint {
  month: number;
  year: number;
  label: string;
}

export interface MonthlyProjection {
  month: MonthPoint;
  clientsBase: number;
  contactRate: number;
  volumeGross: number;
  aiPct: number;
  volumeAI: number;
  volumeHuman: number;
  capacityPerAgent: number;
  capacityAvailableTotal: number;
  agentsNeeded: number;
  hcAvailableEffective: number;
  hcInitial: number;
  turnover: number;
  hcFinal: number;
  gapFte: number;
  gap: number;
  hire: number;
  openIn: string;
  openMonthIndex: number;
  risk: "ok" | "attention" | "critical";
}

export interface ProjectionSummary {
  volumeQ4: number;
  volumeHumanQ4: number;
  capacityPerAgent: number;
  agentsNeededQ4: number;
  hiresYear: number;
  criticalOpenMonth: string;
  riskMonths: string[];
}

export interface ProjectionResult {
  timeline: MonthPoint[];
  rows: MonthlyProjection[];
  summary: ProjectionSummary;
}
