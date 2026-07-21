import { useState } from "react";
import { Bot, Check, Copy, Download, BrainCircuit, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportViewerProps {
  report: string;
  isLoading: boolean;
  activeModel: "qwen" | "gemini";
}

export const ReportViewer = ({ report, isLoading, activeModel }: ReportViewerProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // silently fail
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const element = document.createElement("a");
    const file = new Blob([report], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = `auditoria_operacional_${activeModel}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="glass-panel flex-1 flex flex-col overflow-hidden min-h-[250px]">
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">
            Relatório de Auditoria Operacional
          </h3>
        </div>
        {report && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 text-xs gap-1 hover:bg-primary/10"
            >
              {isCopied ? (
                <>
                  <Check className="h-3 w-3 text-success animate-in zoom-in-50" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-muted-foreground" />
                  Copiar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-7 text-xs gap-1 hover:bg-primary/10"
            >
              <Download className="h-3 w-3 text-muted-foreground" />
              Salvar (.md)
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 select-text">
        {isLoading && !report ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="text-sm font-semibold text-foreground">
              {activeModel === "qwen" ? "Qwen 3.7 Max raciocinando..." : "Gemini 2.5 Flash analisando..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Processando dados de capacidade operacional, rampa de treinamento, TMA e turnover...
            </p>
          </div>
        ) : report ? (
          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap font-sans text-foreground leading-relaxed">
            {report}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
            <BrainCircuit className="h-12 w-12 opacity-30 mb-4 text-primary animate-pulse" />
            <h4 className="text-sm font-medium text-foreground">Relatório Não Gerado</h4>
            <p className="text-xs max-w-sm mt-2 leading-relaxed">
              Selecione um modelo de IA à esquerda e escolha um dos modelos de auditoria rápida para iniciar a análise operacional do seu cenário de dimensionamento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
