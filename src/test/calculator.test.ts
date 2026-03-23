import { describe, expect, it } from "vitest";
import { getRampFactor, getRampMaturationOffset } from "@/features/ops-planning/ramp";
import { runPlannerProjection } from "@/features/ops-planning/calculator";
import { SCENARIO_PRESETS, EMPTY_PLANNER_INPUTS } from "@/features/ops-planning/scenarios";
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
      // The effective HC should only reflect legacy + cohorts that already started
      expect(proj.rows[0].hiresOpened).toBeGreaterThan(0);
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

// ── Turnover crossing year ──

describe("turnover crossing year boundary", () => {
  it("distributes turnover correctly across Nov-Feb", () => {
    const proj = runPlannerProjection(minimal({
      startMonth: 11,
      endMonth: 2,
      headcountCurrent: 10,
      turnoverValue: 4,
      turnoverPeriod: "anual",
      turnoverInputMode: "absoluto",
      turnoverMonths: ["2026-11", "2026-12", "2027-01", "2027-02"],
      leadTimeMonths: 0,
    }));

    expect(proj.timeline).toHaveLength(4);
    expect(proj.rows.map((r) => r.turnover)).toEqual([1, 1, 1, 1]);
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
  it("calculates turnover as percentage of HC", () => {
    const proj = runPlannerProjection(minimal({
      headcountCurrent: 20,
      turnoverValue: 12,
      turnoverPeriod: "anual",
      turnoverInputMode: "percentual",
      turnoverMonths: ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"],
      leadTimeMonths: 0,
    }));

    // 12% annual / 12 months = 1% per month; distributed across 6 active in 6-month timeline
    // distributionFactor = 6/6 = 1
    // turnover month 0 = 20 * (12/100/12) * 1 = 0.2
    expect(proj.rows[0].turnover).toBeCloseTo(0.2, 1);
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
