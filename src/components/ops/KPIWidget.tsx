import { useEffect, useRef, useMemo, useState, ReactNode, ComponentType } from "react";
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
  icon?: ComponentType<{ className?: string }>;
  /** Índice para animar entrada em stagger (0-based) */
  index?: number;
}

const useAnimatedNumber = (target: number, duration = 300) => {
  const [value, setValue] = useState(target);
  const prevTargetRef = useRef(target);

  useEffect(() => {
    if (target === prevTargetRef.current) return;

    const start = performance.now();
    const startValue = prevTargetRef.current;

    const frame = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Cubic ease-out — feels snappy, not robotic
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

export const KPIWidget = ({
  title,
  subtitle,
  tooltip,
  value,
  format,
  tone = "default",
  isProminent = false,
  action,
  icon: Icon,
  index = 0,
}: KPIWidgetProps) => {
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
      void valueRef.current.offsetWidth; // force reflow
      valueRef.current.classList.add("kpi-value-flash");
    }
    prevValue.current = value;
  }, [value]);

  const toneIconClass = {
    default: "text-primary/70",
    risk: "text-danger",
    success: "text-success",
  }[tone];

  return (
    <article
      className={cn(
        "kpi-card flex flex-col",
        tone === "risk" && "kpi-card-risk",
        tone === "success" && "kpi-card-success",
        isProminent && "kpi-card-prominent sm:col-span-2 xl:col-span-1",
      )}
      style={{ "--kpi-index": index } as React.CSSProperties}
    >
      {/* Header: ícone + título + tooltip */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && (
            <div className={cn(
              "flex shrink-0 items-center justify-center rounded-md p-1.5",
              tone === "risk" ? "bg-danger/10" : tone === "success" ? "bg-success/10" : "bg-primary/8",
            )}>
              <Icon className={cn("h-3.5 w-3.5 shrink-0", toneIconClass)} />
            </div>
          )}
          <p className={cn(
            "font-semibold uppercase tracking-wide text-muted-foreground leading-tight",
            isProminent ? "text-[11px]" : "text-[10px]",
          )}>
            {title}
          </p>
        </div>
        <TooltipInfo content={tooltip} />
      </div>

      {/* Valor principal */}
      <p
        ref={valueRef}
        className={cn(
          "heading-tight mono-numbers mt-3 font-bold break-words leading-none",
          isProminent ? "text-3xl" : "text-2xl",
          tone === "risk" && "text-danger",
          tone === "success" && "text-success",
        )}
      >
        {displayValue}
      </p>

      {/* Rodapé: subtítulo + action */}
      <div className="mt-auto pt-3 flex items-end justify-between gap-2">
        <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </article>
  );
};
