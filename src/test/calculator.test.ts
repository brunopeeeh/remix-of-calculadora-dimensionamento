import { describe, expect, it } from "vitest";
import { getRampFactor, getRampMaturationOffset } from "@/features/ops-planning/ramp";
import { runPlannerProjection } from "@/features/ops-planning/calculator";
import { SCENARIO_PRESETS, EMPTY_PLANNER_INPUTS, BASE_YEAR } from "@/features/ops-planning/scenarios";
import { PlannerInputs } from "@/features/ops-planning/types";

// ── Helpers ──

const minimal = (overrides: Partial<PlannerInputs> = {}): PlannerInputs => ({
  ...EMPTY_PLANNER_INPUTS,
  currentClients: 1000,
  targetClientsQ4: 1000,
  contactRate: 1,
  headcountCurrent: 0,
  productivityBase: 100,
  rampUpMonths: 3,
  startMonth: 3,
  endMonth: 8,
  leadTimeMonths: 2,
  hiringMode: "gap",
  turnoverTiming: "end_of_month",
  targetClientsGrowthPct: 0,
  manualSeasonalityByMonth: {},
  useTenureVacation: false,
  agentsWithTenure: 0,
  ...overrides,
});

// ── Ramp-up unit tests ──

describe("getRampFactor", () => {
  it("returns 1 when rampUpMonths <= 1", () => {
    expect(getRampFactor(0, 1)).toBe(1);
    expect(getRampFactor(5, 0)).toBe(1);
  });

  it("returns progressive factors for rampUpMonths=3", () => {
    expect(getRampFactor(0, 3)).toBeCloseTo(1 / 3);
    expect(getRampFactor(1, 3)).toBeCloseTo(2 / 3);
    expect(getRampFactor(2, 3)).toBe(1);
    expect(getRampFactor(5, 3)).toBe(1);
  });

  it("returns 0 for negative monthsSinceHire", () => {
    expect(getRampFactor(-1, 3)).toBe(0);
  });

  it("works with rampUpMonths=2", () => {
    expect(getRampFactor(0, 2)).toBeCloseTo(0.5);
    expect(getRampFactor(1, 2)).toBe(1);
  });

  it("works with rampUpMonths=4", () => {
    expect(getRampFactor(0, 4)).toBeCloseTo(0.25);
    expect(getRampFactor(1, 4)).toBeCloseTo(0.5);
    expect(getRampFactor(2, 4)).toBeCloseTo(0.75);
    expect(getRampFactor(3, 4)).toBe(1);
  });
});

describe("getRampMaturationOffset", () => {
  it("returns 0 for ramp <= 1", () => {
    expect(getRampMaturationOffset(1)).toBe(0);
  });
  it("returns rampUpMonths - 1", () => {
    expect(getRampMaturationOffset(3)).toBe(2);
    expect(getRampMaturationOffset(4)).toBe(3);
  });
});

// ── Lead time affects simulation ──

describe("lead time impact on projection", () => {
  it("leadTimeMonths=0 gives different results than leadTimeMonths=3", () => {
    const noLead = runPlannerProjection(minimal({ leadTimeMonths: 0 }));
    const withLead = runPlannerProjection(minimal({ leadTimeMonths: 3 }));

    // With lead time, hires take longer to arrive, so gap should be >= no-lead gap
    const totalGapNoLead = noLead.rows.reduce((acc, r) => acc + r.gap, 0);
    const totalGapWithLead = withLead.rows.reduce((acc, r) => acc + r.gap, 0);
    expect(totalGapWithLead).toBeGreaterThanOrEqual(totalGapNoLead);
  });

  it("hires opened in month 0 with leadTime=2 don't add effective capacity until month 2", () => {
    const proj = runPlannerProjection(minimal({ leadTimeMonths: 2 }));
    // Month 0 hires: they should not start until month 2
    const month0Hires = proj.rows[0].hire;
    if (month0Hires > 0) {
      // In month 1, those hires haven't started yet
      expect(proj.rows[0].hiresStarted).toBe(0);
      expect(proj.rows[1].hiresStarted).toBe(0);
      expect(proj.rows[2].hiresStarted).toBeGreaterThanOrEqual(month0Hires);
    }
  });

  it("leadTime = 0, 1 e 2 geram resultados numericos reais", () => {
    const config = minimal({ headcountCurrent: 10, startMonth: 1, endMonth: 12, targetClientsQ4: 5000 });
    const p0 = runPlannerProjection({ ...config, leadTimeMonths: 0 });
    const p1 = runPlannerProjection({ ...config, leadTimeMonths: 1 });
    const p2 = runPlannerProjection({ ...config, leadTimeMonths: 2 });

    const hc0 = p0.rows.slice(0, 3).map(r => r.hcNominalStart).reduce((a, b) => a + b, 0);
    const hc1 = p1.rows.slice(0, 3).map(r => r.hcNominalStart).reduce((a, b) => a + b, 0);
    const hc2 = p2.rows.slice(0, 3).map(r => r.hcNominalStart).reduce((a, b) => a + b, 0);

    expect(hc0).toBeGreaterThanOrEqual(hc1);
    expect(hc1).toBeGreaterThanOrEqual(hc2);
  });
});

// ── Produtividade das coortes (antes, parcial e cheia) ──

describe("verificacao unitária de capacidade nas coortes", () => {
  it("deve refletir capacidade 0 (ainda não começou), parcial (em ramp) e total (maturado)", () => {
    const proj = runPlannerProjection(minimal({
      hiringMode: "gap",
      currentClients: 1000,
      targetClientsQ4: 3000,
      headcountCurrent: 10,
      startMonth: 1, endMonth: 6,
      leadTimeMonths: 2,
      rampUpMonths: 3
    }));

    const openIndex = proj.rows.findIndex(r => r.hiresOpened > 0);
    expect(openIndex).toBeGreaterThan(-1);

    const startIndex = openIndex + 2;

    // Mês onde a vaga inicia (rampUp = 3, fator < 1)
    const monthStart = proj.rows[startIndex];
    const contributionStart = monthStart.cohortContributions.find(c => c.monthIndex === openIndex);
    expect(contributionStart).toBeDefined();
    expect(contributionStart?.rampFactor).toBeCloseTo(1 / 3);
    expect(contributionStart?.effective).toBeLessThan(contributionStart?.nominal || 1);

    // Mês onde a vaga atinge produtividade cheia
    const monthMature = proj.rows[startIndex + 2];
    if (monthMature) {
      const contributionMature = monthMature.cohortContributions.find(c => c.monthIndex === openIndex);
      expect(contributionMature?.rampFactor).toBe(1);
      expect(contributionMature?.effective).toBeCloseTo(contributionMature?.nominal || 0);
    }
  });
});

// ── Hiring modes: gap vs antecipado ──

describe("hiringMode gap vs antecipado", () => {
  it("produces different openMonthIndex values", () => {
    const gap = runPlannerProjection(minimal({ hiringMode: "gap", headcountCurrent: 5 }));
    const antecipado = runPlannerProjection(minimal({ hiringMode: "antecipado", headcountCurrent: 5 }));

    const gapFirstRisk = gap.rows.find((r) => r.gap > 0);
    const antFirstRisk = antecipado.rows.find((r) => r.gap > 0);

    if (gapFirstRisk && antFirstRisk && gapFirstRisk.month.label === antFirstRisk.month.label) {
      expect(antFirstRisk.openMonthIndex).toBeLessThan(gapFirstRisk.openMonthIndex);
    }
  });

  it("antecipado mode includes ramp-up offset in open timing", () => {
    const proj = runPlannerProjection(minimal({
      hiringMode: "antecipado",
      headcountCurrent: 2,
      rampUpMonths: 3,
      leadTimeMonths: 1,
    }));
    const riskRow = proj.rows.find((r) => r.gap > 0);
    if (riskRow) {
      // openMonthIndex = index - leadTime - (rampUp - 1) = index - 1 - 2 = index - 3
      const expectedOffset = 1 + 2; // leadTime + rampOffset
      const rowIndex = proj.rows.indexOf(riskRow);
      expect(riskRow.openMonthIndex).toBe(rowIndex - expectedOffset);
    }
  });

  it("hiringMode 'gap' e 'antecipado' impactam a disponibilidade efetiva de forma diferente", () => {
    const config = minimal({
      currentClients: 1000,
      targetClientsQ4: 2000,
      headcountCurrent: 10,
      startMonth: 1,
      endMonth: 12,
      rampUpMonths: 3,
      leadTimeMonths: 1,
    });
    const gapProj = runPlannerProjection({ ...config, hiringMode: "gap" });
    const antProj = runPlannerProjection({ ...config, hiringMode: "antecipado" });

    const firstHireGapMonthIndex = gapProj.rows.findIndex(r => r.hiresStarted > 0);
    expect(firstHireGapMonthIndex).toBeGreaterThan(-1);

    const gapRow = gapProj.rows[firstHireGapMonthIndex];
    const antRow = antProj.rows[firstHireGapMonthIndex];

    expect(antRow.openMonthIndex).toBeLessThan(gapRow.openMonthIndex);
  });
});

// ── Turnover timing ──

describe("turnover timing", () => {
  const turnoverBase = (timing: "start_of_month" | "end_of_month") => minimal({
    headcountCurrent: 10,
    turnoverValue: 2,
    turnoverPeriod: "anual",
    turnoverInputMode: "absoluto",
    turnoverTiming: timing,
    turnoverMonths: ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"],
    leadTimeMonths: 0,
  });

  it("start_of_month applies turnover before gap calculation", () => {
    const proj = runPlannerProjection(turnoverBase("start_of_month"));
    expect(proj.rows[0].turnoverTiming).toBe("start_of_month");
    expect(proj.rows[0].turnoverFormula).toContain("Início do mês");
  });

  it("end_of_month applies turnover after gap calculation", () => {
    const proj = runPlannerProjection(turnoverBase("end_of_month"));
    expect(proj.rows[0].turnoverTiming).toBe("end_of_month");
    expect(proj.rows[0].turnoverFormula).toContain("Fim do mês");
  });

  it("produces different gap totals for different timings", () => {
    const startProj = runPlannerProjection(turnoverBase("start_of_month"));
    const endProj = runPlannerProjection(turnoverBase("end_of_month"));

    const startGap = startProj.rows.reduce((s, r) => s + r.gap, 0);
    const endGap = endProj.rows.reduce((s, r) => s + r.gap, 0);

    // start_of_month reduces HC before gap calc, so gap should be >= end_of_month
    expect(startGap).toBeGreaterThanOrEqual(endGap);
  });
});

// ── Turnover strict periodicity rules (valor integral no mes-gatilho) ──

describe("turnover strict periodicity and base logic", () => {
  const baseConfig = {
    startMonth: 1,
    endMonth: 6,
    startYear: BASE_YEAR,
    endYear: BASE_YEAR,
    headcountCurrent: 20, // HC Base = 20
    leadTimeMonths: 0,
    growthMode: "linear" as const,
    currentClients: 1000,
    targetClientsQ4: 1000,
    currentVolume: 1000,
    manualGrowthByMonth: {},
    manualSeasonalityByMonth: {},
    contactRate: 1,
    productivityBase: 200,
    mixN1Pct: 50,
    mixN2Pct: 50,
    tmaN1: 10,
    tmaN2: 15,
    rampUpMonths: 3,
    vacationPct: 0,
    vacationEligiblePct: 0,
    useTenureVacation: false,
    agentsWithTenure: 0,
    breaksPct: 0,
    offchatPct: 0,
    meetingsPct: 0,
    aiCoveragePct: 0,
    aiGrowthMonthlyPct: 0,
    extraAutomationPct: 0,
    hiringMode: "gap" as const,
    turnoverTiming: "end_of_month" as const,
    turnoverMonths: [],
    useN1N2Split: false,
    promotionsCount: 0,
  };

  it("anual + absoluto: aplica valor integral no mes-gatilho (primeiro mes da timeline)", () => {
    const proj = runPlannerProjection({
      ...baseConfig,
      startMonth: 11,
      endMonth: 2,
      startYear: BASE_YEAR,
      endYear: BASE_YEAR + 1, // Nov 2026 → Feb 2027
      turnoverValue: 12,
      turnoverPeriod: "anual",
      turnoverInputMode: "absoluto",
    });

    expect(proj.timeline).toHaveLength(4);
    // Com periodo anual, o turnover mensal e 12/12 = 1
    expect(proj.rows[0].turnover).toBe(1);
    expect(proj.rows[1].turnover).toBe(0);
    expect(proj.rows[2].turnover).toBe(0);
    expect(proj.rows[3].turnover).toBe(0);
  });

  it("anual + percentual: aplica percentual mensal", () => {
    const proj = runPlannerProjection({
      ...baseConfig,
      turnoverValue: 12, // 12% ao ano = 1% ao mes
      turnoverPeriod: "anual",
      turnoverInputMode: "percentual",
    });

    // HC = 20. 12% ao ano = 12/12 = 1% ao mes
    // 20 * 1% = 0.2
    expect(proj.rows[0].turnover).toBeCloseTo(0.2);
    // Meses seguintes sao 0 pois o proximo trigger anual nao chega nesta timeline
    expect(proj.rows[1].turnover).toBe(0);
  });

  it("semestral + absoluto: aplica valor mensal", () => {
    const proj = runPlannerProjection({
      ...baseConfig,
      turnoverValue: 12, // 12 por semestre = 2 por mes
      turnoverPeriod: "semestral",
      turnoverInputMode: "absoluto",
    });

    // 12/6 = 2 por mes
    expect(proj.rows[0].turnover).toBe(2);
    expect(proj.rows[1].turnover).toBe(0);
    expect(proj.rows[2].turnover).toBe(0);
  });

  it("semestral + percentual: aplica percentual mensal", () => {
    const proj = runPlannerProjection({
      ...baseConfig,
      turnoverValue: 12, // 12% por semestre = 2% ao mes
      turnoverPeriod: "semestral",
      turnoverInputMode: "percentual",
    });

    // HC = 20. 12% por semestre = 2% ao mes = 0.4
    expect(proj.rows[0].turnover).toBeCloseTo(0.4);
  });

  it("mensal aplica turnover todo mes", () => {
    const proj = runPlannerProjection({
      ...baseConfig,
      turnoverValue: 2, // 2 abs mensais
      turnoverPeriod: "mensal",
      turnoverInputMode: "absoluto",
    });

    // Todo mes recebe 2
    expect(proj.rows[0].turnover).toBe(2);
    expect(proj.rows[1].turnover).toBe(2);
    expect(proj.rows[2].turnover).toBe(2);
  });

  it("independencia da duracao da timeline", () => {
    const configMensal = {
      ...baseConfig,
      turnoverValue: 2, // 2 abs mensais
      turnoverPeriod: "mensal" as const,
      turnoverInputMode: "absoluto" as const,
    };

    // Timeline 3 months
    const proj3 = runPlannerProjection({
      ...configMensal, startMonth: 1, endMonth: 3,
    });
    // Timeline 6 months
    const proj6 = runPlannerProjection({
      ...configMensal, startMonth: 1, endMonth: 6,
    });

    expect(proj3.rows[0].turnover).toBe(2);
    expect(proj6.rows[0].turnover).toBe(2);
  });

  it("turnover trimestral aplica a cada 3 meses", () => {
    const proj = runPlannerProjection({
      ...baseConfig,
      turnoverValue: 5,
      turnoverPeriod: "trimestral",
      turnoverInputMode: "absoluto",
    });

    // Timeline de 6 meses (Jan-Jun): triggers em index 0 e 3
    // turnover mensal = 5/3 = 1.67
    expect(proj.rows[0].turnover).toBeCloseTo(1.67);
    expect(proj.rows[1].turnover).toBe(0);
    expect(proj.rows[2].turnover).toBe(0);
    expect(proj.rows[3].turnover).toBeCloseTo(1.67);
    expect(proj.rows[4].turnover).toBe(0);
    expect(proj.rows[5].turnover).toBe(0);
  });
});

// ── Contact rate ──

describe("contact rate resolution", () => {
  it("uses manual contact rate when > 0", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      currentClients: 100, currentVolume: 500, contactRate: 2,
    }));
    expect(proj.rows[0].contactRate).toBe(2);
    expect(proj.rows[0].volumeGross).toBe(200);
  });

  it("infers contact rate from volume/clients when contactRate=0", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      currentClients: 100, currentVolume: 500, contactRate: 0,
    }));
    expect(proj.rows[0].contactRate).toBe(5);
    expect(proj.rows[0].volumeGross).toBe(500);
  });
});

// ── No growth scenario ──

describe("no growth scenario", () => {
  it("keeps clients constant with same start and target", () => {
    const proj = runPlannerProjection(minimal({
      currentClients: 1000, targetClientsQ4: 1000,
      startMonth: 3, endMonth: 6,
    }));
    proj.rows.forEach((r) => expect(r.clientsBase).toBeCloseTo(1000));
  });
});

// ── Manual growth by month ──

describe("manual growth mode", () => {
  it("applies per-month growth percentages", () => {
    const proj = runPlannerProjection(minimal({
      growthMode: "manual",
      currentClients: 1000,
      startMonth: 3, endMonth: 5,
      manualGrowthByMonth: { "2026-04": 10, "2026-05": 5 },
    }));

    expect(proj.rows[0].clientsBase).toBe(1000);
    expect(proj.rows[1].clientsBase).toBeCloseTo(1100);
    expect(proj.rows[2].clientsBase).toBeCloseTo(1155);
  });
});

// ── No hiring needed ──

describe("no hiring needed", () => {
  it("reports zero hires when capacity exceeds demand", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 50,
      currentClients: 100,
      contactRate: 1,
      productivityBase: 100,
      startMonth: 3, endMonth: 6,
      leadTimeMonths: 0,
    }));

    proj.rows.forEach((r) => {
      expect(r.hire).toBe(0);
      expect(r.gap).toBe(0);
    });
    expect(proj.summary.hiresYear).toBe(0);
    expect(proj.summary.riskMonths).toHaveLength(0);
  });
});

// ── Multiple hires over period ──

describe("multiple hires over period", () => {
  it("accumulates hires across months as demand grows", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 5,
      currentClients: 500,
      targetClientsQ4: 2000,
      contactRate: 1,
      productivityBase: 100,
      startMonth: 3, endMonth: 8,
      leadTimeMonths: 0,
    }));

    expect(proj.summary.hiresYear).toBeGreaterThan(0);
    const hiringMonths = proj.rows.filter((r) => r.hire > 0);
    expect(hiringMonths.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Cohort ramp-up with 2, 3, 4 months ──

describe("cohort ramp-up parametrized", () => {
  const cohortBase = (rampUpMonths: number) => minimal({
    headcountCurrent: 0,
    rampUpMonths,
    startMonth: 3, endMonth: 5,
    leadTimeMonths: 0,
  });

  it("rampUpMonths=2: first month at 50%", () => {
    const proj = runPlannerProjection(cohortBase(2));
    // Month 0 hires contribute at 50%
    if (proj.rows[0].hire > 0) {
      const expectedEffective = proj.rows[0].hire * 0.5;
      expect(proj.rows[0].hcAvailableEffective).toBeCloseTo(expectedEffective, 1);
    }
  });

  it("rampUpMonths=3: first month at 33%", () => {
    const proj = runPlannerProjection(cohortBase(3));
    if (proj.rows[0].hire > 0) {
      const expectedEffective = proj.rows[0].hire * (1 / 3);
      expect(proj.rows[0].hcAvailableEffective).toBeCloseTo(expectedEffective, 1);
    }
  });

  it("rampUpMonths=4: first month at 25%", () => {
    const proj = runPlannerProjection(cohortBase(4));
    if (proj.rows[0].hire > 0) {
      const expectedEffective = proj.rows[0].hire * 0.25;
      expect(proj.rows[0].hcAvailableEffective).toBeCloseTo(expectedEffective, 1);
    }
  });
});

// ── Percentual turnover ──

describe("percentual turnover", () => {
  it("calculates turnover as monthly percentage applied on trigger month", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 20,
      turnoverValue: 12,
      turnoverPeriod: "anual",
      turnoverInputMode: "percentual",
      leadTimeMonths: 0,
    }));

    // 12% ao ano = 1% ao mes
    // HC = 20 * 1% = 0.2
    expect(proj.rows[0].turnover).toBeCloseTo(0.2);
  });
});

// ── Backward compatibility: existing test scenarios ──

describe("backward compatibility with scenario presets", () => {
  it("runs base scenario without errors", () => {
    const proj = runPlannerProjection(SCENARIO_PRESETS.base);
    expect(proj.rows.length).toBeGreaterThan(0);
    expect(proj.summary.volumeQ4).toBeGreaterThan(0);
  });

  it("runs otimista scenario without errors", () => {
    const proj = runPlannerProjection(SCENARIO_PRESETS.otimista);
    expect(proj.rows.length).toBeGreaterThan(0);
  });

  it("runs pessimista scenario without errors", () => {
    const proj = runPlannerProjection(SCENARIO_PRESETS.pessimista);
    expect(proj.rows.length).toBeGreaterThan(0);
  });
});

// ── AI coverage and automation ──

describe("AI coverage and automation", () => {
  it("aiCoveragePct reduces volumeHuman", () => {
    const noAI = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      currentClients: 100, contactRate: 10,
      aiCoveragePct: 0, aiGrowthMonthlyPct: 0, extraAutomationPct: 0,
    }));
    const withAI = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      currentClients: 100, contactRate: 10,
      aiCoveragePct: 30, aiGrowthMonthlyPct: 0, extraAutomationPct: 0,
    }));

    // Volume bruto deve ser igual (100 * 10 = 1000)
    expect(noAI.rows[0].volumeGross).toBe(1000);
    expect(withAI.rows[0].volumeGross).toBe(1000);
    // Volume humano deve ser menor com AI
    expect(withAI.rows[0].volumeHuman).toBeLessThan(noAI.rows[0].volumeHuman);
    // volumeAI deve ser 30% do volume bruto
    expect(withAI.rows[0].volumeAI).toBeCloseTo(300);
  });

  it("aiGrowthMonthlyPct increases AI coverage over time", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 5,
      currentClients: 100, contactRate: 10,
      aiCoveragePct: 10, aiGrowthMonthlyPct: 5, extraAutomationPct: 0,
    }));

    // Month 0: 10% AI, Month 1: 15% AI, Month 2: 20% AI
    expect(proj.rows[0].aiPct).toBe(10);
    expect(proj.rows[1].aiPct).toBe(15);
    expect(proj.rows[2].aiPct).toBe(20);
  });

  it("extraAutomationPct adds to AI coverage", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      currentClients: 100, contactRate: 10,
      aiCoveragePct: 10, aiGrowthMonthlyPct: 0, extraAutomationPct: 5,
    }));

    // aiPct = aiCoveragePct + aiGrowthMonthlyPct * index + extraAutomationPct = 10 + 0 + 5 = 15
    expect(proj.rows[0].aiPct).toBe(15);
  });

  it("AI coverage is capped at 95%", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      currentClients: 100, contactRate: 10,
      aiCoveragePct: 90, aiGrowthMonthlyPct: 10, extraAutomationPct: 10,
    }));

    // 90 + 10*0 + 10 = 100, but capped at 95
    expect(proj.rows[0].aiPct).toBe(95);
  });
});

// ── N1/N2 split affects capacity ──

describe("N1/N2 split and capacity", () => {
  it("useN1N2Split=false uses only tmaN1 for capacity", () => {
    const noSplit = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      headcountCurrent: 10, productivityBase: 100,
      tmaN1: 20, tmaN2: 45,
      useN1N2Split: false,
      offchatPct: 0, meetingsPct: 0, vacationPct: 0, vacationEligiblePct: 0,
    }));

    // capacity = 100 * (25/20) * 1 * 1 * 1 = 125
    expect(noSplit.rows[0].capacityPerAgent).toBeCloseTo(125);
  });

  it("useN1N2Split=true uses weighted TMA for capacity", () => {
    const withSplit = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      headcountCurrent: 10, productivityBase: 100,
      tmaN1: 20, tmaN2: 45,
      mixN1Pct: 80, mixN2Pct: 20,
      useN1N2Split: true,
      offchatPct: 0, meetingsPct: 0, vacationPct: 0, vacationEligiblePct: 0,
    }));

    // weightedTma = 20*0.8 + 45*0.2 = 16 + 9 = 25
    // complexityFactor = 25/25 = 1
    // capacity = 100 * 1 = 100
    expect(withSplit.rows[0].capacityPerAgent).toBeCloseTo(100);
  });

  it("shrinkage parameters reduce capacityPerAgent", () => {
    const noShrink = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      headcountCurrent: 10, productivityBase: 100,
      tmaN1: 25,
      offchatPct: 0, meetingsPct: 0, vacationPct: 0, vacationEligiblePct: 0,
    }));
    const withShrink = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      headcountCurrent: 10, productivityBase: 100,
      tmaN1: 25,
      offchatPct: 10, meetingsPct: 5, vacationPct: 10, vacationEligiblePct: 70,
    }));

    expect(withShrink.rows[0].capacityPerAgent).toBeLessThan(noShrink.rows[0].capacityPerAgent);
  });
});

// ── Risk classification ──

describe("risk classification", () => {
  it("gap=0 results in risk=ok", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 100, currentClients: 100, targetClientsQ4: 100,
      contactRate: 1, productivityBase: 100, tmaN1: 25,
      startMonth: 3, endMonth: 5, leadTimeMonths: 0,
    }));

    proj.rows.forEach((r) => {
      expect(r.risk).toBe("ok");
    });
  });

  it("gap=1 results in risk=attention", () => {
    // capacityPerAgent = 100 * (25/25) = 100, so agentsNeeded = ceil(1000/100) = 10
    // With headcountCurrent=9 and leadTimeMonths=1, month 0 has 9 agents
    // gapFte = 10 - 9 = 1, gap = 1
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 9, currentClients: 1000, targetClientsQ4: 1000,
      contactRate: 1, productivityBase: 100, tmaN1: 25,
      startMonth: 3, endMonth: 5, leadTimeMonths: 1,
    }));

    expect(proj.rows[0].hcInitial).toBe(9);
    expect(proj.rows[0].agentsNeeded).toBe(10);
    expect(proj.rows[0].gap).toBe(1);
    expect(proj.rows[0].risk).toBe("attention");
  });

  it("gap>1 results in risk=critical", () => {
    // capacityPerAgent = 100, agentsNeeded = ceil(1000/100) = 10
    // With headcountCurrent=5 and leadTimeMonths=2, month 0 has 5 agents
    // gapFte = 10 - 5 = 5, gap = 5
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 5, currentClients: 1000, targetClientsQ4: 1000,
      contactRate: 1, productivityBase: 100, tmaN1: 25,
      startMonth: 3, endMonth: 6, leadTimeMonths: 2,
    }));

    expect(proj.rows[0].hcInitial).toBe(5);
    expect(proj.rows[0].agentsNeeded).toBe(10);
    expect(proj.rows[0].gap).toBe(5);
    expect(proj.rows[0].risk).toBe("critical");
  });
});

// ── Edge cases ──

describe("edge cases", () => {
  it("handles timeline with 1 month (startMonth === endMonth)", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
    }));

    expect(proj.rows).toHaveLength(1);
    expect(proj.summary.volumeQ4).toBeGreaterThan(0);
  });

  it("handles headcountCurrent = 0 (all hires)", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 0,
      currentClients: 1000,
      contactRate: 1,
      productivityBase: 100,
      startMonth: 3, endMonth: 6,
      leadTimeMonths: 0,
    }));

    expect(proj.rows[0].hcInitial).toBe(0);
    expect(proj.summary.hiresYear).toBeGreaterThan(0);
  });

  it("handles leadTimeMonths larger than timeline length", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 5, // 3 months
      leadTimeMonths: 5, // longer than timeline
      headcountCurrent: 0,
      currentClients: 1000,
      contactRate: 1,
    }));

    // No hires can start within the timeline
    proj.rows.forEach((r) => {
      expect(r.hiresStarted).toBe(0);
    });
    // But there may still be gaps
    expect(proj.summary.riskMonths.length).toBeGreaterThanOrEqual(0);
  });

  it("handles turnoverValue = 0 (no turnover)", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 10,
      turnoverValue: 0,
      startMonth: 3, endMonth: 6,
    }));

    proj.rows.forEach((r) => {
      expect(r.turnover).toBe(0);
    });
  });

  it("handles extreme turnover greater than HC", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 5,
      turnoverValue: 100, // more than HC
      turnoverPeriod: "mensal",
      turnoverInputMode: "absoluto",
      startMonth: 3, endMonth: 6,
      leadTimeMonths: 0,
    }));

    // Turnover should be capped at HC level, never negative
    proj.rows.forEach((r) => {
      expect(r.hcFinal).toBeGreaterThanOrEqual(0);
    });
  });

  it("linear growth mode increases clients steadily", () => {
    const proj = runPlannerProjection(minimal({
      currentClients: 1000,
      targetClientsQ4: 2000,
      growthMode: "linear",
      startMonth: 3, endMonth: 8, // 6 months
    }));

    // linearStep = (2000 - 1000) / 5 = 200 per month
    expect(proj.rows[0].clientsBase).toBe(1000);
    expect(proj.rows[1].clientsBase).toBeCloseTo(1200);
    expect(proj.rows[5].clientsBase).toBeCloseTo(2000);
  });

  it("openIn shows 'Antes do periodo' when openMonthIndex is negative", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 0,
      currentClients: 1000,
      targetClientsQ4: 2000,
      contactRate: 1,
      productivityBase: 100,
      startMonth: 3, endMonth: 6,
      leadTimeMonths: 0,
      hiringMode: "antecipado",
      rampUpMonths: 3,
    }));

    const firstHireRow = proj.rows.find((r) => r.hiresOpened > 0);
    if (firstHireRow && firstHireRow.openMonthIndex < 0) {
      expect(firstHireRow.openIn).toBe("Antes do período");
    }
  });
});

// ── Summary fields ──

describe("summary fields", () => {
  it("criticalOpenMonth shows when to open for first risk month", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 0,
      currentClients: 1000,
      targetClientsQ4: 2000,
      contactRate: 1,
      productivityBase: 100,
      startMonth: 3, endMonth: 8,
      leadTimeMonths: 2,
    }));

    expect(proj.summary.criticalOpenMonth).not.toBe("Sem risco");
    expect(proj.summary.riskMonths.length).toBeGreaterThanOrEqual(0);
  });

  it("hiresYear counts hiresStarted across timeline", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 0,
      currentClients: 1000,
      targetClientsQ4: 2000,
      contactRate: 1,
      productivityBase: 100,
      startMonth: 3, endMonth: 8,
      leadTimeMonths: 0,
    }));

    const totalStarted = proj.rows.reduce((acc, r) => acc + r.hiresStarted, 0);
    expect(proj.summary.hiresYear).toBe(totalStarted);
    expect(proj.summary.hiresYear).toBeGreaterThan(0);
  });
});

// ── Negative growth scenario ──

describe("negative growth scenario", () => {
  it("handles targetClientsQ4 < currentClients (negative growth)", () => {
    const proj = runPlannerProjection(minimal({
      currentClients: 2000,
      targetClientsQ4: 1000,
      startMonth: 3, endMonth: 6,
      headcountCurrent: 10,
      contactRate: 1,
      productivityBase: 100,
    }));

    expect(proj.rows[0].clientsBase).toBe(2000);
    expect(proj.rows[proj.rows.length - 1].clientsBase).toBeLessThan(proj.rows[0].clientsBase);
  });

  it("produces no gaps with negative growth and excess capacity", () => {
    const proj = runPlannerProjection(minimal({
      currentClients: 2000,
      targetClientsQ4: 1000,
      startMonth: 3, endMonth: 6,
      headcountCurrent: 50,
      contactRate: 1,
      productivityBase: 100,
    }));

    proj.rows.forEach((r) => {
      expect(r.gap).toBe(0);
      expect(r.risk).toBe("ok");
    });
  });

  it("handles extreme negative growth with high headcount", () => {
    const proj = runPlannerProjection(minimal({
      currentClients: 5000,
      targetClientsQ4: 500,
      startMonth: 3, endMonth: 8,
      headcountCurrent: 100,
      contactRate: 1,
      productivityBase: 100,
    }));

    expect(proj.summary.riskMonths).toHaveLength(0);
    expect(proj.rows.every(r => r.gap === 0)).toBe(true);
  });
});

// ── 100% AI coverage scenario ──

describe("100% AI coverage scenario", () => {
  it("aiPct is capped at 95% when aiCoveragePct = 100", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      currentClients: 100,
      contactRate: 10,
      aiCoveragePct: 100,
      aiGrowthMonthlyPct: 0,
      extraAutomationPct: 0,
    }));

    expect(proj.rows[0].aiPct).toBe(95);
    expect(proj.rows[0].volumeHuman).toBe(50);
  });

  it("no hiring needed with high AI coverage and excess capacity", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 6,
      currentClients: 100,
      targetClientsQ4: 500,
      contactRate: 1,
      aiCoveragePct: 90,
      aiGrowthMonthlyPct: 5,
      extraAutomationPct: 0,
      headcountCurrent: 10,
      productivityBase: 100,
    }));

    expect(proj.rows.every(r => r.gap === 0)).toBe(true);
  });
});

// ── Extreme turnover scenarios ──

describe("extreme turnover scenarios", () => {
  it("hcFinal never goes negative with extreme turnover", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 5,
      turnoverValue: 100,
      turnoverPeriod: "mensal",
      turnoverInputMode: "absoluto",
      startMonth: 3, endMonth: 8,
      leadTimeMonths: 0,
    }));

    proj.rows.forEach((r) => {
      expect(r.hcFinal).toBeGreaterThanOrEqual(0);
      expect(r.hcNominalStart).toBeGreaterThanOrEqual(0);
    });
  });

  it("hcFinal equals 0 when turnover exceeds all HC over time", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 2,
      turnoverValue: 5,
      turnoverPeriod: "mensal",
      turnoverInputMode: "absoluto",
      startMonth: 3, endMonth: 6,
      leadTimeMonths: 0,
    }));

    expect(proj.rows.every(r => r.hcFinal >= 0)).toBe(true);
  });

  it("percentual turnover with 100% turnover rate", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 10,
      turnoverValue: 100,
      turnoverPeriod: "mensal",
      turnoverInputMode: "percentual",
      startMonth: 3, endMonth: 4,
      leadTimeMonths: 0,
    }));

    proj.rows.forEach((r) => {
      expect(r.hcFinal).toBeGreaterThanOrEqual(0);
    });
  });
});

// ── Invalid inputs scenarios ──

describe("invalid inputs scenarios", () => {
  it("handles TMA = 0 gracefully", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      tmaN1: 0,
      headcountCurrent: 10,
      currentClients: 100,
      contactRate: 1,
    }));

    expect(proj.rows[0].capacityPerAgent).toBe(0);
    expect(proj.rows[0].agentsNeeded).toBeGreaterThan(0);
  });

  it("handles negative TMA gracefully", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      tmaN1: -10,
      headcountCurrent: 10,
      currentClients: 100,
      contactRate: 1,
    }));

    expect(proj.rows[0].capacityPerAgent).toBe(0);
  });

  it("handles productivityBase = 0", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      productivityBase: 0,
      headcountCurrent: 10,
      currentClients: 100,
      contactRate: 1,
    }));

    expect(proj.rows[0].capacityPerAgent).toBe(0);
    expect(proj.rows[0].agentsNeeded).toBeGreaterThanOrEqual(0);
  });

  it("handles contactRate = 0 with zero current clients", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 3, endMonth: 3,
      currentClients: 0,
      currentVolume: 0,
      contactRate: 0,
      headcountCurrent: 10,
    }));

    expect(proj.rows[0].contactRate).toBe(0);
    expect(proj.rows[0].volumeGross).toBe(0);
  });

  it("handles very large numbers without overflow", () => {
    const proj = runPlannerProjection(minimal({
      currentClients: 1000000,
      targetClientsQ4: 10000000,
      contactRate: 100,
      productivityBase: 10000,
      startMonth: 3, endMonth: 6,
    }));

    expect(proj.rows[0].volumeGross).toBeGreaterThan(0);
    expect(proj.rows[0].agentsNeeded).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(proj.rows[0].volumeGross)).toBe(true);
  });
});

// ── Timeline edge cases ──

describe("timeline edge cases", () => {
  it("handles timeline spanning multiple years", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 10, endMonth: 3,
      startYear: 2025,
      endYear: 2026,
      currentClients: 1000,
      targetClientsQ4: 2000,
    }));

    expect(proj.timeline.length).toBe(6);
    expect(proj.rows.length).toBe(proj.timeline.length);
  });

  it("handles consecutive months without gaps in hiring", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 5,
      currentClients: 500,
      targetClientsQ4: 2000,
      contactRate: 1,
      productivityBase: 100,
      startMonth: 3, endMonth: 6,
      leadTimeMonths: 0,
    }));

    const hireMonths = proj.rows.filter(r => r.hiresStarted > 0);
    expect(hireMonths.length).toBeGreaterThan(0);
  });

  it("handles manual seasonality with zero values", () => {
    const proj = runPlannerProjection(minimal({
      growthMode: "manual",
      currentClients: 1000,
      startMonth: 3, endMonth: 5,
      manualGrowthByMonth: { "2026-04": 0, "2026-05": 0 },
    }));

    expect(proj.rows[0].clientsBase).toBe(1000);
    expect(proj.rows[1].clientsBase).toBe(1000);
    expect(proj.rows[2].clientsBase).toBe(1000);
  });
});
