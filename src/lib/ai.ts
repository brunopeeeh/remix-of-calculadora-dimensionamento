import { GoogleGenerativeAI } from "@google/generative-ai";

export async function askGemini(prompt: string, systemPrompt?: string): Promise<string> {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error("Chave de API Gemini (VITE_GEMINI_API_KEY) não configurada.");
  }
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

const DASHSCOPE_API_KEY = import.meta.env.VITE_DASHSCOPE_API_KEY as string;
const DASHSCOPE_URL = import.meta.env.DEV
  ? "/api/dashscope/compatible-mode/v1/chat/completions"
  : "https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions";

export async function askQwen(prompt: string, systemPrompt?: string): Promise<string> {
  if (!DASHSCOPE_API_KEY) {
    throw new Error("Chave de API do DashScope (VITE_DASHSCOPE_API_KEY) não configurada.");
  }

  const messages: { role: string; content: string }[] = [];
  
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await fetch(DASHSCOPE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DASHSCOPE_API_KEY}`
    },
    body: JSON.stringify({
      model: "qwen3.7-max",
      messages,
      temperature: 0.7,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const rawText = await response.text().catch(() => "");
    let apiMessage = "";
    try {
      const parsed = JSON.parse(rawText);
      apiMessage = parsed?.error?.message || parsed?.message || parsed?.code || "";
    } catch {
      apiMessage = rawText.slice(0, 200);
    }
    throw new Error(apiMessage || `Erro HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sem resposta";
}