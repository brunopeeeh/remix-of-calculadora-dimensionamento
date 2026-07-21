import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ValidationAlert } from "@/components/ops/ValidationAlert";
import { SCENARIO_PRESETS, EMPTY_PLANNER_INPUTS } from "@/features/ops-planning/scenarios";

describe("ValidationAlert", () => {
  it("renders nothing when all inputs are valid", () => {
    const { container } = render(<ValidationAlert inputs={SCENARIO_PRESETS.base} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders warnings when headcount is 0", () => {
    render(<ValidationAlert inputs={{ ...SCENARIO_PRESETS.base, headcountCurrent: 0 }} />);
    expect(screen.getByText("Headcount deve ser ≥ 1")).toBeInTheDocument();
  });

  it("renders warnings when productivityBase is below 100", () => {
    render(<ValidationAlert inputs={{ ...SCENARIO_PRESETS.base, productivityBase: 50 }} />);
    expect(screen.getByText("Produtividade mínima recomendada: 100")).toBeInTheDocument();
  });

  it("renders multiple warnings at once", () => {
    render(
      <ValidationAlert
        inputs={{
          ...EMPTY_PLANNER_INPUTS,
          headcountCurrent: 0,
          productivityBase: 0,
          tmaN1: 0,
          contactRate: 0,
          rampUpMonths: 0,
          leadTimeMonths: -1,
        }}
      />
    );
    expect(screen.getByText("Headcount deve ser ≥ 1")).toBeInTheDocument();
    expect(screen.getByText("Produtividade mínima recomendada: 100")).toBeInTheDocument();
    expect(screen.getByText("TMA deve ser > 0")).toBeInTheDocument();
    expect(screen.getByText("Contact rate deve ser > 0")).toBeInTheDocument();
    expect(screen.getByText("Ramp-up mínimo: 1 mês")).toBeInTheDocument();
    expect(screen.getByText("Lead time não pode ser negativo")).toBeInTheDocument();
  });

  it("renders section header with warnings", () => {
    render(<ValidationAlert inputs={{ ...SCENARIO_PRESETS.base, headcountCurrent: 0 }} />);
    expect(screen.getByText("Validação")).toBeInTheDocument();
  });
});
