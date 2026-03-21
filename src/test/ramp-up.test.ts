import { describe, expect, it } from "vitest";
import { runPlannerProjection } from "@/features/ops-planning/calculator";
import { SCENARIO_PRESETS } from "@/features/ops-planning/scenarios";

describe("partial ramp-up 33/66/100", () => {
  it("aplica contribuição progressiva das contratações por coorte", () => {
    const projection = runPlannerProjection({
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
      turnoverAnnual: 0,
      turnoverMonths: [],
      growthMode: "linear",
      leadTimeMonths: 2,
      hiringMode: "antecipado",
    });

    expect(projection.rows[0].hcAvailableEffective).toBeCloseTo(3.3, 4);
    expect(projection.rows[1].hcAvailableEffective).toBeCloseTo(7.92, 4);
    expect(projection.rows[2].hcAvailableEffective).toBeCloseTo(12.64, 4);
  });

  it("reduz gap ao longo dos meses com maturação das coortes", () => {
    const projection = runPlannerProjection({
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
      turnoverAnnual: 0,
      turnoverMonths: [],
      growthMode: "linear",
      leadTimeMonths: 2,
      hiringMode: "antecipado",
    });

    expect(projection.rows[0].gap).toBeGreaterThan(projection.rows[1].gap);
    expect(projection.rows[1].gap).toBeGreaterThanOrEqual(projection.rows[2].gap);
  });

  it("antecipa mês de abertura em 2 meses no modo antecipado", () => {
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
    expect(sameMonthRow!.openMonthIndex).toBe(firstGapRow!.openMonthIndex - 2);
  });
});