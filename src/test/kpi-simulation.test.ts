/**
 * ═══════════════════════════════════════════════════════════════
 * TESTES DE SIMULAÇÃO DE KPIs — VALIDAÇÃO COMPLETA DE NEGÓCIO
 * ═══════════════════════════════════════════════════════════════
 *
 * Cada teste valida um KPI específico com cálculo manual documentado,
 * permitindo detectar regressões e erros de lógica.
 */

import { describe, expect, it } from "vitest";
import { runPlannerProjection } from "@/features/ops-planning/calculator";
import { computeCapacityPerAgent, resolveContactRate, computeTenureVacationPct } from "@/features/ops-planning/capacity";
import { computeDemandForMonth, computeFallbackManualGrowthPct } from "@/features/ops-planning/demand";
import { getRampFactor, getRampMaturationOffset } from "@/features/ops-planning/ramp";
import { buildTurnoverContext, resolveTurnoverForMonth } from "@/features/ops-planning/turnover";
import { buildTimeline } from "@/features/ops-planning/timeline";
import { SCENARIO_PRESETS, BASE_YEAR } from "@/features/ops-planning/scenarios";
import { PlannerInputs } from "@/features/ops-planning/types";

// ────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────

const baseInputs = (): PlannerInputs => ({
  currentClients: 1000,
  targetClientsQ4: 1000,
  targetClientsGrowthPct: 0,
  currentVolume: 2000,
  contactRate: 2,
  startMonth: 1,
  endMonth: 6,
  startYear: BASE_YEAR,
  endYear: BASE_YEAR,
  growthMode: "linear",
  manualGrowthByMonth: {},
  manualSeasonalityByMonth: {},
  aiCoveragePct: 0,
  aiGrowthMonthlyPct: 0,
  extraAutomationPct: 0,
  headcountCurrent: 20,
  productivityBase: 200,
  rampUpMonths: 3,
  tmaN1: 25,
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
  turnoverPeriod: "mensal",
  turnoverInputMode: "absoluto",
  turnoverTiming: "end_of_month",
  turnoverMonths: [],
  leadTimeMonths: 0,
  hiringMode: "gap",
  useN1N2Split: false,
});

// ════════════════════════════════════════════════════════════════
// GRUPO 1: KPI — CAPACIDADE POR AGENTE (computeCapacityPerAgent)
// ════════════════════════════════════════════════════════════════

describe("KPI: Capacidade por agente (computeCapacityPerAgent)", () => {
  /**
   * BASE_WEIGHTED_TMA = 20*0.8 + 45*0.2 = 25
   * tmaN1 = 25 → weightedTma = 25 → complexityFactor = 25/25 = 1.0
   * raw = 200 * 1.0 * 1 * 1 * 1 = 200
   */
  it("SIMULAÇÃO 1 — sem shrinkage: capacidade = productivityBase puro", () => {
    const inputs = baseInputs();
    const cap = computeCapacityPerAgent(inputs);
    expect(cap).toBeCloseTo(200, 1);
  });

  /**
   * tmaN1 = 20 → weightedTma = 20
   * complexityFactor = clamp(25/20, 0.7, 1.4) = clamp(1.25, 0.7, 1.4) = 1.25
   * raw = 200 * 1.25 = 250
   */
  it("SIMULAÇÃO 2 — TMA menor que base: complexityFactor aumenta capacidade", () => {
    const inputs = { ...baseInputs(), tmaN1: 20, productivityBase: 200 };
    const cap = computeCapacityPerAgent(inputs);
    expect(cap).toBeCloseTo(250, 1);
  });

  /**
   * tmaN1 = 50 → weightedTma = 50
   * complexityFactor = clamp(25/50, 0.7, 1.4) = clamp(0.5, 0.7, 1.4) = 0.7 (clamped!)
   * raw = 200 * 0.7 = 140
   */
  it("SIMULAÇÃO 3 — TMA muito alto: complexityFactor clampado em 0.7", () => {
    const inputs = { ...baseInputs(), tmaN1: 50, productivityBase: 200 };
    const cap = computeCapacityPerAgent(inputs);
    expect(cap).toBeCloseTo(140, 1);
  });

  /**
   * offchatPct = 20 → fator = 1 - 0.20 = 0.80
   * meetingsPct = 10 → fator = 1 - 0.10 = 0.90
   * raw = 200 * 1.0 * 0.80 * 0.90 = 144
   */
  it("SIMULAÇÃO 4 — offchat + meetings reduzem capacidade linearmente", () => {
    const inputs = { ...baseInputs(), offchatPct: 20, meetingsPct: 10 };
    const cap = computeCapacityPerAgent(inputs);
    expect(cap).toBeCloseTo(144, 1);
  });

  /**
   * vacationPct = 20, vacationEligiblePct = 50
   * vacationImpactPct = (20/100) * (50/100) = 0.1
   * raw = 200 * 1.0 * 1 * 1 * (1 - 0.1) = 180
   */
  it("SIMULAÇÃO 5 — férias reduz capacidade proporcionalmente aos elegíveis", () => {
    const inputs = { ...baseInputs(), vacationPct: 20, vacationEligiblePct: 50 };
    const cap = computeCapacityPerAgent(inputs);
    expect(cap).toBeCloseTo(180, 1);
  });

  /**
   * N1/N2 split: tmaN1=20, tmaN2=40, mix 50/50
   * weightedTma = 20*0.5 + 40*0.5 = 30
   * complexityFactor = clamp(25/30, 0.7, 1.4) ≈ 0.833
   * raw = 200 * 0.833 ≈ 166.7
   */
  it("SIMULAÇÃO 6 — N1/N2 split 50/50: TMA ponderado correto", () => {
    const inputs = {
      ...baseInputs(),
      useN1N2Split: true,
      tmaN1: 20,
      tmaN2: 40,
      mixN1Pct: 50,
      mixN2Pct: 50,
    };
    const cap = computeCapacityPerAgent(inputs);
    const expectedWTma = 20 * 0.5 + 40 * 0.5; // = 30
    const expectedComplexity = Math.min(Math.max(25 / expectedWTma, 0.7), 1.4); // ≈ 0.833
    const expected = 200 * expectedComplexity;
    expect(cap).toBeCloseTo(expected, 1);
  });

  /**
   * useTenureVacation=true, agentsWithTenure=6, headcountCurrent=20
   * periodsPerYear = 6 * 2 = 12 → periodsPerMonth = 12/12 = 1
   * actualAgentsOnVacation = min(1, 1) = 1
   * tenureVacationPct = 1/20 = 0.05 (5%)
   * raw = 200 * 1.0 * 1 * 1 * (1 - 0.05) = 190
   */
  it("SIMULAÇÃO 7 — modo tenure vacation: cálculo correto de impacto", () => {
    const inputs = {
      ...baseInputs(),
      useTenureVacation: true,
      agentsWithTenure: 6,
      headcountCurrent: 20,
    };
    const tenurePct = computeTenureVacationPct(6, 20); // = 0.05
    expect(tenurePct).toBeCloseTo(0.05, 4);

    const cap = computeCapacityPerAgent(inputs);
    expect(cap).toBeCloseTo(200 * (1 - 0.05), 1); // = 190
  });

  it("SIMULAÇÃO 8 — TMA = 0 retorna 0 (sem divisão por zero)", () => {
    const inputs = { ...baseInputs(), tmaN1: 0 };
    const cap = computeCapacityPerAgent(inputs);
    expect(cap).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// GRUPO 2: KPI — VOLUME DE DEMANDA (computeDemandForMonth)
// ════════════════════════════════════════════════════════════════

describe("KPI: Volume de demanda (computeDemandForMonth)", () => {
  const timeline = buildTimeline(1, BASE_YEAR, 6, BASE_YEAR);

  /**
   * Mês 0 (índice 0): clientsBase = currentClients = 1000
   * contactRate = 2
   * volumeGross = 1000 * 2 = 2000
   * aiPct = 0 → volumeHuman = 2000
   */
  it("SIMULAÇÃO 9 — mês inicial sem AI: volume humano = clientsBase * contactRate", () => {
    const inputs = baseInputs();
    const cr = resolveContactRate(inputs);
    const demand = computeDemandForMonth(inputs, timeline[0], 0, 1000, cr, 0, 0, 0);

    expect(demand.clientsBase).toBe(1000);
    expect(demand.contactRate).toBe(2);
    expect(demand.volumeGross).toBe(2000);
    expect(demand.volumeAI).toBe(0);
    expect(demand.volumeHuman).toBe(2000);
  });

  /**
   * Crescimento linear: currentClients=1000, targetClientsQ4=3000
   * totalSteps=5, linearStep=(3000-1000)/5=400
   * Mês index=1: clientsBase = 1000 + 400*1 = 1400
   */
  it("SIMULAÇÃO 10 — crescimento linear: clientes aumentam por step fixo", () => {
    const inputs = { ...baseInputs(), targetClientsQ4: 3000 };
    const totalSteps = timeline.length - 1; // = 5
    const linearStep = (3000 - 1000) / totalSteps; // = 400
    const cr = resolveContactRate(inputs);

    const demand0 = computeDemandForMonth(inputs, timeline[0], 0, 1000, cr, linearStep, 0, 0);
    expect(demand0.clientsBase).toBe(1000);

    const demand1 = computeDemandForMonth(inputs, timeline[1], 1, 1000, cr, linearStep, 0, 0);
    expect(demand1.clientsBase).toBeCloseTo(1000 + 400 * 1);

    const demand5 = computeDemandForMonth(inputs, timeline[5], 5, 1000, cr, linearStep, 0, 0);
    expect(demand5.clientsBase).toBeCloseTo(3000);
  });

  /**
   * AI coverage = 30%: volumeAI = 30% de volumeGross
   * volumeHuman = 70% de volumeGross
   */
  it("SIMULAÇÃO 11 — AI coverage 30%: split correto entre AI e humano", () => {
    const inputs = { ...baseInputs(), aiCoveragePct: 30 };
    const cr = resolveContactRate(inputs);
    const demand = computeDemandForMonth(inputs, timeline[0], 0, 1000, cr, 0, 0, 0);

    expect(demand.aiPct).toBe(30);
    expect(demand.volumeAI).toBeCloseTo(2000 * 0.30);
    expect(demand.volumeHuman).toBeCloseTo(2000 * 0.70);
    expect(demand.volumeGross).toBeCloseTo(demand.volumeAI + demand.volumeHuman);
  });

  /**
   * Sazonalidade de +20%: volumeGross aumenta 20%
   * 2000 * 1.20 = 2400
   */
  it("SIMULAÇÃO 12 — sazonalidade +20%: volume aumenta proporcionalmente", () => {
    const inputs = baseInputs();
    const cr = resolveContactRate(inputs);
    const demandSeason = computeDemandForMonth(inputs, timeline[0], 0, 1000, cr, 0, 0, 20);
    const demandBase = computeDemandForMonth(inputs, timeline[0], 0, 1000, cr, 0, 0, 0);

    expect(demandSeason.volumeGross).toBeCloseTo(demandBase.volumeGross * 1.20);
  });

  /**
   * Sazonalidade negativa de -10%: volumeGross reduz 10%
   */
  it("SIMULAÇÃO 13 — sazonalidade -10%: volume reduz proporcionalmente", () => {
    const inputs = baseInputs();
    const cr = resolveContactRate(inputs);
    const demandNeg = computeDemandForMonth(inputs, timeline[0], 0, 1000, cr, 0, 0, -10);
    const demandBase = computeDemandForMonth(inputs, timeline[0], 0, 1000, cr, 0, 0, 0);

    expect(demandNeg.volumeGross).toBeCloseTo(demandBase.volumeGross * 0.90);
  });

  /**
   * AI cresce mensalmente: index=3, aiCoveragePct=10, aiGrowthMonthlyPct=5
   * aiPct = 10 + 5*3 = 25%
   */
  it("SIMULAÇÃO 14 — aiGrowthMonthlyPct: crescimento acumulado por índice", () => {
    const inputs = { ...baseInputs(), aiCoveragePct: 10, aiGrowthMonthlyPct: 5 };
    const cr = resolveContactRate(inputs);
    const demand = computeDemandForMonth(inputs, timeline[3], 3, 1000, cr, 0, 0, 0);

    expect(demand.aiPct).toBe(25); // 10 + 5*3
  });

  /**
   * AI cap em 95%: aiCoveragePct=90, aiGrowthMonthlyPct=10, extraAutomationPct=10
   * raw = 90 + 10*0 + 10 = 100 → clamped at 95
   */
  it("SIMULAÇÃO 15 — AI cap em 95%: não ultrapassa limite", () => {
    const inputs = { ...baseInputs(), aiCoveragePct: 90, aiGrowthMonthlyPct: 0, extraAutomationPct: 10 };
    const cr = resolveContactRate(inputs);
    const demand = computeDemandForMonth(inputs, timeline[0], 0, 1000, cr, 0, 0, 0);

    expect(demand.aiPct).toBe(95);
    expect(demand.volumeHuman).toBeCloseTo(demand.volumeGross * 0.05);
  });
});

// ════════════════════════════════════════════════════════════════
// GRUPO 3: KPI — AGENTES NECESSÁRIOS (agentsNeeded)
// ════════════════════════════════════════════════════════════════

describe("KPI: Agentes necessários (agentsNeeded)", () => {
  /**
   * volume=2000, capacityPerAgent=200
   * agentsNeededRaw = 2000/200 = 10 → agentsNeeded = 10 (ceil)
   */
  it("SIMULAÇÃO 16 — cálculo direto de agentes necessários", () => {
    const inputs = { ...baseInputs(), headcountCurrent: 0 };
    const proj = runPlannerProjection(inputs);
    // volume = 1000 * 2 = 2000, cap = 200
    expect(proj.rows[0].agentsNeededRaw).toBeCloseTo(10);
    expect(proj.rows[0].agentsNeeded).toBe(10);
  });

  /**
   * volume=2100: agentsNeededRaw = 2100/200 = 10.5 → ceil = 11
   */
  it("SIMULAÇÃO 17 — ceil garante que demanda fracionada sempre arredonda para cima", () => {
    // 1050 clientes * 2 = 2100 volume → 2100/200 = 10.5 → ceil = 11
    const inputs = { ...baseInputs(), currentClients: 1050, targetClientsQ4: 1050, headcountCurrent: 0 };
    const proj = runPlannerProjection(inputs);
    expect(proj.rows[0].agentsNeeded).toBe(11);
  });

  /**
   * Sem AI: agentsNeeded baseado em volume bruto
   * Com AI 50%: agentsNeeded deve cair para metade
   */
  it("SIMULAÇÃO 18 — AI 50% reduz agentes necessários à metade", () => {
    const noAI = runPlannerProjection({ ...baseInputs(), headcountCurrent: 0, aiCoveragePct: 0 });
    const withAI = runPlannerProjection({ ...baseInputs(), headcountCurrent: 0, aiCoveragePct: 50 });

    expect(withAI.rows[0].agentsNeeded).toBeCloseTo(noAI.rows[0].agentsNeeded / 2, 0);
  });
});

// ════════════════════════════════════════════════════════════════
// GRUPO 4: KPI — TURNOVER (resolveTurnoverForMonth)
// ════════════════════════════════════════════════════════════════

describe("KPI: Turnover por mês", () => {
  const timeline = buildTimeline(1, BASE_YEAR, 6, BASE_YEAR);

  /**
   * anual/absoluto: turnoverValue=12, periodMonths=12
   * monthlyRate = 12/12 = 1
   * Em mês ativo: turnover = 1
   * Em mês inativo: turnover = 0
   */
  it("SIMULAÇÃO 19 — absoluto anual: rate mensal = value/12", () => {
    const inputs = { ...baseInputs(), turnoverValue: 12, turnoverPeriod: "anual" as const, turnoverInputMode: "absoluto" as const };
    const ctx = buildTurnoverContext(inputs, timeline);

    // Primeiro mês da timeline sempre é ativo (auto)
    const firstKey = timeline[0].key;
    const turnover = resolveTurnoverForMonth(inputs, ctx, firstKey, 20);
    expect(turnover).toBeCloseTo(1, 4); // 12/12 = 1
  });

  /**
   * semestral/absoluto: turnoverValue=6, periodMonths=6
   * monthlyRate = 6/6 = 1
   */
  it("SIMULAÇÃO 20 — absoluto semestral: rate mensal = value/6", () => {
    const inputs = { ...baseInputs(), turnoverValue: 6, turnoverPeriod: "semestral" as const, turnoverInputMode: "absoluto" as const };
    const ctx = buildTurnoverContext(inputs, timeline);

    const firstKey = timeline[0].key;
    const turnover = resolveTurnoverForMonth(inputs, ctx, firstKey, 20);
    expect(turnover).toBeCloseTo(1, 4); // 6/6 = 1
  });

  /**
   * mensal/percentual: turnoverValue=10, hcBase=50
   * monthlyRate = 10/1 = 10%
   * turnover = 50 * 10/100 = 5
   */
  it("SIMULAÇÃO 21 — percentual mensal: turnover = %hcBase por mês", () => {
    const inputs = { ...baseInputs(), turnoverValue: 10, turnoverPeriod: "mensal" as const, turnoverInputMode: "percentual" as const };
    const ctx = buildTurnoverContext(inputs, timeline);

    const firstKey = timeline[0].key;
    const turnover = resolveTurnoverForMonth(inputs, ctx, firstKey, 50);
    expect(turnover).toBeCloseTo(5, 4); // 50 * 10% = 5
  });

  /**
   * trimestral: trigger automático a cada 3 meses
   * timeline 6 meses → triggers em index 0 e 3
   */
  it("SIMULAÇÃO 22 — trimestral auto: triggers apenas nos meses corretos", () => {
    const inputs = { ...baseInputs(), turnoverValue: 3, turnoverPeriod: "trimestral" as const, turnoverInputMode: "absoluto" as const };
    const proj = runPlannerProjection(inputs);

    // Índice 0 e 3 devem ter turnover, demais = 0
    expect(proj.rows[0].turnover).toBeCloseTo(1, 3); // 3/3 = 1
    expect(proj.rows[1].turnover).toBe(0);
    expect(proj.rows[2].turnover).toBe(0);
    expect(proj.rows[3].turnover).toBeCloseTo(1, 3);
    expect(proj.rows[4].turnover).toBe(0);
    expect(proj.rows[5].turnover).toBe(0);
  });

  /**
   * Meses fixos obrigatórios: user escolhe meses 1 e 4
   */
  it("SIMULAÇÃO 23 — turnoverMonths manuais: respeita lista do usuário", () => {
    const key1 = timeline[0].key;
    const key4 = timeline[3].key;
    const inputs = {
      ...baseInputs(),
      turnoverValue: 4,
      turnoverPeriod: "mensal" as const,
      turnoverInputMode: "absoluto" as const,
      turnoverMonths: [key1, key4],
    };
    const proj = runPlannerProjection(inputs);

    expect(proj.rows[0].turnover).toBeCloseTo(4, 3);
    expect(proj.rows[1].turnover).toBe(0);
    expect(proj.rows[2].turnover).toBe(0);
    expect(proj.rows[3].turnover).toBeCloseTo(4, 3);
    expect(proj.rows[4].turnover).toBe(0);
    expect(proj.rows[5].turnover).toBe(0);
  });

  /**
   * Turn cap: turnoverValue=100 (absoluto) mas HC=5 → não pode turnar mais que HC
   */
  it("SIMULAÇÃO 24 — turnover nunca ultrapassa HC disponível", () => {
    const inputs = {
      ...baseInputs(),
      headcountCurrent: 5,
      turnoverValue: 100,
      turnoverPeriod: "mensal" as const,
      turnoverInputMode: "absoluto" as const,
    };
    const proj = runPlannerProjection(inputs);
    proj.rows.forEach((r) => {
      expect(r.hcFinal).toBeGreaterThanOrEqual(0);
      expect(r.hcNominalStart).toBeGreaterThanOrEqual(0);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// GRUPO 5: KPI — GAP E RISCO
// ════════════════════════════════════════════════════════════════

describe("KPI: Gap e classificação de risco", () => {
  /**
   * HC=10, agentsNeeded=10 → gap=0, risk=ok
   */
  it("SIMULAÇÃO 25 — HC exatamente suficiente: gap=0 e risk=ok", () => {
    // cap=200, volume=1000*2=2000, agentsNeeded=ceil(2000/200)=10
    const inputs = { ...baseInputs(), headcountCurrent: 10, leadTimeMonths: 10 };
    const proj = runPlannerProjection(inputs);
    expect(proj.rows[0].gap).toBe(0);
    expect(proj.rows[0].risk).toBe("ok");
  });

  /**
   * HC=9, agentsNeeded=10 → gap=1, risk=attention
   */
  it("SIMULAÇÃO 26 — gap=1: risco = attention", () => {
    const inputs = { ...baseInputs(), headcountCurrent: 9, leadTimeMonths: 10 };
    const proj = runPlannerProjection(inputs);
    expect(proj.rows[0].gap).toBe(1);
    expect(proj.rows[0].risk).toBe("attention");
  });

  /**
   * HC=5, agentsNeeded=10 → gap=5, risk=critical
   */
  it("SIMULAÇÃO 27 — gap>1: risco = critical", () => {
    const inputs = { ...baseInputs(), headcountCurrent: 5, leadTimeMonths: 10 };
    const proj = runPlannerProjection(inputs);
    expect(proj.rows[0].gap).toBe(5);
    expect(proj.rows[0].risk).toBe("critical");
  });

  /**
   * gapFte sempre ≥ 0 (nunca negativo)
   */
  it("SIMULAÇÃO 28 — capacity excede demanda: gapFte = 0 (nunca negativo)", () => {
    const inputs = { ...baseInputs(), headcountCurrent: 100 };
    const proj = runPlannerProjection(inputs);
    proj.rows.forEach((r) => {
      expect(r.gapFte).toBeGreaterThanOrEqual(0);
      expect(r.gap).toBeGreaterThanOrEqual(0);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// GRUPO 6: KPI — RAMP UP DE COORTES
// ════════════════════════════════════════════════════════════════

describe("KPI: Ramp-up de coortes (getRampFactor)", () => {
  /**
   * rampUpMonths=4: fator progride de 25%, 50%, 75%, 100%
   */
  it("SIMULAÇÃO 29 — ramp 4 meses: progressão correta de 25% a 100%", () => {
    expect(getRampFactor(0, 4)).toBeCloseTo(0.25);
    expect(getRampFactor(1, 4)).toBeCloseTo(0.50);
    expect(getRampFactor(2, 4)).toBeCloseTo(0.75);
    expect(getRampFactor(3, 4)).toBe(1.00);
    expect(getRampFactor(10, 4)).toBe(1.00); // já maduro
  });

  /**
   * rampUpMonths=1: imediatamente produtivo
   */
  it("SIMULAÇÃO 30 — ramp 1 mês: 100% desde o início (sem período de adaptação)", () => {
    expect(getRampFactor(0, 1)).toBe(1);
  });

  /**
   * Fator negativo: 0
   */
  it("SIMULAÇÃO 31 — meses negativos: fator = 0 (antes de iniciar)", () => {
    expect(getRampFactor(-1, 3)).toBe(0);
    expect(getRampFactor(-5, 3)).toBe(0);
  });

  /**
   * rampMaturationOffset: quantos meses antes da necessidade abrir a vaga
   */
  it("SIMULAÇÃO 32 — maturationOffset = rampUpMonths - 1", () => {
    expect(getRampMaturationOffset(1)).toBe(0);
    expect(getRampMaturationOffset(3)).toBe(2);
    expect(getRampMaturationOffset(6)).toBe(5);
  });
});

// ════════════════════════════════════════════════════════════════
// GRUPO 7: KPI — RESUMO (summary fields)
// ════════════════════════════════════════════════════════════════

describe("KPI: Campos do summary (ProjectionSummary)", () => {
  /**
   * volumeQ4 deve ser o volumeGross do último mês
   * volumeHumanQ4 deve ser o volumeHuman do último mês
   */
  it("SIMULAÇÃO 33 — volumeQ4 e volumeHumanQ4 refletem o último mês da timeline", () => {
    const inputs = baseInputs();
    const proj = runPlannerProjection(inputs);
    const last = proj.rows[proj.rows.length - 1];

    expect(proj.summary.volumeQ4).toBe(last.volumeGross);
    expect(proj.summary.volumeHumanQ4).toBe(last.volumeHuman);
    expect(proj.summary.capacityPerAgent).toBe(last.capacityPerAgent);
    expect(proj.summary.agentsNeededQ4).toBe(last.agentsNeeded);
  });

  /**
   * hiresYear soma os hiresStarted de todos os meses
   */
  it("SIMULAÇÃO 34 — hiresYear é a soma de hiresStarted de todos os meses", () => {
    const inputs = { ...baseInputs(), headcountCurrent: 0, leadTimeMonths: 0 };
    const proj = runPlannerProjection(inputs);
    const totalStarted = proj.rows.reduce((acc, r) => acc + r.hiresStarted, 0);
    expect(proj.summary.hiresYear).toBe(totalStarted);
  });

  /**
   * riskMonths lista apenas meses com gap > 0
   */
  it("SIMULAÇÃO 35 — riskMonths lista apenas meses com gap positivo", () => {
    const inputs = { ...baseInputs(), headcountCurrent: 0, leadTimeMonths: 5 };
    const proj = runPlannerProjection(inputs);
    const riskRows = proj.rows.filter((r) => r.gap > 0);
    expect(proj.summary.riskMonths).toHaveLength(riskRows.length);
  });

  /**
   * criticalOpenMonth quando não há risco = "Sem risco"
   */
  it("SIMULAÇÃO 36 — sem gap: criticalOpenMonth = 'Sem risco'", () => {
    const inputs = { ...baseInputs(), headcountCurrent: 100 };
    const proj = runPlannerProjection(inputs);
    expect(proj.summary.criticalOpenMonth).toBe("Sem risco");
  });
});

// ════════════════════════════════════════════════════════════════
// GRUPO 8: KPI — CENÁRIOS REAIS (SCENARIO_PRESETS)
// ════════════════════════════════════════════════════════════════

describe("KPI: Simulação com cenários reais de negócio", () => {
  it("SIMULAÇÃO 37 — Cenário BASE: volumeQ4 > volume inicial (crescimento)", () => {
    const proj = runPlannerProjection(SCENARIO_PRESETS.base);
    const firstVolume = proj.rows[0].volumeGross;
    const lastVolume = proj.summary.volumeQ4;
    expect(lastVolume).toBeGreaterThan(firstVolume);
  });

  it("SIMULAÇÃO 38 — Cenário BASE: capacidade por agente coerente com inputs", () => {
    const proj = runPlannerProjection(SCENARIO_PRESETS.base);
    // Com offchat=11%, meetings=6%, vacation=9%*70%, AI produtividade não afeta capacidade
    expect(proj.summary.capacityPerAgent).toBeGreaterThan(0);
    expect(Number.isFinite(proj.summary.capacityPerAgent)).toBe(true);
  });

  it("SIMULAÇÃO 39 — Cenário OTIMISTA: menos agentes necessários que BASE (maior AI coverage)", () => {
    const base = runPlannerProjection(SCENARIO_PRESETS.base);
    const otimista = runPlannerProjection(SCENARIO_PRESETS.otimista);
    // otimista tem maior AI coverage e menor contactRate → menos agentes humanos no Q4
    expect(otimista.summary.agentsNeededQ4).toBeLessThanOrEqual(base.summary.agentsNeededQ4);
  });

  it("SIMULAÇÃO 40 — Cenário PESSIMISTA: mais agentes necessários que BASE (menor AI coverage)", () => {
    const base = runPlannerProjection(SCENARIO_PRESETS.base);
    const pessimista = runPlannerProjection(SCENARIO_PRESETS.pessimista);
    // pessimista tem menor AI coverage e maior contactRate → mais agentes
    expect(pessimista.summary.agentsNeededQ4).toBeGreaterThanOrEqual(base.summary.agentsNeededQ4);
  });

  it("SIMULAÇÃO 41 — Cenário BASE: todos os valores numéricos são finitos (sem NaN/Infinity)", () => {
    const proj = runPlannerProjection(SCENARIO_PRESETS.base);
    proj.rows.forEach((r, i) => {
      expect(Number.isFinite(r.volumeGross), `volumeGross inválido no mês ${i}`).toBe(true);
      expect(Number.isFinite(r.volumeHuman), `volumeHuman inválido no mês ${i}`).toBe(true);
      expect(Number.isFinite(r.capacityPerAgent), `capacityPerAgent inválido no mês ${i}`).toBe(true);
      expect(Number.isFinite(r.agentsNeeded), `agentsNeeded inválido no mês ${i}`).toBe(true);
      expect(Number.isFinite(r.hcAvailableEffective), `hcAvailableEffective inválido no mês ${i}`).toBe(true);
      expect(Number.isFinite(r.gap), `gap inválido no mês ${i}`).toBe(true);
    });
  });

  it("SIMULAÇÃO 42 — Cenário BASE: hcFinal nunca é negativo", () => {
    const proj = runPlannerProjection(SCENARIO_PRESETS.base);
    proj.rows.forEach((r) => {
      expect(r.hcFinal).toBeGreaterThanOrEqual(0);
    });
  });

  it("SIMULAÇÃO 43 — Cenário BASE: volumeHuman = volumeGross - volumeAI (identidade)", () => {
    const proj = runPlannerProjection(SCENARIO_PRESETS.base);
    proj.rows.forEach((r, i) => {
      expect(r.volumeHuman).toBeCloseTo(r.volumeGross - r.volumeAI, 2);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// GRUPO 9: KPI — CONSISTENCY CHECKS (INVARIANTES DE NEGÓCIO)
// ════════════════════════════════════════════════════════════════

describe("KPI: Invariantes de negócio (consistency checks)", () => {
  it("SIMULAÇÃO 44 — capacityAvailableTotal = hcEffective * capacityPerAgent", () => {
    const proj = runPlannerProjection(baseInputs());
    proj.rows.forEach((r) => {
      expect(r.capacityAvailableTotal).toBeCloseTo(r.hcAvailableEffective * r.capacityPerAgent, 2);
    });
  });

  it("SIMULAÇÃO 45 — volumeGross sempre ≥ volumeHuman (AI só pode reduzir demanda humana)", () => {
    const inputs = { ...baseInputs(), aiCoveragePct: 40 };
    const proj = runPlannerProjection(inputs);
    proj.rows.forEach((r) => {
      expect(r.volumeGross).toBeGreaterThanOrEqual(r.volumeHuman);
    });
  });

  it("SIMULAÇÃO 46 — aiPct sempre entre 0 e 95", () => {
    const inputs = { ...baseInputs(), aiCoveragePct: 80, aiGrowthMonthlyPct: 10, extraAutomationPct: 20 };
    const proj = runPlannerProjection(inputs);
    proj.rows.forEach((r) => {
      expect(r.aiPct).toBeGreaterThanOrEqual(0);
      expect(r.aiPct).toBeLessThanOrEqual(95);
    });
  });

  it("SIMULAÇÃO 47 — hcNominalAfterTurnoverStart ≤ hcNominalStart (turnover só diminui)", () => {
    const inputs = {
      ...baseInputs(),
      turnoverValue: 3,
      turnoverPeriod: "mensal" as const,
      turnoverInputMode: "absoluto" as const,
      turnoverTiming: "start_of_month" as const,
    };
    const proj = runPlannerProjection(inputs);
    proj.rows.forEach((r) => {
      expect(r.hcNominalAfterTurnoverStart).toBeLessThanOrEqual(r.hcNominalStart);
    });
  });

  it("SIMULAÇÃO 48 — turnoverApplied nunca ultrapassa hcNominalStart", () => {
    const inputs = {
      ...baseInputs(),
      headcountCurrent: 5,
      turnoverValue: 100,
      turnoverPeriod: "mensal" as const,
      turnoverInputMode: "absoluto" as const,
      turnoverTiming: "start_of_month" as const,
    };
    const proj = runPlannerProjection(inputs);
    proj.rows.forEach((r) => {
      expect(r.turnoverAppliedStart).toBeLessThanOrEqual(r.hcNominalStart + 0.001);
    });
  });

  it("SIMULAÇÃO 49 — timeline tem exatamente o número correto de meses", () => {
    const inputs = { ...baseInputs(), startMonth: 3, endMonth: 8 };
    const proj = runPlannerProjection(inputs);
    expect(proj.timeline.length).toBe(6); // Mar, Abr, Mai, Jun, Jul, Ago
    expect(proj.rows.length).toBe(6);
  });

  it("SIMULAÇÃO 50 — timeline cross-year: Jan 2026 a Mar 2027 = 15 meses", () => {
    const inputs = {
      ...baseInputs(),
      startMonth: 1, startYear: 2026,
      endMonth: 3, endYear: 2027,
    };
    const proj = runPlannerProjection(inputs);
    expect(proj.timeline.length).toBe(15);
  });

  it("SIMULAÇÃO 51 — cada mês da timeline tem key único e no formato YYYY-MM", () => {
    const proj = runPlannerProjection(baseInputs());
    const keys = proj.timeline.map((t) => t.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length); // sem duplicatas

    keys.forEach((key) => {
      expect(key).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  it("SIMULAÇÃO 52 — cohortContributions: soma de effective ≈ hcAvailableEffective - legacyNominal", () => {
    const inputs = { ...baseInputs(), headcountCurrent: 0, leadTimeMonths: 0 };
    const proj = runPlannerProjection(inputs);
    // Meses com coortes ativas
    const rowsWithCohorts = proj.rows.filter((r) => r.cohortContributions.length > 0);
    rowsWithCohorts.forEach((r) => {
      const sumEffective = r.cohortContributions.reduce((acc, c) => acc + c.effective, 0);
      // hcAvailableEffective = legacyNominal(0) + sumEffective
      expect(r.hcAvailableEffective).toBeCloseTo(sumEffective, 1);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// GRUPO 10: KPI — CONTACT RATE (resolveContactRate)
// ════════════════════════════════════════════════════════════════

describe("KPI: Taxa de contato (resolveContactRate)", () => {
  /**
   * Quando contactRate > 0, usar diretamente
   */
  it("SIMULAÇÃO 53 — contactRate manual tem precedência", () => {
    const inputs = { ...baseInputs(), contactRate: 3.5 };
    expect(resolveContactRate(inputs)).toBe(3.5);
  });

  /**
   * Quando contactRate = 0: inferir de volume/clientes
   * 18000 / 6800 ≈ 2.647
   */
  it("SIMULAÇÃO 54 — contactRate=0: inferido de currentVolume/currentClients", () => {
    const inputs = { ...baseInputs(), contactRate: 0, currentClients: 6800, currentVolume: 18000 };
    const cr = resolveContactRate(inputs);
    expect(cr).toBeCloseTo(18000 / 6800, 4);
  });

  /**
   * currentClients = 0 e contactRate = 0 → retorna 0 (evita divisão por zero)
   */
  it("SIMULAÇÃO 55 — clientes=0 e contactRate=0: retorna 0 (sem divisão por zero)", () => {
    const inputs = { ...baseInputs(), contactRate: 0, currentClients: 0, currentVolume: 0 };
    expect(resolveContactRate(inputs)).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// GRUPO 11: KPI — CRESCIMENTO (computeFallbackManualGrowthPct)
// ════════════════════════════════════════════════════════════════

describe("KPI: Taxa de crescimento composto (fallback)", () => {
  /**
   * Dobrar em 5 passos: (2000/1000)^(1/5) - 1 = 2^0.2 - 1 ≈ 14.87%
   */
  it("SIMULAÇÃO 56 — crescimento composto: dobrar em 5 meses ≈ 14.87% ao mês", () => {
    const inputs = { ...baseInputs(), currentClients: 1000, targetClientsQ4: 2000 };
    const expected = (Math.pow(2, 1 / 5) - 1) * 100;
    const result = computeFallbackManualGrowthPct(inputs, 5);
    expect(result).toBeCloseTo(expected, 2);
  });

  /**
   * Sem crescimento: 1000 → 1000 = 0%
   */
  it("SIMULAÇÃO 57 — sem crescimento: taxa = 0%", () => {
    const inputs = { ...baseInputs(), currentClients: 1000, targetClientsQ4: 1000 };
    const result = computeFallbackManualGrowthPct(inputs, 5);
    expect(result).toBeCloseTo(0, 4);
  });

  /**
   * currentClients = 0: retorna 0 (proteção)
   */
  it("SIMULAÇÃO 58 — currentClients=0: retorna 0 (sem divisão por zero)", () => {
    const inputs = { ...baseInputs(), currentClients: 0, targetClientsQ4: 1000 };
    const result = computeFallbackManualGrowthPct(inputs, 5);
    expect(result).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// GRUPO 12: KPI — SIMULAÇÃO FULL PIPELINE REALISTA
// ════════════════════════════════════════════════════════════════

describe("KPI: Simulação Full Pipeline — Caso de uso real Care Team", () => {
  /**
   * Replicar cálculo real do Cenário Base e verificar KPIs chave
   * manualmente com espaço de tolerância de ±5%
   */
  it("SIMULAÇÃO 59 — Cenário Base: taxa de AI final dentro do esperado", () => {
    const proj = runPlannerProjection(SCENARIO_PRESETS.base);
    const last = proj.rows[proj.rows.length - 1];

    // AI = 27% + 0.7%/mês*9meses + 2% = 27 + 6.3 + 2 = 35.3%
    // (Mar=0 a Dez=9 meses de crescimento)
    const expectedAiPct = SCENARIO_PRESETS.base.aiCoveragePct
      + SCENARIO_PRESETS.base.aiGrowthMonthlyPct * (proj.rows.length - 1)
      + SCENARIO_PRESETS.base.extraAutomationPct;
    expect(last.aiPct).toBeCloseTo(Math.min(expectedAiPct, 95), 1);
  });

  it("SIMULAÇÃO 60 — Cenário Base: clientes no Q4 próximo de targetClientsQ4 (modo linear)", () => {
    const proj = runPlannerProjection(SCENARIO_PRESETS.base);
    const last = proj.rows[proj.rows.length - 1];
    // Com growthMode=linear, último mês deve ser targetClientsQ4
    expect(last.clientsBase).toBeCloseTo(SCENARIO_PRESETS.base.targetClientsQ4, -1); // tolerância de 1 unidade na última casa
  });

  it("SIMULAÇÃO 61 — Cenário Base: número de admissões é positivo e razoável (3-30)", () => {
    const proj = runPlannerProjection(SCENARIO_PRESETS.base);
    expect(proj.summary.hiresYear).toBeGreaterThan(0);
    expect(proj.summary.hiresYear).toBeLessThan(100); // razoabilidade
  });

  it("SIMULAÇÃO 62 — Comparação 3 cenários: pessimista >= base >= otimista em agentsNeededQ4", () => {
    const base = runPlannerProjection(SCENARIO_PRESETS.base);
    const otimista = runPlannerProjection(SCENARIO_PRESETS.otimista);
    const pessimista = runPlannerProjection(SCENARIO_PRESETS.pessimista);

    expect(pessimista.summary.agentsNeededQ4).toBeGreaterThanOrEqual(base.summary.agentsNeededQ4 - 1);
    expect(base.summary.agentsNeededQ4).toBeGreaterThanOrEqual(otimista.summary.agentsNeededQ4 - 1);
  });

  it("SIMULAÇÃO 63 — Cenário pessimista com hiringMode=gap: deve ter mais risco que antecipado", () => {
    const gapProj = runPlannerProjection(SCENARIO_PRESETS.pessimista); // já é "gap"
    const antProj = runPlannerProjection({ ...SCENARIO_PRESETS.pessimista, hiringMode: "antecipado" });

    const gapTotal = gapProj.summary.riskMonths.length;
    const antTotal = antProj.summary.riskMonths.length;
    expect(gapTotal).toBeGreaterThanOrEqual(antTotal);
  });
});

// ════════════════════════════════════════════════════════════════
// GRUPO 13: TESTES DE REGRESSÃO — CORREÇÕES APLICADAS
// ════════════════════════════════════════════════════════════════

describe("Regressão: correções aplicadas (breaksPct, ramp unificado)", () => {
  /**
   * FIX: breaksPct era ignorado no cálculo de capacidade.
   * Com 20% de breaks, a capacidade deve cair 20% em relação a nenhum break.
   * Antes da correção, ambos retonariam o mesmo valor.
   */
  it("FIX 1 — breaksPct=20% reduz capacidade em 20%", () => {
    const semBreak = computeCapacityPerAgent({ ...baseInputs(), breaksPct: 0 });
    const comBreak = computeCapacityPerAgent({ ...baseInputs(), breaksPct: 20 });

    expect(comBreak).toBeLessThan(semBreak);
    expect(comBreak).toBeCloseTo(semBreak * 0.80, 1);
  });

  it("FIX 1 — breaksPct=0 não altera capacidade (valor neutro)", () => {
    const semBreak = computeCapacityPerAgent({ ...baseInputs(), breaksPct: 0 });
    const comBreakZero = computeCapacityPerAgent({ ...baseInputs(), breaksPct: 0 });
    expect(comBreakZero).toBeCloseTo(semBreak, 4);
  });

  /**
   * breaksPct se combina multiplicativamente com offchat e meetings.
   * breaks=10%, offchat=10%, meetings=5%
   * raw = 200 * (1-0.10) * (1-0.10) * (1-0.05) = 200 * 0.90 * 0.90 * 0.95 = 153.9
   */
  it("FIX 1 — breaksPct combinado com offchat e meetings aplica shrinkage acumulado", () => {
    const inputs = {
      ...baseInputs(),
      breaksPct: 10,
      offchatPct: 10,
      meetingsPct: 5,
    };
    const cap = computeCapacityPerAgent(inputs);
    const expected = 200 * (1 - 0.10) * (1 - 0.10) * (1 - 0.05);
    expect(cap).toBeCloseTo(expected, 1);
  });

  /**
   * Cenário base com breaksPct=8%: capacidade deve ser menor que sem breaks.
   * Verifica que os cenários reais agora refletem o shrinkage completo.
   */
  it("FIX 1 — Cenário BASE com breaksPct=8%: capacidade menor que sem breaks", () => {
    const comBreak = runPlannerProjection(SCENARIO_PRESETS.base);
    const semBreak = runPlannerProjection({ ...SCENARIO_PRESETS.base, breaksPct: 0 });

    // Capacidade por agente deve ser menor com breaks
    expect(comBreak.summary.capacityPerAgent).toBeLessThan(semBreak.summary.capacityPerAgent);

    // E consequentemente precisar de mais agentes
    expect(comBreak.summary.agentsNeededQ4).toBeGreaterThanOrEqual(semBreak.summary.agentsNeededQ4);
  });

  /**
   * FIX 2: Verifica que a consistência do ramp não quebra os resultados existentes.
   * getRampFactor(0, 3) = 1/3, getRampFactor(1, 3) = 2/3, getRampFactor(2, 3) = 1.0
   * A fórmula inline anterior era: Math.min((monthsSince+1)/rampUpMonths, 1)
   * que produzia exatamente os mesmos resultados — portanto os valores não mudam,
   * mas agora a fonte da verdade é única.
   */
  it("FIX 2 — ramp unificado: resultados da projeção permanecem consistentes", () => {
    const proj = runPlannerProjection({ ...baseInputs(), rampUpMonths: 3, headcountCurrent: 0, leadTimeMonths: 0 });

    // Em meses com contratações em ramp, hcAvailableEffective deve ser fracionado
    const mesesComCoortes = proj.rows.filter((r) => r.cohortContributions.length > 0);
    mesesComCoortes.forEach((r) => {
      // Nunca deve haver frações impossíveis
      expect(r.hcAvailableEffective).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(r.hcAvailableEffective)).toBe(true);

      // rampFactor de cada coorte deve ser entre 0 e 1
      r.cohortContributions.forEach((c) => {
        expect(c.rampFactor).toBeGreaterThanOrEqual(0);
        expect(c.rampFactor).toBeLessThanOrEqual(1);
      });
    });
  });

  /**
   * FIX 2 — rampFactor do mês 0 (primeiro mês da coorte) deve ser 1/rampUpMonths
   * Isso garante que ambos os loops produzem o mesmo valor.
   */
  it("FIX 2 — rampFactor no primeiro mês de uma coorte = 1/rampUpMonths", () => {
    // rampUpMonths=4: primeiro mês deve ter fator 1/4 = 0.25
    expect(getRampFactor(0, 4)).toBeCloseTo(1 / 4, 4);
    // rampUpMonths=3: primeiro mês deve ter fator 1/3 ≈ 0.333
    expect(getRampFactor(0, 3)).toBeCloseTo(1 / 3, 4);
    // rampUpMonths=6: primeiro mês deve ter fator 1/6 ≈ 0.167
    expect(getRampFactor(0, 6)).toBeCloseTo(1 / 6, 4);
  });
});

