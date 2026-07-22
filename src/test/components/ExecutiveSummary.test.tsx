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
    // O primeiro mês pode aparecer também na lista de déficit estrutural,
    // então basta que exista ao menos uma ocorrência.
    expect(screen.getAllByText(new RegExp(firstLabel)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(lastLabel)).length).toBeGreaterThan(0);
  });

  it("renders the month count", () => {
    render(<ExecutiveSummary rows={projection.rows} summary={projection.summary} inputs={inputs} />);
    expect(screen.getByText(new RegExp(`${projection.rows.length} meses`))).toBeInTheDocument();
  });

  it("renders risk or structural-deficit information when there are risk months", () => {
    const riskyInputs = { ...inputs, headcountCurrent: 1, headcountPleno: 1, currentClients: 10000, targetClientsQ4: 20000 };
    const riskyProjection = runPlannerProjection(riskyInputs);
    render(<ExecutiveSummary rows={riskyProjection.rows} summary={riskyProjection.summary} inputs={riskyInputs} />);
    const uncoverable = riskyProjection.summary.uncoverableMonths ?? [];
    const late = riskyProjection.summary.hiresScheduledLate ?? 0;
    if (uncoverable.length > 0 && late > 0) {
      // Déficit estrutural: nenhuma contratação cobre esses meses a tempo.
      expect(screen.getByText(/déficit inevitável/i)).toBeInTheDocument();
    } else if (riskyProjection.summary.riskMonths.length > 0) {
      expect(screen.getByText(/gap/i)).toBeInTheDocument();
    }
  });

  it("shows structural deficit as the dominant state over coverable risk", () => {
    // Base já tem déficit estrutural nos primeiros meses (ramp+lead).
    const proj = runPlannerProjection(inputs);
    const uncoverable = proj.summary.uncoverableMonths ?? [];
    if ((proj.summary.hiresScheduledLate ?? 0) > 0 && uncoverable.length > 0) {
      render(<ExecutiveSummary rows={proj.rows} summary={proj.summary} inputs={inputs} />);
      expect(screen.getByText(/déficit inevitável/i)).toBeInTheDocument();
      // e nomeia ao menos um dos meses incobríveis (pode repetir no cabeçalho de período)
      expect(screen.getAllByText(new RegExp(uncoverable[0])).length).toBeGreaterThan(0);
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
        summary={{ volumeQ4: 0, volumeHumanQ4: 0, capacityPerAgent: 0, agentsNeededQ4: 0, hcFinalQ4: 0, totalTurnoverYear: 0, hiresYear: 0, criticalOpenMonth: "", riskMonths: [] }}
        inputs={inputs}
      />
    );
    expect(container.innerHTML).toBe("");
  });
});
