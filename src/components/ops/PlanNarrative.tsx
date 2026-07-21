import { MonthlyProjection } from "@/features/ops-planning/types";
import { formatInt } from "@/features/ops-planning/format";
import { BookOpen } from "lucide-react";

interface PlanNarrativeProps {
  rows: MonthlyProjection[];
  leadTimeMonths: number;
  rampUpMonths: number;
}

const generateNarrative = (
  rows: MonthlyProjection[],
  leadTimeMonths: number,
  rampUpMonths: number,
): string[] => {
  const totalHires = rows.reduce((acc, r) => acc + r.hiresOpened, 0);
  const riskRows = rows.filter((r) => r.gap > 0);
  const peakGapRow = riskRows.length > 0
    ? riskRows.reduce((max, r) => (r.gap > max.gap ? r : max), riskRows[0])
    : null;
  const firstOpenRow = rows.find((r) => r.hiresOpened > 0);
  const firstMonth = rows[0]?.month.label ?? "—";
  const lastMonth = rows[rows.length - 1]?.month.label ?? "—";

  const sentences: string[] = [];

  // Opening
  sentences.push(
    `No período de ${firstMonth} a ${lastMonth}, sua operação precisará de **${formatInt(totalHires)} contratação(ões)** para cobrir os gaps de capacidade projetados.`,
  );

  // Risk months
  if (riskRows.length > 0) {
    sentences.push(
      `Foram identificados **${riskRows.length} mês(es) com deficit** de agentes.`,
    );
  }

  // Peak gap
  if (peakGapRow) {
    sentences.push(
      `O pico de gap ocorre em **${peakGapRow.month.label}** com deficit de **${formatInt(peakGapRow.gap)} agente(s)**.`,
    );
  }

  // First action
  if (firstOpenRow) {
    const targetLabel = firstOpenRow.targetImpactLabel;
    sentences.push(
      `A primeira ação de abertura de vaga deve ocorrer em **${firstOpenRow.month.label}**` +
        (targetLabel && targetLabel !== "Fora do período"
          ? `, garantindo maturação completa até **${targetLabel}**.`
          : `.`),
    );
  }

  // Timeline context
  sentences.push(
    `Cada nova contratação requer **${leadTimeMonths} mês(es) de lead time** + **${rampUpMonths} mês(es) de ramp-up** para atingir produtividade plena.`,
  );

  return sentences;
};

export const PlanNarrative = ({ rows, leadTimeMonths, rampUpMonths }: PlanNarrativeProps) => {
  const sentences = generateNarrative(rows, leadTimeMonths, rampUpMonths);

  return (
    <div className="ops-panel border-info/30 bg-info/5 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <div className="space-y-1 text-sm leading-relaxed text-foreground/90">
          {sentences.map((s, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: s.replace(/\*\*(.*?)\*\*/g, "<strong class='text-foreground'>$1</strong>") }} />
          ))}
        </div>
      </div>
    </div>
  );
};
