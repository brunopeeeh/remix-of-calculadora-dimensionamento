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
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-primary"
        />
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mono-numbers h-8"
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {description} {suffix ? `(${suffix})` : ""}
      </p>
    </div>
  );
};
