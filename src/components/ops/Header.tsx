import { Eraser, RotateCcw, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScenarioSelector } from "./ScenarioSelector";
import { ScenarioKey } from "@/features/ops-planning/types";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HeaderProps {
  scenario: ScenarioKey;
  onScenarioChange: (scenario: ScenarioKey) => void;
  onReset: () => void;
  onClearAll: () => void;
  periodLabel: string;
}

const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() =>
    localStorage.getItem("theme") === "dark" ||
    (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v) };
};

export const Header = ({ scenario, onScenarioChange, onReset, onClearAll, periodLabel }: HeaderProps) => {
  const { isDark, toggle } = useDarkMode();

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <div>
          <h1 className="heading-tight text-lg font-semibold">Calculadora de Dimensionamento</h1>
          <p className="text-xs text-muted-foreground">Planejamento de demanda, capacity e hiring mês a mês</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ScenarioSelector value={scenario} onChange={onScenarioChange} />

          <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar premissas padrão
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Eraser className="h-3.5 w-3.5" />
                Zerar todos os dados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deseja zerar todos os dados?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação limpa as premissas preenchidas e volta os campos para um estado vazio.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAll}>Sim, zerar dados</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Dark mode toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={toggle}
                className="h-8 w-8 shrink-0"
                aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isDark ? "Modo claro" : "Modo escuro"}
            </TooltipContent>
          </Tooltip>

          <span className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse-soft" /> Atualização automática
          </span>
          <span className="rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground">{periodLabel}</span>
        </div>
      </div>
    </header>
  );
};
