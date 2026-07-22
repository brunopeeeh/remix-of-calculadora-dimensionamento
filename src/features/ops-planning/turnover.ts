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
  return timeline.map(m => m.key);
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
  /** HC de referência para o modo "hc_inicial". */
  hcInicial: number;
  baseMode: NonNullable<PlannerInputs["turnoverBaseMode"]>;
}

export const buildTurnoverContext = (inputs: PlannerInputs, timeline: MonthPoint[]): TurnoverContext => {
  const hcInicial = inputs.headcountCurrent;
  const baseMode = inputs.turnoverBaseMode ?? "hc_corrente";

  // If user has manually selected specific months, respect those
  if (inputs.turnoverMonths.length > 0) {
    const unique = [...new Set(inputs.turnoverMonths)];
    return {
      activeTimelineKeySet: new Set(unique),
      activeCount: unique.length,
      periodMonths: getTurnoverPeriodMonths(inputs.turnoverPeriod),
      hcInicial,
      baseMode,
    };
  }

  // Otherwise, fall back to automatic calculation based on period
  const autoTimelineKeys = getAutoTurnoverMonths(inputs.turnoverPeriod, timeline);
  const unique = [...new Set(autoTimelineKeys)];

  return {
    activeTimelineKeySet: new Set(unique),
    activeCount: unique.length,
    periodMonths: getTurnoverPeriodMonths(inputs.turnoverPeriod),
    hcInicial,
    baseMode,
  };
};

export const resolveTurnoverForMonth = (
  inputs: PlannerInputs,
  ctx: TurnoverContext,
  monthKey: string,
  hcBase: number,
): number => {
  if (inputs.turnoverValue <= 0 || !ctx.activeTimelineKeySet.has(monthKey) || ctx.activeCount === 0) return 0;

  // C4: quando o usuário seleciona meses manualmente, redistribuir turnoverValue
  // pelos meses ativos (activeCount), não pelo período fixo (periodMonths).
  // Isso garante que o total de turnover no período == turnoverValue informado.
  const denominator = inputs.turnoverMonths.length > 0 ? ctx.activeCount : ctx.periodMonths;
  const monthlyRate = inputs.turnoverValue / denominator;

  if (inputs.turnoverInputMode === "percentual") {
    // Problema 2: no modo "hc_inicial" o percentual incide sobre o HC de hoje
    // (fixo), então o total de saídas bate com "taxa x HC inicial". No modo
    // "hc_corrente" incide sobre o HC do mês (cresce com o time).
    const base = ctx.baseMode === "hc_inicial" ? ctx.hcInicial : hcBase;
    return base * (monthlyRate / 100);
  }

  return monthlyRate;
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

  // C4: mesmo denominador corrigido para o texto da fórmula
  const denominator = inputs.turnoverMonths.length > 0 ? ctx.activeCount : ctx.periodMonths;
  const monthlyRate = inputs.turnoverValue / denominator;

  if (inputs.turnoverInputMode === "percentual") {
    const base = ctx.baseMode === "hc_inicial" ? ctx.hcInicial : hcBase;
    const baseLabel = ctx.baseMode === "hc_inicial" ? "HC inicial" : "HC do mês";
    return `${prefix} | Base: ${baseLabel} (${fmt(base)}) | ${fmt(monthlyRate)}% mensal = ${fmt(turnover)}`;
  }

  return `${prefix} | ${fmt(monthlyRate)} abs/mês = ${fmt(turnover)}`;
};

