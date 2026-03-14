import { useEffect, useMemo, useState } from "react";
import { TooltipInfo } from "./TooltipInfo";
import { cn } from "@/lib/utils";

interface KPIWidgetProps {
  title: string;
  subtitle: string;
  tooltip: string;
  value: number | string;
  format?: (value: number) => string;
  tone?: "default" | "risk" | "success";
}

const useAnimatedNumber = (target: number, duration = 260) => {
  const [value, setValue] = useState(target);

  useEffect(() => {
    const start = performance.now();
    const initial = value;

    const frame = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(initial + (target - initial) * eased);
      if (progress < 1) requestAnimationFrame(frame);
    };

    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [target]);

  return value;
};

export const KPIWidget = ({ title, subtitle, tooltip, value, format, tone = "default" }: KPIWidgetProps) => {
  const isNumeric = typeof value === "number";
  const animatedValue = useAnimatedNumber(isNumeric ? value : 0);

  const displayValue = useMemo(() => {
    if (!isNumeric) return value;
    return format ? format(animatedValue) : String(Math.round(animatedValue));
  }, [animatedValue, format, isNumeric, value]);

  return (
    <article
      className={cn(
        "kpi-card",
        tone === "risk" && "kpi-card-risk",
        tone === "success" && "kpi-card-success",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <TooltipInfo content={tooltip} />
      </div>
      <p className="heading-tight mono-numbers mt-2 text-2xl font-semibold animate-value-rise">{displayValue}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </article>
  );
};
