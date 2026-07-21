import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ExecutiveSummary } from "@/components/ops/ExecutiveSummary";
import { SCENARIO_PRESETS } from "@/features/ops-planning/scenarios";
import { runPlannerProjection } from "@/features/ops-planning/calculator";

describe("ExecutiveSummary", () => {
  const inputs = SCENARIO_PRESETS.base;
  const projection = runPlannerProjection(inputs);

  it("renders the projection period", () => {
    render(<ExecutiveSummary rows={projection.rows} summary={projection.summary} inputs={inputs} />);
    const firstLabel = projection.timeline[0]?.label ?? "";
    const lastLabel = projection.timeline[projection.timeline.length - 1]?.label ?? "";
    expect(screen.getByText(new RegExp(firstLabel))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(lastLabel))).toBeInTheDocument();
  });

  it("renders the month count", () => {
    render(<ExecutiveSummary rows={projection.rows} summary={projection.summary} inputs={inputs} />);
    expect(screen.getByText(new RegExp(`${projection.rows.length} meses`))).toBeInTheDocument();
  });

  it("renders risk information when there are risk months", () => {
    const riskyInputs = { ...inputs, headcountCurrent: 1, currentClients: 10000, targetClientsQ4: 20000 };
    const riskyProjection = runPlannerProjection(riskyInputs);
    render(<ExecutiveSummary rows={riskyProjection.rows} summary={riskyProjection.summary} inputs={riskyInputs} />);
    if (riskyProjection.summary.riskMonths.length > 0) {
      expect(screen.getByText(/atenção/i)).toBeInTheDocument();
    }
  });

  it("renders success message when there are no risk months", () => {
    const safeInputs = { ...inputs, headcountCurrent: 100 };
    const safeProjection = runPlannerProjection(safeInputs);
    render(<ExecutiveSummary rows={safeProjection.rows} summary={safeProjection.summary} inputs={safeInputs} />);
    if (safeProjection.summary.riskMonths.length === 0) {
      expect(screen.getByText(/balanceada/i)).toBeInTheDocument();
    }
  });

  it("returns null when rows array is empty", () => {
    const { container } = render(
      <ExecutiveSummary
        rows={[]}
        summary={{ volumeQ4: 0, volumeHumanQ4: 0, capacityPerAgent: 0, agentsNeededQ4: 0, hiresYear: 0, criticalOpenMonth: "", riskMonths: [] }}
        inputs={inputs}
      />
    );
    expect(container.innerHTML).toBe("");
  });
});
