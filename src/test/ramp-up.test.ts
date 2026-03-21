import { describe, expect, it } from "vitest";
import { runPlannerProjection } from "@/features/ops-planning/calculator";
import { SCENARIO_PRESETS } from "@/features/ops-planning/scenarios";

const baseProjectionInput = {
  ...SCENARIO_PRESETS.base,
  startMonth: 3,
  endMonth: 5,
  currentClients: 1000,
  targetClientsQ4: 1000,
  contactRate: 1,
  aiCoveragePct: 0,
  aiGrowthMonthlyPct: 0,
  extraAutomationPct: 0,
  headcountCurrent: 0,
  productivityBase: 100,
  breaksPct: 0,
  offchatPct: 0,
  meetingsPct: 0,
  vacationPct: 0,
  vacationEligiblePct: 0,
  turnoverValue: 0,
  turnoverPeriod: "anual" as const,
  turnoverInputMode: "absoluto" as const,
  turnoverMonths: [],
  growthMode: "linear" as const,
  leadTimeMonths: 2,
  hiringMode: "antecipado" as const,
};

describe("partial ramp-up 33/66/100", () => {
  it("aplica contribuição progressiva das contratações por coorte", () => {
    const projection = runPlannerProjection(baseProjectionInput);

    expect(projection.rows[0].hcAvailableEffective).toBeCloseTo(3.3333, 4);
    expect(projection.rows[1].hcAvailableEffective).toBeCloseTo(8, 4);
    expect(projection.rows[2].hcAvailableEffective).toBeCloseTo(12.6667, 4);
  });

  it("reduz gap ao longo dos meses com maturação das coortes", () => {
    const projection = runPlannerProjection(baseProjectionInput);

    expect(projection.rows[0].gap).toBeGreaterThan(projection.rows[1].gap);
    expect(projection.rows[1].gap).toBeGreaterThanOrEqual(projection.rows[2].gap);
  });

  it("antecipa mês de abertura em rampUpMonths-1 no modo antecipado", () => {
    const shared = {
      ...SCENARIO_PRESETS.base,
      startMonth: 3,
      endMonth: 12,
      headcountCurrent: 2,
      leadTimeMonths: 2,
    };

    const projectionGap = runPlannerProjection({ ...shared, hiringMode: "gap" });
    const projectionAntecipado = runPlannerProjection({ ...shared, hiringMode: "antecipado" });

    const firstGapRow = projectionGap.rows.find((row) => row.gap > 0);
    expect(firstGapRow).toBeDefined();

    const sameMonthRow = projectionAntecipado.rows.find((row) => row.month.label === firstGapRow?.month.label);
    expect(sameMonthRow).toBeDefined();
    expect(sameMonthRow!.openMonthIndex).toBe(firstGapRow!.openMonthIndex - (shared.rampUpMonths - 1));
  });

  it("suporta ramp-up parametrizado em 2 e 4 meses", () => {
    const twoMonths = runPlannerProjection({ ...baseProjectionInput, rampUpMonths: 2 });
    const fourMonths = runPlannerProjection({ ...baseProjectionInput, rampUpMonths: 4 });

    expect(twoMonths.rows[0].hcAvailableEffective).toBeCloseTo(5, 4);
    expect(fourMonths.rows[0].hcAvailableEffective).toBeCloseTo(2.5, 4);
    expect(twoMonths.rows[0].openMonthIndex).toBe(fourMonths.rows[0].openMonthIndex + 2);
  });

  it("evita colisão de turnover com período cruzando ano", () => {
    const projection = runPlannerProjection({
      ...SCENARIO_PRESETS.base,
      startMonth: 11,
      endMonth: 2,
      currentClients: 1000,
      targetClientsQ4: 1000,
      contactRate: 1,
      aiCoveragePct: 0,
      aiGrowthMonthlyPct: 0,
      extraAutomationPct: 0,
      headcountCurrent: 10,
      productivityBase: 100,
      breaksPct: 0,
      offchatPct: 0,
      meetingsPct: 0,
      vacationPct: 0,
      vacationEligiblePct: 0,
      turnoverValue: 4,
      turnoverMonths: ["2026-11", "2026-12", "2027-01", "2027-02"],
      growthMode: "linear",
      leadTimeMonths: 1,
      hiringMode: "gap",
    });

    expect(projection.rows.map((row) => row.turnover)).toEqual([1, 1, 1, 1]);
  });

  it("mantém contactRate manual quando informado", () => {
    const projection = runPlannerProjection({
      ...SCENARIO_PRESETS.base,
      startMonth: 3,
      endMonth: 3,
      currentClients: 100,
      currentVolume: 500,
      contactRate: 2,
      growthMode: "linear",
      turnoverMonths: [],
      turnoverValue: 0,
    });

    expect(projection.rows[0].contactRate).toBe(2);
    expect(projection.rows[0].volumeGross).toBe(200);
  });
});