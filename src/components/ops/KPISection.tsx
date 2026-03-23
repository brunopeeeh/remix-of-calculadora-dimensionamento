import { KPIWidget } from "./KPIWidget";
import { formatInt } from "@/features/ops-planning/format";
import { ProjectionSummary, PlannerInputs } from "@/features/ops-planning/types";

interface KPISectionProps {
  summary: ProjectionSummary;
  rampUpMonths: number;
}

export const KPISection = ({ summary, rampUpMonths }: KPISectionProps) => {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <KPIWidget
        title="Volume bruto em Q4"
        subtitle="Chamados totais projetados no fim do período"
        tooltip="Volume bruto = Base de clientes do mês x Contact rate"
        value={summary.volumeQ4}
        format={(v) => formatInt(v)}
      />
      <KPIWidget
        title="Volume humano em Q4"
        subtitle="Carga que chega ao atendimento humano"
        tooltip="Volume humano = Volume bruto - Volume IA"
        value={summary.volumeHumanQ4}
        format={(v) => formatInt(v)}
      />
      <KPIWidget
        title="Capacity efetivo por agente"
        subtitle="Capacidade mensal após shrinkage"
        tooltip="Produtividade base x (1-pausas) x (1-offchat) x (1-reuniões) x (1-férias ajustadas)"
        value={summary.capacityPerAgent}
        format={(v) => formatInt(v)}
        tone={summary.capacityPerAgent > 700 ? "success" : "default"}
      />
      <KPIWidget
        title="Agentes necessários em Q4"
        subtitle="Headcount necessário no cenário atual"
        tooltip="Agentes necessários (raw) = Volume humano / Capacidade efetiva; valor exibido = teto(raw)"
        value={summary.agentsNeededQ4}
        format={(v) => formatInt(v)}
        tone={summary.riskMonths.length > 0 ? "risk" : "default"}
      />
      <KPIWidget
        title="Admissões no ano"
        subtitle="Crescimento + reposição por turnover"
        tooltip="Soma mensal das contratações para fechar gap"
        value={summary.hiresYear}
        format={(v) => formatInt(v)}
      />
      <KPIWidget
        title="Mês crítico para abrir vaga"
        subtitle="Último mês para contratação sem atraso operacional"
        tooltip={`Mês da necessidade - lead time - maturação da rampa (ramp-up ${rampUpMonths} meses)`}
        value={summary.criticalOpenMonth}
        tone={summary.riskMonths.length > 0 ? "risk" : "success"}
      />
    </section>
  );
};
