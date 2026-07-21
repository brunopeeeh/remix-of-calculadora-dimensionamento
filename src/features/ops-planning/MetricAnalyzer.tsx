import { useState, useRef, useEffect } from "react";
import { MonthlyProjection, PlannerInputs, ProjectionResult } from "./types";
import { formatInt, formatDecimal } from "./format";
import { generateSystemPrompt } from "./prompts";
import { 
  Sparkles, 
  Send, 
  User, 
  Bot, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  BrainCircuit, 
  Scale, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  Printer,
  FileText,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  HelpCircle,
  X,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askGemini, askQwen } from "@/lib/ai";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface MetricAnalyzerProps {
  projection: ProjectionResult;
  inputs: PlannerInputs;
}

const geminiKey = import.meta.env.VITE_GEMINI_API_KEY as string || "";
const qwenKey = import.meta.env.VITE_DASHSCOPE_API_KEY as string || "";

// --- MARKDOWN EXECUTIVE PARSER ---
interface MarkdownBlock {
  type: "heading" | "list" | "table" | "quote" | "paragraph";
  content: string | string[];
}

const parseMarkdownToBlocks = (text: string): MarkdownBlock[] => {
  const lines = text.split("\n");
  const blocks: MarkdownBlock[] = [];
  let currentTable: string[] = [];
  let currentList: string[] = [];
  let currentQuote: string[] = [];

  const flushTable = () => {
    if (currentTable.length > 0) {
      blocks.push({ type: "table", content: [...currentTable] });
      currentTable = [];
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: "list", content: [...currentList] });
      currentList = [];
    }
  };

  const flushQuote = () => {
    if (currentQuote.length > 0) {
      blocks.push({ type: "quote", content: [...currentQuote] });
      currentQuote = [];
    }
  };

  const flushAll = () => {
    flushTable();
    flushList();
    flushQuote();
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Table detection
    if (trimmed.startsWith("|")) {
      flushList();
      flushQuote();
      currentTable.push(line);
      continue;
    }

    // Bullet list detection
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || /^\d+\.\s/.test(trimmed)) {
      flushTable();
      flushQuote();
      currentList.push(line);
      continue;
    }

    // Quote/Callout detection
    if (trimmed.startsWith(">")) {
      flushTable();
      flushList();
      currentQuote.push(line);
      continue;
    }

    // Plain space or headers or standard paragraph
    if (trimmed === "") {
      flushAll();
      continue;
    }

    if (trimmed.startsWith("#")) {
      flushAll();
      blocks.push({ type: "heading", content: line });
    } else {
      // If we are already building a list or quote or table, don't flush it instantly if it's just a wrapped line
      if (currentList.length > 0 && !trimmed.startsWith("* ") && !trimmed.startsWith("- ")) {
        currentList.push(line);
      } else if (currentQuote.length > 0 && trimmed.startsWith(">")) {
        currentQuote.push(line);
      } else {
        flushAll();
        blocks.push({ type: "paragraph", content: line });
      }
    }
  }

  flushAll();
  return blocks;
};

// Sub-component to render text with markdown strong tags (**bold**)
const FormattedText = ({ text }: { text: string }) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="font-bold text-foreground">{part}</strong>;
        }
        return part;
      })}
    </>
  );
};

// Highly styled executive component to render the parsed markdown blocks
const ExecutiveReportRenderer = ({ text, engine }: { text: string; engine: "qwen" | "gemini" }) => {
  const blocks = parseMarkdownToBlocks(text);
  const genDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div id="print-report-area" className="flex flex-col gap-6 font-sans antialiased text-foreground select-text max-w-4xl mx-auto py-2">
      {/* CSS injected specifically for print routing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-report-area, #print-report-area * {
            visibility: visible;
          }
          #print-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          h2 {
            page-break-before: always;
            margin-top: 30px !important;
          }
          h2:first-of-type {
            page-break-before: avoid;
            margin-top: 10px !important;
          }
        }
      `}</style>

      {/* EXECUTIVE BANNER HEADER */}
      <div className="border border-border/80 bg-muted/20 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-l-primary">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-[10px] tracking-widest uppercase">
            <ShieldAlert className="h-3.5 w-3.5" />
            Relatório Confidencial de Staffing
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
            Auditoria Operacional & Planejamento
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Gerado em: {genDate}
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <span className="flex items-center gap-1 font-medium text-foreground/80">
              <Bot className="h-3.5 w-3.5 text-primary" />
              Motor: {engine === "qwen" ? "Qwen 3.7 Max (Alibaba)" : "Gemini 2.5 Flash (Google)"}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
            Revisão Executiva
          </span>
          <div className="text-[9px] text-muted-foreground mt-1.5 font-mono">
            REF-OPS: #{Math.floor(100000 + Math.random() * 900000)}
          </div>
        </div>
      </div>

      {/* BLOCKS RENDERER */}
      <div className="flex flex-col gap-4 text-sm leading-relaxed">
        {blocks.map((block, index) => {
          switch (block.type) {
            case "heading": {
              const headingText = block.content as string;
              const cleanHeading = headingText.replace(/^#+\s*/, "");
              const level = (headingText.match(/^#+/) || [""])[0].length;

              if (level === 1) {
                // If it's a level 1 heading and we already have the main executive banner, bypass or style elegantly
                return null;
              } else if (level === 2) {
                return (
                  <h3 key={index} className="text-base font-bold text-foreground tracking-wider uppercase border-b pb-2 mt-8 mb-3 border-border flex items-center gap-2">
                    <span className="h-4 w-1 bg-primary rounded-full"></span>
                    {cleanHeading}
                  </h3>
                );
              } else {
                return (
                  <h4 key={index} className="text-sm font-semibold text-primary tracking-wide mt-5 mb-2">
                    {cleanHeading}
                  </h4>
                );
              }
            }

            case "list": {
              const listLines = block.content as string[];
              return (
                <ul key={index} className="space-y-3 my-2.5 pl-1.5">
                  {listLines.map((line, lIdx) => {
                    // strip bullet points (*, -) or numbers (1., 2.)
                    const cleanLine = line.replace(/^[*-\d+.]\s*/, "").trim();
                    
                    return (
                      <li key={lIdx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-primary/80 shrink-0 mt-0.5" />
                        <span className="text-foreground/90 text-[13px] leading-relaxed">
                          <FormattedText text={cleanLine} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              );
            }

            case "table": {
              const tableLines = block.content as string[];
              // Filter out dividing dashes like |---|---|
              const filteredRows = tableLines.filter(line => !/^[|-\s]+$/.test(line.replace(/[^|-]/g, "")));
              
              if (filteredRows.length === 0) return null;

              // Parse headers
              const headers = filteredRows[0]
                .split("|")
                .map(h => h.trim())
                .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

              // Parse body rows
              const rows = filteredRows.slice(1).map(rowLine => {
                return rowLine
                  .split("|")
                  .map(cell => cell.trim())
                  .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
              });

              return (
                <div key={index} className="overflow-x-auto my-5 border border-border/80 rounded-xl shadow-sm bg-card/50">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted border-b border-border">
                        {headers.map((h, hIdx) => (
                          <th key={hIdx} className="p-3 font-semibold text-foreground/80 tracking-wide uppercase text-[10px]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-3 text-[11.5px] text-foreground/90 leading-normal font-medium">
                              <FormattedText text={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            case "quote": {
              const quoteLines = block.content as string[];
              const fullQuote = quoteLines.map(l => l.replace(/^>\s*/, "")).join("\n");
              
              // Custom Alert boxes styling based on keywords
              const isWarning = /critico|risco|atencao|erro|danger|warning/i.test(fullQuote);
              const isSuccess = /sucesso|recomend|ideal|otimiza|positivo/i.test(fullQuote);
              
              let alertStyle = "border-l-4 border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-900";
              let AlertIcon = HelpCircle;

              if (isWarning) {
                alertStyle = "border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-900";
                AlertIcon = AlertTriangle;
              } else if (isSuccess) {
                alertStyle = "border-l-4 border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900";
                AlertIcon = CheckCircle2;
              }

              return (
                <div key={index} className={`p-4 rounded-r-xl border my-4 flex gap-3 items-start ${alertStyle}`}>
                  <AlertIcon className="h-5 w-5 shrink-0 text-current mt-0.5" />
                  <div className="text-xs leading-relaxed font-medium">
                    <FormattedText text={fullQuote.replace(/\[!(WARNING|IMPORTANT|NOTE|TIP)\]/i, "")} />
                  </div>
                </div>
              );
            }

            default: {
              const textContent = block.content as string;
              return (
                <p key={index} className="text-[13px] text-foreground/80 leading-relaxed my-2 text-justify">
                  <FormattedText text={textContent} />
                </p>
              );
            }
          }
        })}
      </div>
    </div>
  );
};

export const MetricAnalyzer = ({ projection, inputs }: MetricAnalyzerProps) => {
  const [activeModel, setActiveModel] = useState<"qwen" | "gemini">("qwen");
  const [reportEngine, setReportEngine] = useState<"qwen" | "gemini">("qwen");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-detect available API Keys
  useEffect(() => {
    if (!qwenKey && geminiKey) {
      setActiveModel("gemini");
    } else if (qwenKey) {
      setActiveModel("qwen");
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Falha ao copiar texto: ", err);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const element = document.createElement("a");
    const file = new Blob([report], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = `auditoria_operacional_${reportEngine}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    if (!report) return;
    window.print();
  };

  const runAudit = async (type: "general" | "ai_impact" | "turnover_sensitivity") => {
    let prompt = "";
    
    if (type === "general") {
      prompt = `Realize uma AUDITORIA GERAL DE STAFFING E PLANO DE CONTRATAÇÕES baseando-se estritamente nos dados projetados.
      1. Identifique os gargalos operacionais e em qual mês o gap de headcount atinge o nível crítico.
      2. Faça uma engenharia reversa considerando o tempo de abertura de vagas (Lead Time de ${inputs.leadTimeMonths} meses) e a Rampa de Treinamento (${inputs.rampUpMonths} meses) para apontar exatamente em quais meses o time de recrutamento deve abrir os processos seletivos.
      3. Explique a diferença de impacto prático se a operação atuar no modo de contratação "${inputs.hiringMode === 'gap' ? 'Reativo (No Gap)' : 'Antecipado'}" cadastrado.
      4. Forneça uma tabela markdown com o cronograma recomendado de abertura de vagas (Mês de Abertura -> Mês de Início -> Mês de Maturação Completa).`;
    } else if (type === "ai_impact") {
      prompt = `Realize um ESTUDO DE IMPACTO E EFICIÊNCIA DE AUTOMAÇÃO POR IA na operação de dimensionamento.
      1. Demonstre numericamente como a cobertura de IA (iniciando em ${formatDecimal(inputs.aiCoveragePct, 1)}% e crescendo ${formatDecimal(inputs.aiGrowthMonthly, 1)}% ao mês) está reduzindo a demanda da equipe humana.
      2. Calcule a economia de Headcount (FTEs salvos por IA) ao longo dos meses. Mostre quanto seria o gap total de headcount se a IA estivesse em 0% vs. o cenário real planejado.
      3. Analise se a curva de maturação da IA é suficiente para conter o crescimento na base de clientes.
      4. Dê sugestões sobre como otimizar a contact rate ou a automação para equilibrar a balança sem novas contratações humanas.`;
    } else if (type === "turnover_sensitivity") {
      prompt = `Realize um ESTUDO DE SENSIBILIDADE A PICOS DE TURNOVER E OSCILAÇÕES DE TMA.
      1. Analise como o turnover cadastrado (${inputs.turnoverValue}${inputs.turnoverInputMode === 'percentual' ? '%' : ' agentes'}/${inputs.turnoverPeriod}) afeta a resiliência operacional. Qual é a taxa de drenagem de capacidade mensal?
      2. Faça uma simulação de estresse: O que acontece com os níveis de gap e risco da operação se o TMA médio de atendimento (${inputs.tmaN1} min) sofrer um desvio para mais de +20% devido a gargalos sistêmicos ou complexidade de novos clientes?
      3. Apresente os riscos de sobrecarga dos agentes ativos caso as contratações atrasem por causa do lead time de contratação.
      4. Proponha um plano de retenção operacional e recomende qual seria a reserva técnica (headcount extra ou backup) ideal para amortecer esses picos.`;
    }

    setReport("");
    setIsLoading(true);

    try {
      const chosenModel = activeModel;
      setReportEngine(chosenModel);
      const systemPrompt = generateSystemPrompt(projection, inputs);
      let responseText = "";

      if (chosenModel === "qwen") {
        responseText = await askQwen(prompt, systemPrompt);
      } else {
        responseText = await askGemini(prompt, systemPrompt);
      }

      setReport(responseText);
      
      // Seed follow-up chat context
      setMessages([
        {
          role: "assistant",
          content: `Relatório de Auditoria Operacional gerado com sucesso utilizando o modelo **${chosenModel === 'qwen' ? 'Qwen 3.7 Max' : 'Gemini 2.5 Flash'}**! 🌟\n\nVocê pode ler a análise executiva estilizada ao lado e utilizar esta barra lateral de chat para esclarecer dúvidas específicas, simular cenários ou pedir aprofundamentos.`,
          timestamp: new Date()
        }
      ]);

      // Automatically slide open the follow-up drawer to guide the user
      setIsChatOpen(true);

    } catch (error) {
      setReport(`❌ Erro ao gerar auditoria: ${error instanceof Error ? error.message : "Falha na comunicação com o servidor de IA"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");
    setIsLoading(true);

    const userMsg: Message = { role: "user", content: userText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    const loadingMsg: Message = { role: "assistant", content: "🤔 Analisando e respondendo...", timestamp: new Date() };
    setMessages(prev => [...prev, loadingMsg]);

    try {
      const systemPrompt = `${generateSystemPrompt(projection, inputs)}\n\nVocê está em um chat interativo de esclarecimento após ter gerado o seguinte Relatório de Auditoria:\n\n${report}\n\nResponda às dúvidas do usuário de forma concisa e técnica.`;
      
      let aiResponse = "";
      if (activeModel === "qwen") {
        aiResponse = await askQwen(userText, systemPrompt);
      } else {
        aiResponse = await askGemini(userText, systemPrompt);
      }

      setMessages(prev => prev.map((msg, i) =>
        i === prev.length - 1
          ? { ...msg, content: aiResponse }
          : msg
      ));
    } catch (error) {
      setMessages(prev => prev.map((msg, i) =>
        i === prev.length - 1
          ? { ...msg, content: `❌ Erro na resposta: ${error instanceof Error ? error.message : "Erro de rede"}` }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const currentKey = activeModel === "qwen" ? qwenKey : geminiKey;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-120px)] overflow-hidden p-1 relative">
      {/* Coluna Esquerda: Controles de Auditoria e Templates (xl:col-span-5) (no-print para sumir ao imprimir PDF) */}
      <div className="xl:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1 no-print">
        {/* Painel de Modelo */}
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

        {/* Templates de Auditoria de 1-Clique */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              Modelos de Auditoria Rápida
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Dispare análises imediatas alimentando a IA com os dados calculados da sua planilha.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => runAudit("general")}
              disabled={!currentKey || isLoading}
              className="flex items-start text-left p-3 rounded-lg border border-border bg-card hover:bg-muted/30 hover:border-primary/40 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <Scale className="h-5 w-5 text-primary shrink-0 mr-3 mt-0.5" />
              <div>
                <span className="text-xs font-semibold block text-foreground">Auditoria Geral de Staffing & Janela de Contratação</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 block leading-normal">
                  Identifica meses de déficit e calcula datas retroativas de recrutamento (lead time + rampa).
                </span>
              </div>
            </button>

            <button
              onClick={() => runAudit("ai_impact")}
              disabled={!currentKey || isLoading}
              className="flex items-start text-left p-3 rounded-lg border border-border bg-card hover:bg-muted/30 hover:border-primary/40 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <BrainCircuit className="h-5 w-5 text-primary shrink-0 mr-3 mt-0.5" />
              <div>
                <span className="text-xs font-semibold block text-foreground">Estudo de Deflexão e Eficiência por IA</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 block leading-normal">
                  Mapeia a economia real de headcount gerada pela cobertura de IA e sugere o ponto ideal de automação.
                </span>
              </div>
            </button>

            <button
              onClick={() => runAudit("turnover_sensitivity")}
              disabled={!currentKey || isLoading}
              className="flex items-start text-left p-3 rounded-lg border border-border bg-card hover:bg-muted/30 hover:border-primary/40 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <TrendingUp className="h-5 w-5 text-primary shrink-0 mr-3 mt-0.5" />
              <div>
                <span className="text-xs font-semibold block text-foreground">Análise de Risco de Turnover & Sensibilidade de TMA</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 block leading-normal">
                  Simula cenários de estresse de +20% no TMA e prevê colapsos por rotatividade de pessoal.
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Coluna Direita: Visualizador do Relatório (xl:col-span-7) */}
      <div className="xl:col-span-7 flex flex-col gap-4 overflow-hidden h-full print:w-full print:max-w-none">
        {/* Visualizador de Relatório */}
        <div className="glass-panel flex-1 flex flex-col overflow-hidden min-h-[250px] print:border-none print:shadow-none print:bg-transparent">
          {/* Header do Relatório */}
          <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20 shrink-0 no-print">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">
                Relatório Operacional Gerencial
              </h3>
            </div>
            {report && (
              <div className="flex items-center gap-1">
                <Button 
                  variant={isChatOpen ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setIsChatOpen(!isChatOpen)} 
                  className="h-7 text-xs gap-1.5 hover:bg-primary/10"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  Perguntar
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handlePrint} 
                  className="h-7 text-xs gap-1 hover:bg-primary/10"
                >
                  <Printer className="h-3 w-3 text-muted-foreground" />
                  Imprimir / PDF
                </Button>
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
                  Baixar (.md)
                </Button>
              </div>
            )}
          </div>

          {/* Área de Visualização */}
          <div className="flex-1 overflow-y-auto p-5 print:p-0">
            {isLoading && !report ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center no-print">
                <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
                <p className="text-sm font-semibold text-foreground">
                  {activeModel === "qwen" ? "Qwen 3.7 Max raciocinando..." : "Gemini 2.5 Flash analisando..."}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Processando dados de capacidade operacional, rampa de treinamento, TMA e turnover...
                </p>
              </div>
            ) : report ? (
              <ExecutiveReportRenderer text={report} engine={reportEngine} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12 no-print">
                <BrainCircuit className="h-12 w-12 opacity-30 mb-4 text-primary animate-pulse" />
                <h4 className="text-sm font-medium text-foreground">Relatório Não Gerado</h4>
                <p className="text-xs max-w-sm mt-2 leading-relaxed">
                  Selecione um modelo de IA à esquerda e escolha um dos modelos de auditoria rápida para iniciar a análise operacional do seu cenário de dimensionamento.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ GAVETA LATERAL FLUTUANTE DO ASSISTENTE (DRAWER PANEL) ══ */}
      {report && isChatOpen && (
        <>
          {/* Backdrop de desfocagem sutil para focar na conversa */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1.5px] transition-opacity no-print lg:hidden"
            onClick={() => setIsChatOpen(false)}
          />
          
          {/* Drawer deslizante */}
          <div className="fixed inset-y-0 right-0 z-50 w-[420px] max-w-full bg-background border-l border-border/80 shadow-2xl flex flex-col transition-all duration-300 ease-in-out animate-in slide-in-from-right no-print">
            {/* Header do Assistente */}
            <div className="flex items-center justify-between border-b px-4 py-3.5 bg-muted/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Assistente de Auditoria</h4>
                  <p className="text-[9px] text-muted-foreground mt-0.5 font-mono uppercase tracking-wider">
                    {reportEngine === 'qwen' ? 'Qwen 3.7 Max' : 'Gemini 2.5 Flash'}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsChatOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Balões de Mensagem */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                  {message.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-xl px-3.5 py-2 max-w-[85%] text-xs leading-relaxed shadow-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-muted text-foreground/90 border border-border/50"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                  {message.role === "user" && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input e Ações */}
            <div className="border-t p-4 shrink-0 bg-muted/10">
              <form onSubmit={sendChatMessage} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Peça aprofundamentos ou simulações..."
                  disabled={isLoading}
                  className="flex-1 text-xs h-9 bg-card"
                />
                <Button type="submit" size="sm" disabled={!input.trim() || isLoading} className="h-9 px-3">
                  {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setReport("");
                    setMessages([]);
                    setIsChatOpen(false);
                  }} 
                  className="h-9 px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Limpar Relatório e Conversa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ══ BOTÃO FLUTUANTE DE SUPORTE (CHAT BUBBLE) ══ */}
      {report && !isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/95 transition-all hover:scale-105 active:scale-95 animate-in fade-in duration-300 no-print"
        >
          <MessageSquare className="h-4 w-4" />
          Esclarecer Dúvidas
        </button>
      )}
    </div>
  );
};