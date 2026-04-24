import { useState, useRef, useEffect } from "react";
import { MonthlyProjection, PlannerInputs, ProjectionResult } from "./types";
import { formatInt, formatDecimal } from "./format";
import { Sparkles, Send, User, Bot, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askGemini, askOpenRouter } from "@/lib/ai";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface MetricAnalyzerProps {
  projection: ProjectionResult;
  inputs: PlannerInputs;
}

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string || "";

const generateSystemPrompt = (projection: ProjectionResult, inputs: PlannerInputs): string => {
  const summary = projection.summary;
  const rows = projection.rows;

  const riskMonths = rows.filter(r => r.gap > 0);
  const peakMonth = riskMonths.length > 0
    ? riskMonths.reduce((max, r) => r.gap > max.gap ? r : max)
    : null;

  const avgCapacityPerAgent = rows.length > 0
    ? rows.reduce((sum, r) => sum + r.capacityPerAgent, 0) / rows.length
    : 0;

  const totalHires = rows.reduce((sum, r) => sum + r.hiresStarted, 0);
  const totalTurnover = rows.reduce((sum, r) => sum + r.turnoverAppliedStart + r.turnoverAppliedEnd, 0);

  return `Você é um consultor especialista em operações de contact center e planejamento de workforce.

Você analisa dados de dimensionamento de equipe e fornece insights acionáveis em português brasileiro.

## Dados do Cenário Atual

**Inputs:**
- Clientes atuais: ${formatInt(inputs.currentClients)}
- Meta clientes Q4: ${formatInt(inputs.targetClientsQ4)}
- Volume atual: ${formatInt(inputs.currentVolume)}
- Taxa de contato: ${formatDecimal(inputs.contactRate, 2)}
- Headcount atual: ${inputs.headcountCurrent}
- Produtividade base: ${formatInt(inputs.productivityBase)}/agente/mês
- Cobertura IA atual: ${formatDecimal(inputs.aiCoveragePct, 1)}%
- Turnover: ${inputs.turnoverValue}${inputs.turnoverInputMode === 'percentual' ? '%' : ' agentes'}/${inputs.turnoverPeriod}

**Resultados:**
- Capacidade por agente: ${formatInt(avgCapacityPerAgent)}/mês
- Total de admissões no ano: ${formatInt(totalHires)}
- Total de turnover no ano: ${formatInt(totalTurnover)}
- Meses com gap: ${riskMonths.length}
${peakMonth ? `- Pico de gap: ${formatInt(peakMonth.gap)} agentes em ${peakMonth.month.label}` : '- Sem gap identificado'}

## Dados Mensais (últimos 3 meses):
${rows.slice(-3).map(r => `
- ${r.month.label}: Demanda ${formatInt(r.volumeHuman)}, HC Efetivo ${formatInt(r.hcAvailableEffective)}, Gap ${formatInt(r.gap)}
`).join('')}

## Suas Diretivas:
1. Responda SEMPRE em português brasileiro
2. Seja conciso mas informativo
3. Forneça recomendações específicas e acionáveis
4. Quando apropriado, sugira números específicos baseados nos dados
5. Se houver gap, sugira quando e quantos contratar
6. Considere turnover, lead time e ramp-up nas recomendações
7. Formate a resposta com markdown quando apropriado (listas, negrito)
8. Se os dados indicarem problema, seja direto sobre isso`;
};

export const MetricAnalyzer = ({ projection, inputs }: MetricAnalyzerProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeWithAI = async (userMessage: string) => {
    if (!API_KEY) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Configure a variável de ambiente `VITE_OPENROUTER_API_KEY` no arquivo .env para usar o assistente de IA.",
        timestamp: new Date()
      }]);
      return;
    }

    const userMsg: Message = { role: "user", content: userMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const loadingMsg: Message = { role: "assistant", content: "🤔 Analisando os dados...", timestamp: new Date() };
    setMessages(prev => [...prev, loadingMsg]);

    try {
      const systemPrompt = generateSystemPrompt(projection, inputs);
      const aiResponse = await askOpenRouter(userMessage, systemPrompt);

      setMessages(prev => prev.map((msg, i) =>
        i === prev.length - 1
          ? { ...msg, content: aiResponse }
          : msg
      ));
    } catch (error) {
      setMessages(prev => prev.map((msg, i) =>
        i === prev.length - 1
          ? { ...msg, content: `❌ Erro: ${error instanceof Error ? error.message : "Falha na comunicação com a API"}` }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const quickAnalysis = () => {
    analyzeWithAI("Faça uma análise completa do plano de staffing: quais são os principais riscos, gargalos e recomendações prioritárias?");
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Assistente de IA</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={quickAnalysis} className="text-xs h-7" disabled={!API_KEY}>
            <Sparkles className="h-3 w-3 mr-1" />
            Análise rápida
          </Button>
        </div>
      </div>

      {!API_KEY && (
        <div className="border-b p-4 bg-destructive/10 text-center">
          <p className="text-xs text-destructive">
            Configure <code className="bg-muted px-1 rounded">VITE_OPENROUTER_API_KEY</code> no arquivo <code className="bg-muted px-1 rounded">.env</code> para usar o assistente
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Assistente de Análise</p>
            <p className="text-xs mt-1">Pergunte sobre os dados do planner ou clique em "Análise rápida"</p>
            <div className="mt-4 space-y-2 text-left max-w-sm mx-auto">
              <button
                onClick={() => analyzeWithAI("Explique por que temos gap de headcount e quando devemos começar a contratar.")}
                className="block w-full text-left text-xs p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                "Por que temos gap e quando devemos contratar?"
              </button>
              <button
                onClick={() => analyzeWithAI("A produtividade atual de X por agente está adequada? O que podemos melhorar?")}
                className="block w-full text-left text-xs p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                "A produtividade está adequada?"
              </button>
              <button
                onClick={() => analyzeWithAI("Analise o impacto do turnover no planejamento e sugira mitigações.")}
                className="block w-full text-left text-xs p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                "Impacto do turnover e mitigações"
              </button>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
            {message.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div
              className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
            {message.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              analyzeWithAI(input.trim());
            }
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre os dados..."
            disabled={isLoading}
            className="flex-1 text-sm h-9"
          />
          <Button type="submit" size="sm" disabled={!input.trim() || isLoading} className="h-9 px-3">
            <Send className="h-4 w-4" />
          </Button>
          {messages.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clearMessages} className="h-9 px-2">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
};