import { describe, it, expect } from 'vitest';
import { runPlannerProjection } from './calculator';
import { PlannerInputs } from './types';

const defaultInputs: PlannerInputs = {
  currentClients: 1000,
  targetClientsQ4: 1200,
  targetClientsGrowthPct: 0.2,
  currentVolume: 5000,
  contactRate: 5,
  startMonth: 1,
  endMonth: 12,
  startYear: 2025,
  endYear: 2025,
  growthMode: "linear",
  manualGrowthByMonth: {},
  manualSeasonalityByMonth: {},

  aiCoveragePct: 0,
  aiGrowthMonthlyPct: 0,
  extraAutomationPct: 0,

  headcountCurrent: 10,
  headcountPleno: 10,
  headcountNovo: 0,
  rookieRampFactors: {
    month1: 0.33,
    month2: 0.66,
    month3: 1.0
  },
  productivityBase: 0.85,
  rampUpMonths: 2,
  tmaN1: 120,
  tmaN2: 120,
  mixN1Pct: 1,
  mixN2Pct: 0,
  useN1N2Split: false,

  breaksPct: 0.1667,
  offchatPct: 0,
  meetingsPct: 0,
  vacationPct: 0.05,
  useTenureVacation: false,
  agentsWithTenure: 0,
  promotionsCount: 0,

  turnoverValue: 1.5, // High turnover
  turnoverPeriod: "mensal",
  turnoverInputMode: "percentual",
  turnoverTiming: "start_of_month",
  turnoverMonths: [],

  leadTimeMonths: 0,
  hiringMode: "gap",
};

describe('calculator tests', () => {
  it('should handle extremely high turnover without negative headcount', () => {
    const input: PlannerInputs = {
      ...defaultInputs,
      turnoverValue: 150, // 150% turnover
      turnoverInputMode: "percentual",
      turnoverTiming: "end_of_month",
    };

    const result = runPlannerProjection(input);
    
    // Verify legacy doesn't go below 0
    result.rows.forEach(row => {
      expect(row.hcNominalStart).toBeGreaterThanOrEqual(0);
      expect(row.hcFinal).toBeGreaterThanOrEqual(0);
      expect(row.hcNominalAfterTurnoverStart).toBeGreaterThanOrEqual(0);
    });
  });

  it('should not double-count cohorts and correctly apply rampUp to hcEffective', () => {
     const input: PlannerInputs = {
      ...defaultInputs,
      headcountCurrent: 0, // start with 0 headcount
      headcountPleno: 0,   // sem legado pleno
      turnoverValue: 0,
      turnoverTiming: 'start_of_month',
      leadTimeMonths: 0,
      rampUpMonths: 2, // 2 months ramp up
      startMonth: 1,
      endMonth: 3,
    };

    const result = runPlannerProjection(input);

    // Com C1, startIndex mínimo é 1 — cohorts abertos no mês 0 só iniciam no mês 1
    // No mês 1 (índice 1) o cohort existe mas com ramp parcial → effective < nominal
    const secondMonth = result.rows[1];
    if (secondMonth.hiresStarted > 0) {
      // hcAvailableEffective inclui ramp parcial; hcFinal é nominal completo
      expect(secondMonth.hcAvailableEffective).toBeLessThan(secondMonth.hcFinal);
    }

    // HC nunca negativo em nenhum mês
    result.rows.forEach(row => {
      expect(row.hcAvailableEffective).toBeGreaterThanOrEqual(0);
      expect(row.hcFinal).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Fase 1 — Testes das correções C1/C2/C3 ──

  it('C1 — hiringMode "antecipado" deve antecipar o startIndex real do cohort', () => {
    const baseInput: PlannerInputs = {
      ...defaultInputs,
      turnoverValue: 0,
      headcountCurrent: 5,
      headcountPleno: 5,
      rampUpMonths: 3,      // rampOffset = 2
      leadTimeMonths: 0,
      startMonth: 1, endMonth: 6,
    };

    const gap = runPlannerProjection({ ...baseInput, hiringMode: 'gap' });
    const antecipado = runPlannerProjection({ ...baseInput, hiringMode: 'antecipado' });

    // O modo antecipado deve iniciar o ramp no mesmo mês ou antes do modo gap
    const firstGapIdx = gap.rows.findIndex(r => r.hiresStarted > 0);
    const firstAntIdx = antecipado.rows.findIndex(r => r.hiresStarted > 0);
    if (firstGapIdx >= 0 && firstAntIdx >= 0) {
      expect(firstAntIdx).toBeLessThanOrEqual(firstGapIdx);
    }

    // startIndex mínimo deve ser 1 (nunca no mês índice 0)
    antecipado.rows.forEach((r, idx) => {
      if (r.hiresStarted > 0) {
        expect(idx).toBeGreaterThanOrEqual(1);
      }
    });
  });

  it('C2 — turnover alto deve aumentar hiresYear em relação a turnover zero', () => {
    const baseInput: PlannerInputs = {
      ...defaultInputs,
      headcountCurrent: 10,
      headcountPleno: 10,
      turnoverPeriod: 'mensal',
      turnoverInputMode: 'percentual',
      turnoverTiming: 'start_of_month',
      turnoverMonths: [],
      startMonth: 1, endMonth: 12,
    };

    const withoutTurnover = runPlannerProjection({ ...baseInput, turnoverValue: 0 });
    const withTurnover    = runPlannerProjection({ ...baseInput, turnoverValue: 20 }); // 20%/mês

    // Com turnover alto o planejamento precisa de mais contratações
    expect(withTurnover.summary.hiresYear).toBeGreaterThan(withoutTurnover.summary.hiresYear);
  });

  it('C3 — promoções N1→N2 devem reduzir capacityPerAgent ao longo do tempo', () => {
    const input: PlannerInputs = {
      ...defaultInputs,
      headcountCurrent: 20,
      headcountPleno: 20,
      turnoverValue: 0,
      useN1N2Split: true,
      mixN1Pct: 80,
      mixN2Pct: 20,
      tmaN1: 15,    // N1 mais rápido → maior capacidade
      tmaN2: 45,    // N2 mais lento → menor capacidade
      promotionsCount: 10,
      startMonth: 1, endMonth: 12,
    };

    const result = runPlannerProjection(input);
    const first = result.rows[0];
    const last  = result.rows[result.rows.length - 1];

    // N2 tem TMA maior → capacidade por agente cai à medida que promoções acumulam
    expect(last.capacityPerAgent).toBeLessThan(first.capacityPerAgent);
  });
});
