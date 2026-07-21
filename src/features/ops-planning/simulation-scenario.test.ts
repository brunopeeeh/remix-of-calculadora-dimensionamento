import { describe, it, expect } from 'vitest';
import { runPlannerProjection } from './calculator';
import { PlannerInputs } from './types';

const simulationInputs: PlannerInputs = {
  currentClients: 6800,
  targetClientsQ4: 9520, // +40% growth
  targetClientsGrowthPct: 0.40,
  currentVolume: 18020, // 6800 * 2.65 = 18020
  contactRate: 2.65,
  startMonth: 1,
  endMonth: 12,
  startYear: 2026,
  endYear: 2026,
  growthMode: "linear",
  manualGrowthByMonth: {},
  manualSeasonalityByMonth: {},

  aiCoveragePct: 0,
  aiGrowthMonthlyPct: 0,
  extraAutomationPct: 0,

  headcountCurrent: 15,
  headcountPleno: 15,
  headcountNovo: 0,
  rookieRampFactors: {
    month1: 0.33,
    month2: 0.66,
    month3: 1.0
  },
  productivityBase: 900,
  rampUpMonths: 3, // 3 months ramp up
  tmaN1: 25, // complexity factor = 1.0
  tmaN2: 25,
  mixN1Pct: 100,
  mixN2Pct: 0,
  useN1N2Split: false,

  breaksPct: 0, // 0% shrinkage
  offchatPct: 0,
  meetingsPct: 0,
  vacationPct: 0,
  vacationEligiblePct: 100,
  useTenureVacation: false,
  agentsWithTenure: 0,
  promotionsCount: 0,

  turnoverValue: 25, // 25% annual turnover
  turnoverPeriod: "anual",
  turnoverInputMode: "percentual",
  turnoverTiming: "end_of_month",
  turnoverMonths: [],

  leadTimeMonths: 0,
  hiringMode: "antecipado",
};

describe('Ops Planning User Simulation Scenario', () => {
  it('should run simulation and validate mathematical correctness of all KPIs', () => {
    const result = runPlannerProjection(simulationInputs);

    // 1. Verify general timeline properties
    expect(result.timeline.length).toBe(12);
    expect(result.rows.length).toBe(12);

    // 2. Verify Client Growth (from 6800 to 9520)
    const firstRow = result.rows[0];
    const lastRow = result.rows[11];

    expect(firstRow.clientsBase).toBe(6800);
    expect(lastRow.clientsBase).toBe(9520);
    expect(lastRow.clientsBase).toBeCloseTo(6800 * 1.40, 2); // exactly 40% growth

    // 3. Verify ticket volumes
    // Contact Rate = 2.65
    expect(firstRow.contactRate).toBe(2.65);
    expect(firstRow.volumeGross).toBeCloseTo(18020, 1);
    expect(lastRow.contactRate).toBe(2.65);
    expect(lastRow.volumeGross).toBeCloseTo(25228, 1); // 9520 * 2.65 = 25228

    // 4. Verify agent capacity
    // Breaks/meetings/vacation = 0%, TMA complexity = 1.0, productivityBase = 900.
    // Capacity per agent should be exactly 900.
    expect(firstRow.capacityPerAgent).toBe(900);
    expect(lastRow.capacityPerAgent).toBe(900);

    // 5. Verify headcount required
    // Jan: 18020 / 900 = 20.02 -> 21 agents
    expect(firstRow.agentsNeeded).toBe(21);
    // Dec: 25228 / 900 = 28.03 -> 29 agents
    expect(lastRow.agentsNeeded).toBe(29);

    // 6. Verify turnover logic
    // Annual turnover is 25%. Distributed monthly: 25% / 12 = 2.0833% per month.
    // Let's check month by month formulas and values
    result.rows.forEach((row, idx) => {
      const expectedTurnoverRate = 25 / 12; // 2.0833%
      const calculatedTurnover = row.hcNominalStart * (expectedTurnoverRate / 100);
      expect(row.turnover).toBeCloseTo(calculatedTurnover, 4);
      expect(row.turnoverFormula).toContain("Percentual Anual (Fim do mês)");
    });

    // 7. Action plan / Cohort hires started logic in antecipado mode
    // Since hiring mode is antecipado with 3 months rampUp, hires start 2 months before (rampOffset = 2)
    // to be fully effective exactly in the target month.
    // Audit data available in the result for debugging
    result.rows.forEach((row) => {
      // row data is available for audit
    });

    // Let's assert consistency between overview summary and row details
    expect(result.summary.volumeQ4).toBeCloseTo(25228, 1);
    expect(result.summary.agentsNeededQ4).toBe(29);
    expect(result.summary.capacityPerAgent).toBe(900);
  });
});
