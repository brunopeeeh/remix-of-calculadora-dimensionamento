import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { TooltipInfo } from "./TooltipInfo";
import { cn } from "@/lib/utils";
import {
  formatNumberForDisplay,
  NumberFieldFormat,
  parseLooseNumber,
  isTransientNumericInput,
} from "@/features/ops-planning/number-input";
import { useNumberFormatting } from "@/features/ops-planning/number-formatting-context";

interface SimpleNumberFieldProps {
  label: string;
  description: string;
  tooltip: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  formatType?: NumberFieldFormat;
  decimalDigits?: number;
  replaceValueOnFocus?: boolean;
}

export const SimpleNumberField = ({
  label,
  description,
  tooltip,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatType = "integer",
  decimalDigits,
  replaceValueOnFocus = true,
}: SimpleNumberFieldProps) => {
  const formatDisplay = useNumberFormatting();
  const resolvedDecimalDigits = decimalDigits ?? (formatType === "decimal" ? 2 : 0);
  const toDisplayValue = (next: number) =>
    formatDisplay ? formatNumberForDisplay(next, formatType, resolvedDecimalDigits) : String(next);
  const [draftValue, setDraftValue] = useState(toDisplayValue(value));

  useEffect(() => {
    setDraftValue(toDisplayValue(value));
  }, [value, formatType, resolvedDecimalDigits, formatDisplay]);

  const commitValue = () => {
    const normalized = draftValue.trim();
    if (isTransientNumericInput(normalized)) {
      const fallback = min ?? 0;
      onChange(fallback);
      setDraftValue(toDisplayValue(fallback));
      return;
    }
    const parsed = parseLooseNumber(normalized);
    if (!Number.isFinite(parsed)) {
      setDraftValue(toDisplayValue(value));
      return;
    }
    const boundedMin = min ?? Number.NEGATIVE_INFINITY;
    const boundedMax = max ?? Number.POSITIVE_INFINITY;
    const next = Math.min(Math.max(parsed, boundedMin), boundedMax);
    onChange(next);
    setDraftValue(toDisplayValue(next));
  };

  const isDisplayingSavedValue = draftValue === toDisplayValue(value);
  const normalizedDraft = draftValue.trim();
  const hasDraft = normalizedDraft.length > 0;
  const isTransient = isTransientNumericInput(normalizedDraft);
  const parsedDraft = !isTransient ? parseLooseNumber(normalizedDraft) : null;
  const isDraftNumeric = hasDraft && !isTransient && Number.isFinite(parsedDraft);
  const isBelowMin = isDraftNumeric && min !== undefined && parsedDraft! < min;
  const isAboveMax = isDraftNumeric && max !== undefined && parsedDraft! > max;
  const isInvalidValue = hasDraft && !isTransient && !isDraftNumeric;

  const validationMessage = isDisplayingSavedValue
    ? null
    : isInvalidValue
      ? "Digite um número válido."
      : isBelowMin
        ? `Valor mínimo: ${formatNumberForDisplay(min!, formatType, resolvedDecimalDigits)}.`
        : isAboveMax
          ? `Valor máximo: ${formatNumberForDisplay(max!, formatType, resolvedDecimalDigits)}.`
          : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium">{label}</label>
        <TooltipInfo content={tooltip} />
      </div>
      <Input
        type="text"
        inputMode={formatType === "decimal" ? "decimal" : "numeric"}
        value={draftValue}
        data-step={step}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={commitValue}
        onFocus={(event) => {
          setDraftValue(String(value));
          if (replaceValueOnFocus) event.currentTarget.select();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        aria-invalid={Boolean(validationMessage)}
        className={cn(
          "mono-numbers h-8",
          validationMessage && "border-destructive focus-visible:ring-destructive",
        )}
      />
      <p className="text-[11px] text-muted-foreground">{description}</p>
      {validationMessage ? <p className="text-[11px] text-destructive">{validationMessage}</p> : null}
    </div>
  );
};
