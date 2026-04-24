import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, LabelList, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Area, AreaChart,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { formatInt, formatDecimal } from "@/features/ops-planning/format";
import { MonthlyProjection, PlannerInputs } from "@/features/ops-planning/types";
import { computeTenureVacationPct } from "@/features/ops-planning/capacity";

interface ChartsSectionProps {
  rows: MonthlyProjection[];
  inputs: PlannerInputs;
  capacityPerAgent: number;
}

// Custom label for shrinkage bars
const ShrinkageLabel = ({ x, y, width, value }: { x?: number; y?: number; width?: number; value?: number }) => {
  if (!value || !x || !y || !width) return null;
  const isNegative = value < 0;
  const display = isNegative
    ? `-${formatDecimal(Math.abs(value), 0)}`
    : formatDecimal(value, 0);
  return (
    <text
      x={x + width / 2}
      y={isNegative ? y + 18 : y - 6}
      textAnchor="middle"
      fontSize={10}
      fill="hsl(var(--foreground))"
      fillOpacity={0.7}
    >
      {display}
    </text>
  );
};

export const ChartsSection = ({ rows, inputs, capacityPerAgent }: ChartsSectionProps) => {
  const chartRows = rows.map((row) => ({
    month: row.month.label,
    volumeBruto: row.volumeGross,
    volumeIA: row.volumeAI,
    volumeHumano: row.volumeHuman,
    agentesNecessarios: row.agentsNeeded,
    hcDisponivel: row.hcAvailableEffective,
    gap: row.gap,
  }));

  const shrinkageLosses = [
    inputs.productivityBase * (inputs.breaksPct / 100),
    inputs.productivityBase * (inputs.offchatPct / 100),
    inputs.productivityBase * (inputs.meetingsPct / 100),
    (() => {
      if (inputs.useTenureVacation && inputs.agentsWithTenure > 0) {
        const tenureVacationPct = computeTenureVacationPct(inputs.agentsWithTenure, inputs.headcountCurrent);
        return inputs.productivityBase * tenureVacationPct;
      }
      return inputs.productivityBase * ((inputs.vacationPct / 100) * (inputs.vacationEligiblePct / 100));
    })(),
  ];
  const totalLoss = shrinkageLosses.reduce((a, b) => a + b, 0);

  const shrinkageData = [
    {
      name: "Prod. nominal",
      value: inputs.productivityBase,
      fill: "hsl(var(--chart-neutral))",
      isBase: true,
    },
    {
      name: "Pausas",
      value: -shrinkageLosses[0],
      fill: "hsl(var(--chart-warning))",
    },
    {
      name: "Offchat",
      value: -shrinkageLosses[1],
      fill: "hsl(var(--chart-warning))",
    },
    {
      name: "Reuniões",
      value: -shrinkageLosses[2],
      fill: "hsl(var(--chart-warning))",
    },
    {
      name: "Férias",
      value: -shrinkageLosses[3],
      fill: "hsl(var(--chart-danger))",
    },
    {
      name: "Cap. efetivo",
      value: capacityPerAgent,
      fill: "hsl(var(--chart-success))",
      isBase: true,
    },
  ];

  // Tooltip for shrinkage
  const ShrinkageTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    const val = payload[0].value;
    const isNeg = val < 0;
    return (
      <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
        <p className="font-medium">{label}</p>
        <p className={isNeg ? "text-warning" : "text-success"}>
          {isNeg ? `−${formatDecimal(Math.abs(val), 0)}` : formatDecimal(val, 0)}
        </p>
        {isNeg && inputs.productivityBase > 0 && (
          <p className="text-muted-foreground mt-0.5">
            Perda de {formatDecimal((Math.abs(val) / inputs.productivityBase) * 100, 1)}% da prod. nominal
          </p>
        )}
      </div>
    );
  };

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Evolução de volume" subtitle="Volume bruto, IA e humano ao longo do período">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip formatter={(v: number) => formatInt(v)} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Line type="monotone" dataKey="volumeBruto" stroke="hsl(var(--chart-info))" strokeWidth={2} dot={false} name="Volume bruto" />
            <Line type="monotone" dataKey="volumeIA" stroke="hsl(var(--chart-success))" strokeWidth={2} dot={false} name="Volume IA" />
            <Line type="monotone" dataKey="volumeHumano" stroke="hsl(var(--chart-danger))" strokeWidth={2} dot={false} name="Volume humano" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Evolução de headcount" subtitle={`Agentes necessários, HC efetivo (rampa ${inputs.rampUpMonths} meses) e gap mensal`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartRows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip formatter={(v: number) => formatInt(v)} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Bar dataKey="agentesNecessarios" fill="hsl(var(--chart-info))" radius={[4, 4, 0, 0]} name="Agentes necessários" />
            <Bar dataKey="hcDisponivel" fill="hsl(var(--chart-success))" radius={[4, 4, 0, 0]} name="HC efetivo" />
            <Line type="monotone" dataKey="gap" stroke="hsl(var(--chart-danger))" strokeWidth={2} dot={false} name="Gap" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Impacto da IA" subtitle="Quanto da demanda total é absorvida antes do atendimento humano">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartRows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip formatter={(v: number) => formatInt(v)} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Area type="monotone" dataKey="volumeIA" stackId="1" stroke="hsl(var(--chart-success))" fill="hsl(var(--chart-success) / 0.35)" name="Volume IA" />
            <Area type="monotone" dataKey="volumeHumano" stackId="1" stroke="hsl(var(--chart-danger))" fill="hsl(var(--chart-danger) / 0.25)" name="Volume humano" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Capacity x shrinkage"
        subtitle={`Perdas totais: −${formatDecimal(totalLoss, 0)} (${inputs.productivityBase > 0 ? formatDecimal((totalLoss / inputs.productivityBase) * 100, 1) : "0"}% da prod. nominal)`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={shrinkageData} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip content={<ShrinkageTooltip />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {shrinkageData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList content={<ShrinkageLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
};
