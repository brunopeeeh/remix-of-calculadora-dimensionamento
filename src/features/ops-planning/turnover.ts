import { MonthPoint, PlannerInputs, TurnoverTiming } from "./types";

const getTurnoverPeriodMonths = (period: PlannerInputs["turnoverPeriod"]): number => {
  if (period === "mensal") return 1;
  if (period === "semestral") return 6;
  return 12;
};

const formatTurnoverPeriod = (period: PlannerInputs["turnoverPeriod"]): string => {
  if (period === "mensal") return "Mensal";
  if (period === "semestral") return "Semestral";
  return "Anual";
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
  distributionFactor: number;
  periodMonths: number;
}

export const buildTurnoverContext = (inputs: PlannerInputs, timeline: MonthPoint[]): TurnoverContext => {
  const activeTimelineKeys = timeline
    .map((p) => p.key)
    .filter((key) => inputs.turnoverMonths.includes(key));
  const unique = [...new Set(activeTimelineKeys)];

  return {
    activeTimelineKeySet: new Set(unique),
    activeCount: unique.length,
    distributionFactor: unique.length > 0 ? timeline.length / unique.length : 0,
    periodMonths: getTurnoverPeriodMonths(inputs.turnoverPeriod),
  };
};

export const resolveTurnoverForMonth = (
  inputs: PlannerInputs,
  ctx: TurnoverContext,
  monthKey: string,
  hcBase: number,
): number => {
  if (inputs.turnoverValue <= 0 || !ctx.activeTimelineKeySet.has(monthKey)) return 0;

  if (inputs.turnoverInputMode === "percentual") {
    const monthlyRate = (inputs.turnoverValue / 100) / ctx.periodMonths;
    return hcBase * monthlyRate * ctx.distributionFactor;
  }

  return ctx.activeCount > 0 ? inputs.turnoverValue / ctx.activeCount : 0;
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

  if (inputs.turnoverInputMode === "percentual") {
    return `${prefix} | Base: HC (${fmt(hcBase)}) | (${fmt(inputs.turnoverValue)}% ÷ ${ctx.periodMonths}) × ${fmt(hcBase)} × ${fmt(ctx.distributionFactor)} = ${fmt(turnover)}`;
  }

  if (ctx.activeCount === 0) return `${prefix} | sem meses ativos = 0`;
  if (!isActive) return `${prefix} | mês inativo = 0`;

  return `${prefix} | ${fmt(inputs.turnoverValue)} ÷ ${ctx.activeCount} = ${fmt(turnover)}`;
};
