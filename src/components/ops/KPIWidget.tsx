import { useEffect, useRef, useMemo, useState, ReactNode } from "react";
import { TooltipInfo } from "./TooltipInfo";
import { cn } from "@/lib/utils";

interface KPIWidgetProps {
  title: string;
  subtitle: string;
  tooltip: string;
  value: number | string;
  format?: (value: number) => string;
  tone?: "default" | "risk" | "success";
  isProminent?: boolean;
  action?: ReactNode;
}

const useAnimatedNumber = (target: number, duration = 260) => {
  const [value, setValue] = useState(target);
  const prevTargetRef = useRef(target);

  useEffect(() => {
    if (target === prevTargetRef.current) return;
    
    const start = performance.now();
    const startValue = prevTargetRef.current;

    const frame = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(startValue + (target - startValue) * eased);
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        prevTargetRef.current = target;
      }
    };

    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);

  return value;
};

export const KPIWidget = ({ title, subtitle, tooltip, value, format, tone = "default", isProminent = false, action }: KPIWidgetProps) => {
  const isNumeric = typeof value === "number";
  const animatedValue = useAnimatedNumber(isNumeric ? value : 0);

  const displayValue = useMemo(() => {
    if (!isNumeric) return value;
    return format ? format(animatedValue) : String(Math.round(animatedValue));
  }, [animatedValue, format, isNumeric, value]);

  // Flash animation on value change
  const valueRef = useRef<HTMLParagraphElement>(null);
  const prevValue = useRef<number | string>(value);

  useEffect(() => {
    if (prevValue.current !== value && valueRef.current) {
      valueRef.current.classList.remove("kpi-value-flash");
      // Force reflow to restart animation
      void valueRef.current.offsetWidth;
      valueRef.current.classList.add("kpi-value-flash");
    }
    prevValue.current = value;
  }, [value]);

  return (
    <article
      className={cn(
        "kpi-card flex flex-col",
        tone === "risk" && "kpi-card-risk",
        tone === "success" && "kpi-card-success",
        isProminent && "ring-2 ring-primary/30 shadow-lg shadow-primary/5 sm:col-span-2 xl:col-span-1",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={cn(
          "font-medium uppercase tracking-wide text-muted-foreground",
          isProminent ? "text-sm" : "text-xs",
        )}>{title}</p>
        <TooltipInfo content={tooltip} />
      </div>
      <p
        ref={valueRef}
        className={cn(
          "heading-tight mono-numbers mt-2 font-semibold break-words",
          isProminent ? "text-2xl leading-tight" : "text-2xl",
        )}
      >
        {displayValue}
      </p>
      <div className="mt-auto pt-2 flex items-end justify-between gap-2">
        <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </article>
  );
};
