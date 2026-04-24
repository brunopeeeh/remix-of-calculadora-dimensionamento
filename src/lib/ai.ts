import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function askGemini(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function askOpenRouter(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "Dimensionamento Calculator"
    },
    body: JSON.stringify({
      model: "minimax/minimax-m2.5:free",
      messages,
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Erro ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Sem resposta";
}