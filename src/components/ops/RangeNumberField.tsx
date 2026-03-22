import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { TooltipInfo } from "./TooltipInfo";
import { cn } from "@/lib/utils";

interface RangeNumberFieldProps {
  label: string;
  description: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
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
  suffix,
  tooltip,
}: RangeNumberFieldProps) => {
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  const commitNumberInput = () => {
    const normalized = draftValue.trim();

    if (normalized === "" || normalized === "-" || normalized === "." || normalized === "-.") {
      onChange(min);
      setDraftValue(String(min));
      return;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      setDraftValue(String(value));
      return;
    }

    const next = Math.min(Math.max(parsed, min), max);
    onChange(next);
    setDraftValue(String(next));
  };

  const normalizedDraft = draftValue.trim();
  const parsedDraft = Number(normalizedDraft);
  const hasDraft = normalizedDraft.length > 0;
  const isDraftNumeric = hasDraft && Number.isFinite(parsedDraft);
  const isBelowMin = isDraftNumeric && parsedDraft < min;
  const isAboveMax = isDraftNumeric && parsedDraft > max;
  const isInvalidValue = hasDraft && !isDraftNumeric;

  const validationMessage = isInvalidValue
    ? "Digite um número válido."
    : isBelowMin
      ? `Valor mínimo: ${min}.`
      : isAboveMax
        ? `Valor máximo: ${max}.`
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
            setDraftValue(String(next));
          }}
          className="w-full accent-primary"
        />
        <Input
          type="number"
          value={draftValue}
          min={min}
          max={max}
          step={step}
          onFocus={(event) => event.currentTarget.select()}
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
