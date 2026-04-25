import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type UIMessage } from "ai";

const githubModels = createOpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_MODELS_TOKEN ?? ""
});

const SUMMARY_TIMEOUT_MS = 8000;

function renderTurn(m: UIMessage): string {
  const parts = (m as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return "";
  const lines: string[] = [];
  for (const p of parts as Array<{
    type?: string;
    text?: string;
    input?: unknown;
  }>) {
    if (p.type === "text" && typeof p.text === "string") {
      lines.push(p.text);
    } else if (typeof p.type === "string" && p.type.startsWith("tool-")) {
      const name = p.type.replace(/^tool-/, "");
      const arg = p.input !== undefined ? JSON.stringify(p.input) : "";
      lines.push(`[tool:${name}${arg ? ` ${arg}` : ""}]`);
    }
  }
  const role = m.role === "user" ? "User" : m.role === "assistant" ? "Mira" : m.role;
  return `${role}: ${lines.join(" ").trim()}`;
}

const SYSTEM = `Sos un compresor de contexto para la conversación de un agente llamado Mira.
Te paso (1) un resumen previo (puede venir vacío) y (2) turnos nuevos entre el user y Mira.
Devolvé un único resumen unificado de ≤ 180 tokens, en prosa compacta en español,
conservando nombres propios, fechas, intenciones y decisiones del user, y promesas/
información concreta que Mira entregó. Nada de markdown, nada de viñetas, sin títulos.`;

export async function summarizeTurns(
  prior: string,
  turns: UIMessage[]
): Promise<string> {
  if (turns.length === 0) return prior;
  const rendered = turns.map(renderTurn).filter(Boolean).join("\n");
  const priorBlock = prior
    ? `Resumen previo:\n${prior}\n\n`
    : "Resumen previo: (vacío, es la primera compresión)\n\n";
  const prompt = `${priorBlock}Turnos nuevos:\n${rendered}\n\nDevolvé el resumen unificado.`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SUMMARY_TIMEOUT_MS);
  try {
    const { text } = await generateText({
      model: githubModels.chat("gpt-4o-mini"),
      system: SYSTEM,
      prompt,
      temperature: 0.3,
      maxOutputTokens: 220,
      abortSignal: ctrl.signal
    });
    const cleaned = text.trim();
    return cleaned || prior;
  } catch (err) {
    console.warn("[summarize] failed, keeping prior summary:", err);
    return prior;
  } finally {
    clearTimeout(timer);
  }
}
