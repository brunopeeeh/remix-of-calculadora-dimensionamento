import { useRef, useEffect } from "react";
import { Bot, User, Send, Trash2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface FollowUpChatProps {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  onSend: (e: React.FormEvent) => void;
  onClear: () => void;
}

export const FollowUpChat = ({ messages, input, setInput, isLoading, onSend, onClear }: FollowUpChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="glass-panel h-[230px] flex flex-col overflow-hidden shrink-0">
      <div className="border-b px-4 py-2 bg-muted/20 shrink-0">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Dúvidas do Relatório? Pergunte ao Assistente
        </h4>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div key={index} className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : ""}`}>
            {message.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-3 w-3 text-primary" />
              </div>
            )}
            <div
              className={`rounded-lg px-3 py-1.5 max-w-[85%] text-xs leading-normal ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
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

      <div className="border-t p-3 shrink-0">
        <form onSubmit={onSend} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Peça aprofundamentos ou simulações..."
            disabled={isLoading}
            className="flex-1 text-xs h-8"
          />
          <Button type="submit" size="sm" disabled={!input.trim() || isLoading} className="h-8 px-2.5">
            {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
};
