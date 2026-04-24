import { MonthPoint, PlannerInputs, TurnoverTiming } from "./types";

const getTurnoverPeriodMonths = (period: PlannerInputs["turnoverPeriod"]): number => {
  if (period === "mensal") return 1;
  if (period === "trimestral") return 3;
  if (period === "semestral") return 6;
  return 12;
};

const formatTurnoverPeriod = (period: PlannerInputs["turnoverPeriod"]): string => {
  if (period === "mensal") return "Mensal";
  if (period === "trimestral") return "Trimestral";
  if (period === "semestral") return "Semestral";
  return "Anual";
};

export const getAutoTurnoverMonths = (
  period: PlannerInputs["turnoverPeriod"],
  timeline: MonthPoint[]
): string[] => {
  if (timeline.length === 0) return [];
  const step = getTurnoverPeriodMonths(period);
  const result: string[] = [];
  // Gatilho ocorre a cada `step` meses a partir do primeiro mês (timeline[0])
  for (let i = 0; i < timeline.length; i += step) {
    result.push(timeline[i].key);
  }
  return result;
};

const formatTurnoverMode = (mode: PlannerInputs["turnoverInputMode"]): string => {
  if (mode === "percentual") return "Percentual";
  return "Absoluto";
};

const formatTurnoverTimingLabel = (timing: TurnoverTiming): string => {
  return timing === "start_of_month" ? "Início do mês" : "Fim do mês";
};

const fmt = (v: number) => v.toFixed(2);

export interface TurnoverContext {
  activeTimelineKeySet: Set<string>;
  activeCount: number;
  periodMonths: number;
}

export const buildTurnoverContext = (inputs: PlannerInputs, timeline: MonthPoint[]): TurnoverContext => {
  // If user has manually selected specific months, respect those
  if (inputs.turnoverMonths.length > 0) {
    const unique = [...new Set(inputs.turnoverMonths)];
    return {
      activeTimelineKeySet: new Set(unique),
      activeCount: unique.length,
      periodMonths: getTurnoverPeriodMonths(inputs.turnoverPeriod),
    };
  }

  // Otherwise, fall back to automatic calculation based on period
  const autoTimelineKeys = getAutoTurnoverMonths(inputs.turnoverPeriod, timeline);
  const unique = [...new Set(autoTimelineKeys)];

  return {
    activeTimelineKeySet: new Set(unique),
    activeCount: unique.length,
    periodMonths: getTurnoverPeriodMonths(inputs.turnoverPeriod),
  };
};

export const resolveTurnoverForMonth = (
  inputs: PlannerInputs,
  ctx: TurnoverContext,
  monthKey: string,
  hcBase: number,
): number => {
  if (inputs.turnoverValue <= 0 || !ctx.activeTimelineKeySet.has(monthKey) || ctx.activeCount === 0) return 0;

  const monthlyRate = inputs.turnoverValue / ctx.periodMonths;
  const clampedRate = Math.min(monthlyRate, 50);

  if (inputs.turnoverInputMode === "percentual") {
    return hcBase * (clampedRate / 100);
  }

  return clampedRate;
};

export const buildTurnoverFormula = (
  inputs: PlannerInputs,
  ctx: TurnoverContext,
  monthKey: string,
  hcBase: number,
  turnover: number,
): string => {
  const periodLabel = formatTurnoverPeriod(inputs.turnoverPeriod);
  const modeLabel = formatTurnoverMode(inputs.turnoverInputMode);
  const timingLabel = formatTurnoverTimingLabel(inputs.turnoverTiming);
  const isActive = ctx.activeTimelineKeySet.has(monthKey);

  const prefix = `${modeLabel} ${periodLabel} (${timingLabel})`;

  if (ctx.activeCount === 0) return `${prefix} | sem meses ativos = 0`;
  if (!isActive) return `${prefix} | mês inativo = 0`;

  const monthlyRate = inputs.turnoverValue / ctx.periodMonths;
  const clampedRate = Math.min(monthlyRate, 50);

  if (inputs.turnoverInputMode === "percentual") {
    return `${prefix} | Base: HC (${fmt(hcBase)}) | ${fmt(clampedRate)}% mensal = ${fmt(turnover)}`;
  }

  return `${prefix} | ${fmt(clampedRate)} abs/mês = ${fmt(turnover)}`;
};

