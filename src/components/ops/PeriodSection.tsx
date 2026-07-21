import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { monthNames } from "@/features/ops-planning/format";
import { PlannerInputs } from "@/features/ops-planning/types";
import { BASE_YEAR } from "@/features/ops-planning/scenarios";

interface PeriodSectionProps {
  inputs: PlannerInputs;
  patch: <K extends keyof PlannerInputs>(key: K, value: PlannerInputs[K]) => void;
}

export const PeriodSection = ({ inputs, patch }: PeriodSectionProps) => (
  <AccordionItem value="period" className="ops-panel border-b-0">
    <AccordionTrigger className="px-4 py-3 hover:no-underline">
      <div className="text-left">
        <h3 className="heading-tight text-sm font-semibold">Período de análise</h3>
        <p className="mt-1 text-xs text-muted-foreground">Mês e ano inicial/final da projeção</p>
      </div>
    </AccordionTrigger>
    <AccordionContent className="px-4 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor="start-month-select" className="text-xs font-medium">Mês inicial</label>
          <Select
            value={String(inputs.startMonth)}
            onValueChange={(v) => {
              const newStart = Number(v);
              patch("startMonth", newStart);
              if (newStart > inputs.endMonth && inputs.startYear === inputs.endYear) {
                patch("endMonth", Math.min(newStart + 1, 12));
              }
            }}
          >
            <SelectTrigger id="start-month-select" aria-label="Mês inicial" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, idx) => (
                <SelectItem key={name} value={String(idx + 1)} className="text-xs">{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label htmlFor="end-month-select" className="text-xs font-medium">Mês final</label>
          <Select
            value={String(inputs.endMonth)}
            onValueChange={(v) => {
              const newEnd = Number(v);
              if (newEnd < inputs.startMonth && inputs.endYear === inputs.startYear) {
                patch("startMonth", Math.max(newEnd - 1, 1));
              }
              patch("endMonth", newEnd);
            }}
          >
            <SelectTrigger id="end-month-select" aria-label="Mês final" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, idx) => (
                <SelectItem key={name} value={String(idx + 1)} className="text-xs">{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor="start-year-select" className="text-xs font-medium">Ano inicial</label>
          <Select
            value={String(inputs.startYear)}
            onValueChange={(v) => {
              const newStartYear = Number(v);
              patch("startYear", newStartYear);
              if (newStartYear > inputs.endYear) {
                patch("endYear", newStartYear);
              }
            }}
          >
            <SelectTrigger id="start-year-select" aria-label="Ano inicial" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => BASE_YEAR + i).map((year) => (
                <SelectItem key={year} value={String(year)} className="text-xs">{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label htmlFor="end-year-select" className="text-xs font-medium">Ano final</label>
          <Select
            value={String(inputs.endYear)}
            onValueChange={(v) => {
              const newEndYear = Number(v);
              patch("endYear", newEndYear);
              if (newEndYear < inputs.startYear) {
                patch("startYear", newEndYear);
              }
            }}
          >
            <SelectTrigger id="end-year-select" aria-label="Ano final" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => BASE_YEAR + i).map((year) => (
                <SelectItem key={year} value={String(year)} className="text-xs">{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </AccordionContent>
  </AccordionItem>
);
