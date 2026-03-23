import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { TooltipInfo } from "./TooltipInfo";
import { cn } from "@/lib/utils";
import {
  formatNumberForDisplay,
  inferDecimalDigitsFromStep,
  isTransientNumericInput,
  NumberFieldFormat,
  parseLooseNumber,
} from "@/features/ops-planning/number-input";
import { useNumberFormatting } from "@/features/ops-planning/number-formatting-context";

interface RangeNumberFieldProps {
  label: string;
  description: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  formatType?: NumberFieldFormat;
  decimalDigits?: number;
  suffix?: string;
  tooltip: string;
}

export const RangeNumberField = ({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatType,
  decimalDigits,
  suffix,
  tooltip,
}: RangeNumberFieldProps) => {
  const formatDisplay = useNumberFormatting();
  const resolvedFormatType = formatType ?? (Number.isInteger(step) ? "integer" : "decimal");
  const resolvedDecimalDigits =
    decimalDigits ?? (resolvedFormatType === "decimal" ? inferDecimalDigitsFromStep(step, 2) : 0);
  const toDisplayValue = (next: number) =>
    formatDisplay
      ? formatNumberForDisplay(next, resolvedFormatType, resolvedDecimalDigits)
      : String(next);
  const [draftValue, setDraftValue] = useState(
    toDisplayValue(value),
  );

  useEffect(() => {
    setDraftValue(toDisplayValue(value));
  }, [value, resolvedFormatType, resolvedDecimalDigits, formatDisplay]);

  const commitNumberInput = () => {
    const normalized = draftValue.trim();

    if (isTransientNumericInput(normalized)) {
      onChange(min);
      setDraftValue(toDisplayValue(min));
      return;
    }

    const parsed = parseLooseNumber(normalized);
    if (!Number.isFinite(parsed)) {
      setDraftValue(toDisplayValue(value));
      return;
    }

    const next = Math.min(Math.max(parsed, min), max);
    onChange(next);
    setDraftValue(toDisplayValue(next));
  };

  const isDisplayingSavedValue = draftValue === toDisplayValue(value);
  const normalizedDraft = draftValue.trim();
  const hasDraft = normalizedDraft.length > 0;
  const isTransient = isTransientNumericInput(normalizedDraft);
  const parsedDraft = !isTransient ? parseLooseNumber(normalizedDraft) : null;
  const isDraftNumeric = hasDraft && !isTransient && Number.isFinite(parsedDraft);
  const isBelowMin = isDraftNumeric && parsedDraft! < min;
  const isAboveMax = isDraftNumeric && parsedDraft! > max;
  const isInvalidValue = hasDraft && !isTransient && !isDraftNumeric;

  const validationMessage = isDisplayingSavedValue
    ? null
    : isInvalidValue
      ? "Digite um número válido."
      : isBelowMin
        ? `Valor mínimo: ${formatNumberForDisplay(min, resolvedFormatType, resolvedDecimalDigits)}.`
        : isAboveMax
          ? `Valor máximo: ${formatNumberForDisplay(max, resolvedFormatType, resolvedDecimalDigits)}.`
          : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-foreground">{label}</label>
        <TooltipInfo content={tooltip} />
      </div>

      <div className="ops-input-grid">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(next);
             setDraftValue(toDisplayValue(next));
          }}
          className="w-full accent-primary"
        />
        <Input
           type="text"
           inputMode={resolvedFormatType === "decimal" ? "decimal" : "numeric"}
          value={draftValue}
           data-step={step}
           onFocus={(event) => {
             setDraftValue(String(value));
             event.currentTarget.select();
           }}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commitNumberInput}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          aria-invalid={Boolean(validationMessage)}
          className={cn(
            "mono-numbers h-8",
            validationMessage && "border-destructive focus-visible:ring-destructive",
          )}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {description} {suffix ? `(${suffix})` : ""}
      </p>
      {validationMessage ? <p className="text-[11px] text-destructive">{validationMessage}</p> : null}
    </div>
  );
};
