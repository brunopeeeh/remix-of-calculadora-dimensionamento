import { KPIWidget } from "./KPIWidget";
import { formatInt } from "@/features/ops-planning/format";
import { ProjectionSummary, PlannerInputs } from "@/features/ops-planning/types";
import { ReactNode } from "react";
import {
  TrendingUp,
  BarChart2,
  Zap,
  UserCheck,
  UserPlus,
  UserMinus,
} from "lucide-react";

interface KPISectionProps {
  summary: ProjectionSummary;
  inputs: PlannerInputs;
  hiringAction?: ReactNode;
}

export const KPISection = ({ summary, inputs, hiringAction }: KPISectionProps) => {
  const clientGrowth = inputs.targetClientsQ4 - inputs.currentClients;
  const clientGrowthPct = inputs.currentClients > 0
    ? ((clientGrowth / inputs.currentClients) * 100).toFixed(0)
    : "0";

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KPIWidget
        index={0}
        icon={TrendingUp}
        title="Escala de Clientes"
        subtitle={`Crescimento planejado de +${clientGrowthPct}%`}
        tooltip="Quantidade de clientes ativos na base: Inicial → Meta final do período"
        value={`${formatInt(inputs.currentClients)} → ${formatInt(inputs.targetClientsQ4)}`}
      />

      <KPIWidget
        index={1}
        icon={BarChart2}
        title="Carga de Atendimento"
        subtitle="Volume bruto vs. volume humano"
        tooltip="Volume bruto projetado vs. chamados remanescentes direcionados para atendimento humano no final do período"
        value={`${formatInt(summary.volumeQ4)} → ${formatInt(summary.volumeHumanQ4)}`}
      />

      <KPIWidget
        index={2}
        icon={Zap}
        title="Capacidade p/ Agente"
        subtitle="Chamados/mês após shrinkage"
        tooltip="Capacidade mensal líquida de atendimento por agente considerando shrinkage (folhas, pausas, reuniões, etc.)"
        value={summary.capacityPerAgent}
        format={(v) => formatInt(v)}
        tone={summary.capacityPerAgent > 700 ? "success" : "default"}
      />

      <KPIWidget
        index={3}
        icon={UserCheck}
        title="Demanda de Agentes Q4"
        subtitle={`Demanda: ${formatInt(summary.agentsNeededQ4)} | Planejado: ${formatInt(summary.hcFinalQ4)}`}
        tooltip="Total de agentes necessários ativos em produção no final da linha de projeção vs. o headcount efetivamente planejado"
        value={summary.agentsNeededQ4}
        format={(v) => formatInt(v)}
        tone={summary.riskMonths.length > 0 ? "risk" : "default"}
      />

      <KPIWidget
        index={4}
        icon={UserMinus}
        title="Turnover Projetado"
        subtitle={`${inputs.turnoverValue}${inputs.turnoverInputMode === "percentual" ? "%" : " abs"}/${inputs.turnoverPeriod}`}
        tooltip="Total de saídas estimadas ao longo do período projetado com base nas regras de turnover ativas"
        value={summary.totalTurnoverYear > 0 ? `${formatInt(summary.totalTurnoverYear)} saídas` : "Zero saídas"}
        tone={summary.totalTurnoverYear > 0 ? "default" : "success"}
      />

      <KPIWidget
        index={5}
        icon={UserPlus}
        title="Plano de Admissões"
        subtitle={summary.riskMonths.length > 0 ? `Mês crítico: ${summary.criticalOpenMonth}` : "Nenhuma vaga adicional"}
        tooltip="Total de novas admissões necessárias ao longo do plano e o mês limite para abertura das vagas"
        value={summary.riskMonths.length > 0 ? `${formatInt(summary.hiresYear)} admissões` : "Headcount OK"}
        tone={summary.riskMonths.length > 0 ? "risk" : "success"}
        action={hiringAction}
        isProminent
      />
    </section>
  );
};

