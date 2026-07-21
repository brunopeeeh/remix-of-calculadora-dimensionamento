import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { formatInt } from "@/features/ops-planning/format";
import { MonthlyProjection } from "@/features/ops-planning/types";

interface CapacityDemandChartProps {
  rows: MonthlyProjection[];
}

export const CapacityDemandChart = ({ rows }: CapacityDemandChartProps) => {
  const data = rows.map((r) => ({
    month: r.month.label,
    demanda: r.agentsNeeded,
    capacidade: Math.round(r.hcAvailableEffective * 10) / 10,
    gap: r.gap > 0 ? r.gap : 0,
  }));

  return (
    <ChartCard
      title="Capacidade vs Demanda"
      subtitle="Agentes necessários vs HC efetivo — zona vermelha indica gap"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gapFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-danger))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--chart-danger))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="capFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-success))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--chart-success))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip
            formatter={(v: number, name: string) => [formatInt(v), name]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Area
            type="monotone"
            dataKey="capacidade"
            stroke="hsl(var(--chart-success))"
            fill="url(#capFill)"
            strokeWidth={2}
            name="HC efetivo"
          />
          <Line
            type="monotone"
            dataKey="demanda"
            stroke="hsl(var(--chart-danger))"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "hsl(var(--chart-danger))" }}
            name="Demanda (agentes)"
          />
          <Area
            type="monotone"
            dataKey="gap"
            stroke="none"
            fill="url(#gapFill)"
            name="Gap"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};
