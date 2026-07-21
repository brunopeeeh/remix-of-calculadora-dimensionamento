import { Eraser, Moon, Sun, BarChart3, ClipboardCheck, Table2, Sparkles, PanelLeftClose, PanelLeft } from "lucide-react";
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
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onClearAll: () => void;
  periodLabel: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasHiringPlan: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (!stored) return true;
      return stored === "dark";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      try { localStorage.setItem("theme", "dark"); } catch { /* noop */ }
    } else {
      root.classList.remove("dark");
      try { localStorage.setItem("theme", "light"); } catch { /* noop */ }
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v) };
};

const tabs = [
  { value: "overview", label: "Visão geral", shortLabel: "Visão", icon: BarChart3 },
  { value: "hiring", label: "Plano", shortLabel: "Ação", icon: ClipboardCheck, needsHiring: true },
  { value: "details", label: "Detalhes", shortLabel: "Tabela", icon: Table2 },
  { value: "ai", label: "IA", shortLabel: "IA", icon: Sparkles },
];

export const Header = ({
  onClearAll,
  periodLabel,
  activeTab,
  onTabChange,
  hasHiringPlan,
  sidebarCollapsed,
  onToggleSidebar,
}: HeaderProps) => {
  const { isDark, toggle } = useDarkMode();

  return (
    <header className="glass-header sticky top-0 z-20">
      <div className="flex items-center gap-3 px-3 py-2.5 lg:px-5">
        {/* Sidebar toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="h-8 w-8 shrink-0 rounded-lg hover:bg-primary/10"
              aria-label={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {sidebarCollapsed ? "Expandir painel" : "Recolher painel"}
          </TooltipContent>
        </Tooltip>

        {/* Logo / Title */}
        <div className="min-w-0 shrink-0">
          <h1 className="heading-tight text-sm font-bold tracking-tight sm:text-base truncate">
            Dimensionamento
          </h1>
        </div>

        {/* ══ Navigation Tabs — Center ══ */}
        <nav className="flex flex-1 items-center justify-center">
          <div className="inline-flex items-center rounded-xl border border-border/50 bg-muted/30 p-1 backdrop-blur-sm">
            {tabs.map((tab) => {
              const isDisabled = tab.needsHiring && !hasHiringPlan;
              const isActive = activeTab === tab.value;
              const Icon = tab.icon;

              return (
                <Tooltip key={tab.value}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => !isDisabled && onTabChange(tab.value)}
                      disabled={isDisabled}
                      className={cn(
                        "relative inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                        isDisabled && "cursor-not-allowed opacity-30"
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", isActive && "text-primary-foreground")} />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                    </button>
                  </TooltipTrigger>
                  {isDisabled && (
                    <TooltipContent side="bottom" className="text-xs">
                      Disponível quando há gap de headcount detectado
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </nav>

        {/* ══ Right Actions ══ */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Period label */}
          <span className="hidden rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm lg:inline">
            {periodLabel}
          </span>

          {/* Clear data */}
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                    <Eraser className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zerar todos os dados</TooltipContent>
            </Tooltip>
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
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="h-8 w-8 shrink-0 rounded-lg hover:bg-warning/10"
                aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
              >
                {isDark ? <Sun className="h-3.5 w-3.5 text-warning" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isDark ? "Modo claro" : "Modo escuro"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};
