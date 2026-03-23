export type ScenarioKey = "base" | "otimista" | "pessimista";
export type GrowthMode = "linear" | "manual";
export type HiringMode = "gap" | "antecipado";
export type TurnoverPeriod = "mensal" | "semestral" | "anual";
export type TurnoverInputMode = "absoluto" | "percentual";
export type TurnoverTiming = "start_of_month" | "end_of_month";

export interface PlannerInputs {
  currentClients: number;
  targetClientsQ4: number;
  currentVolume: number;
  contactRate: number;
  startMonth: number;
  endMonth: number;
  growthMode: GrowthMode;
  manualGrowthByMonth: Record<string, number>;

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

  turnoverValue: number;
  turnoverPeriod: TurnoverPeriod;
  turnoverInputMode: TurnoverInputMode;
  turnoverTiming: TurnoverTiming;
  turnoverMonths: string[];

  leadTimeMonths: number;
  hiringMode: HiringMode;
}

export interface MonthPoint {
  key: string;
  month: number;
  year: number;
  label: string;
}

export interface CohortContribution {
  monthIndex: number;
  nominal: number;
  effective: number;
  rampFactor: number;
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
  agentsNeededRaw: number;
  agentsNeeded: number;
  hcNominalStart: number;
  hcAvailableEffective: number;
  hcInitial: number;
  turnover: number;
  turnoverFormula: string;
  turnoverTiming: TurnoverTiming;
  hcFinal: number;
  gapFte: number;
  gap: number;
  hiresOpened: number;
  hiresStarted: number;
  hire: number;
  cohortContributions: CohortContribution[];
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
