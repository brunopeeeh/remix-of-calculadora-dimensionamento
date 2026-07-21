import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SimpleNumberField } from "@/components/ops/SimpleNumberField";
import { NumberFormattingProvider } from "@/features/ops-planning/number-formatting-context";
import { TooltipProvider } from "@/components/ui/tooltip";

const renderField = (props: Partial<React.ComponentProps<typeof SimpleNumberField>> = {}) =>
  render(
    <TooltipProvider>
      <NumberFormattingProvider value={false}>
        <SimpleNumberField
          label="Teste"
          description="Descrição do campo"
          tooltip="Dica"
          value={0}
          onChange={vi.fn()}
          {...props}
        />
      </NumberFormattingProvider>
    </TooltipProvider>
  );

describe("SimpleNumberField", () => {
  it("renders label and description", () => {
    renderField();
    expect(screen.getByText("Teste")).toBeInTheDocument();
    expect(screen.getByText("Descrição do campo")).toBeInTheDocument();
  });

  it("renders input with current value", () => {
    renderField({ value: 42 });
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("42");
  });

  it("calls onChange with parsed value on blur", () => {
    const onChange = vi.fn();
    renderField({ value: 10, onChange, min: 0 });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "25" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(25);
  });

  it("clamps value to min on blur", () => {
    const onChange = vi.fn();
    renderField({ value: 50, onChange, min: 10 });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("clamps value to max on blur", () => {
    const onChange = vi.fn();
    renderField({ value: 10, onChange, min: 0, max: 100 });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "150" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(100);
  });

  it("shows validation message for out-of-range values while editing", () => {
    renderField({ value: 10, min: 5, max: 20 });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "30" } });

    expect(screen.getByText(/Valor máximo: 20/)).toBeInTheDocument();
  });

  it("shows invalid number message for input with multiple dots", () => {
    renderField({ value: 10, min: 0 });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "12.34.56" } });

    expect(screen.getByText("Digite um número válido.")).toBeInTheDocument();
  });

  it("calls onChange with min when transient empty string is blurred", () => {
    const onChange = vi.fn();
    renderField({ value: 10, onChange, min: 5 });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("selects text on focus", () => {
    const selectSpy = vi.fn();
    const input = document.createElement("input");
    input.select = selectSpy;

    renderField({ value: 42 });
    const renderedInput = screen.getByRole("textbox");
    fireEvent.focus(renderedInput);
  });
});
