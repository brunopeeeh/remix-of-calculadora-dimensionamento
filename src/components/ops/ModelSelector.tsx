import { BrainCircuit, AlertTriangle } from "lucide-react";

interface ModelSelectorProps {
  activeModel: "qwen" | "gemini";
  setActiveModel: (model: "qwen" | "gemini") => void;
  qwenKey: string;
  geminiKey: string;
}

export const ModelSelector = ({ activeModel, setActiveModel, qwenKey, geminiKey }: ModelSelectorProps) => {
  const currentKey = activeModel === "qwen" ? qwenKey : geminiKey;

  return (
    <div className="glass-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
          <BrainCircuit className="h-4 w-4 text-primary" />
          Modelo Cognitivo de Auditoria
        </h4>
        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
          DashScope/Google API
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveModel("qwen")}
          disabled={!qwenKey}
          className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-200 ${
            activeModel === "qwen"
              ? "border-primary bg-primary/5 text-primary shadow-sm"
              : "border-border hover:bg-muted/40 text-muted-foreground"
          } ${!qwenKey && "opacity-50 cursor-not-allowed"}`}
        >
          <span className="text-xs font-bold">Qwen 3.7 Max</span>
          <span className="text-[9px] mt-1 opacity-80">Raciocínio Avançado</span>
        </button>
        <button
          onClick={() => setActiveModel("gemini")}
          disabled={!geminiKey}
          className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-200 ${
            activeModel === "gemini"
              ? "border-primary bg-primary/5 text-primary shadow-sm"
              : "border-border hover:bg-muted/40 text-muted-foreground"
          } ${!geminiKey && "opacity-50 cursor-not-allowed"}`}
        >
          <span className="text-xs font-bold">Gemini 2.5 Flash</span>
          <span className="text-[9px] mt-1 opacity-80">Velocidade & Leveza</span>
        </button>
      </div>

      {!currentKey && (
        <div className="p-3 bg-warning/15 border border-warning/30 rounded-lg flex gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-[10px] text-warning-foreground leading-relaxed">
            Configure <code className="bg-muted px-1 rounded font-mono font-bold">VITE_DASHSCOPE_API_KEY</code> no seu arquivo <code className="bg-muted px-1 rounded font-mono font-bold">.env</code> para habilitar o modelo **Qwen 3.7 Max**.
          </p>
        </div>
      )}
    </div>
  );
};
