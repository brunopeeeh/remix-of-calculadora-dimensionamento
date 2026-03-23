import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart,
  Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ChartCard } from "./ChartCard";
import { formatInt, formatDecimal } from "@/features/ops-planning/format";
import { MonthlyProjection, PlannerInputs } from "@/features/ops-planning/types";

interface ChartsSectionProps {
  rows: MonthlyProjection[];
  inputs: PlannerInputs;
  capacityPerAgent: number;
}

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

  const shrinkageData = [
    { name: "Prod. nominal", value: inputs.productivityBase, fill: "hsl(var(--chart-neutral))" },
    { name: "Pausas", value: -inputs.productivityBase * (inputs.breaksPct / 100), fill: "hsl(var(--chart-warning))" },
    { name: "Offchat", value: -inputs.productivityBase * (inputs.offchatPct / 100), fill: "hsl(var(--chart-warning))" },
    { name: "Reuniões", value: -inputs.productivityBase * (inputs.meetingsPct / 100), fill: "hsl(var(--chart-warning))" },
    { name: "Férias", value: -inputs.productivityBase * ((inputs.vacationPct / 100) * (inputs.vacationEligiblePct / 100)), fill: "hsl(var(--chart-danger))" },
    { name: "Cap. efetivo", value: capacityPerAgent, fill: "hsl(var(--chart-success))" },
  ];

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

      <ChartCard title="Capacity x shrinkage" subtitle="Composição de perdas até chegar na capacidade efetiva final">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={shrinkageData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip formatter={(v: number) => formatDecimal(v, 0)} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
};
