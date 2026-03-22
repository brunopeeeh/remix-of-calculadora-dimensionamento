import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { TooltipInfo } from "./TooltipInfo";

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
          className="mono-numbers h-8"
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {description} {suffix ? `(${suffix})` : ""}
      </p>
    </div>
  );
};
