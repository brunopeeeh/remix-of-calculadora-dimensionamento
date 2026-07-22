export type ScenarioKey = "base" | "otimista" | "pessimista";
export type GrowthMode = "linear" | "manual";
export type HiringMode = "gap" | "antecipado";
export type TurnoverPeriod = "mensal" | "trimestral" | "semestral" | "anual";
export type TurnoverInputMode = "absoluto" | "percentual";
export type TurnoverTiming = "start_of_month" | "end_of_month";
export type RookieRampMonth = 1 | 2 | 3;

/** Configurable productivity factors for each ramp-up month */
export interface RookieRampFactors {
  month1: number; // default 0.33
  month2: number; // default 0.66
  month3: number; // default 1.0
}

export interface PlannerInputs {
  currentClients: number;
  targetClientsQ4: number;
  targetClientsGrowthPct: number;
  currentVolume: number;
  contactRate: number;
  startMonth: number;
  endMonth: number;
  startYear: number;
  endYear: number;
  growthMode: GrowthMode;
  manualGrowthByMonth: Record<string, number>;
  manualSeasonalityByMonth: Record<string, number>;

  aiCoveragePct: number;
  aiGrowthMonthlyPct: number;
  extraAutomationPct: number;

  /** Total headcount = headcountPleno + headcountNovo. Auto-derived by usePlannerState. */
  headcountCurrent: number;
  headcountPleno: number;
  headcountNovo: number;
  rookieRampFactors: RookieRampFactors;
  productivityBase: number;
  rampUpMonths: number;
  tmaN1: number;
  tmaN2: number;
  mixN1Pct: number;
  mixN2Pct: number;
  useN1N2Split: boolean;

  breaksPct: number;
  offchatPct: number;
  meetingsPct: number;
  vacationPct: number;
  useTenureVacation: boolean;
  agentsWithTenure: number;
  /** Total de promoções durante o período. Reduz mixN1Pct e aumenta mixN2Pct ao longo da projeção (N1 → N2). */
  promotionsCount: number;

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
  turnoverAppliedStart: number;
  hcNominalAfterTurnoverStart: number;

  hcEffectiveBeforeHires: number;
  hcAvailableEffective: number;

  hcInitial: number;
  turnover: number;
  turnoverFormula: string;
  turnoverTiming: TurnoverTiming;

  turnoverAppliedEnd: number;
  hcFinal: number;

  hcPleno: number;
  hcRookieNominal: number;
  hcRookieEffective: number;
  hcTotalEffective: number;

  gapFte: number;
  gap: number;
  hiresOpened: number;
  hiresStarted: number;
  hire: number;
  cohortContributions: CohortContribution[];
  openIn: string;
  openMonthIndex: number;
  /** O mês futuro que as contratações abertas neste mês irão cobrir (quando estiverem 100% na rampa) */
  targetImpactLabel: string;
  targetImpactIndex: number;
  risk: "ok" | "attention" | "critical";
}

export interface ProjectionSummary {
  volumeQ4: number;
  volumeHumanQ4: number;
  capacityPerAgent: number;
  agentsNeededQ4: number;
  hcFinalQ4: number;
  totalTurnoverYear: number;
  hiresYear: number;
  criticalOpenMonth: string;
  riskMonths: string[];
  /** Vagas que precisariam ter começado antes do horizonte para chegar a tempo (déficit inevitável). */
  hiresScheduledLate?: number;
}

export interface ProjectionResult {
  timeline: MonthPoint[];
  rows: MonthlyProjection[];
  summary: ProjectionSummary;
}
