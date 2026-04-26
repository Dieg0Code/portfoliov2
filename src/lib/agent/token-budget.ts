import { getEncoding } from "js-tiktoken";
import type { UIMessage } from "ai";
import { buildToolsForTokenCount } from "./tools";

// cl100k_base is within ~5% of o200k_base on typical ES/EN prose — good
// enough for budgeting and avoids shipping the larger o200k ranks file.
const encoder = getEncoding("cl100k_base");

export function encodeTokens(text: string): number {
  if (!text) return 0;
  return encoder.encode(text).length;
}

type AnyPart = {
  type?: string;
  text?: string;
  input?: unknown;
  output?: unknown;
  toolCallId?: string;
  state?: string;
};

const MESSAGE_OVERHEAD = 4;

export function estimateMessageTokens(m: UIMessage): number {
  const parts = (m as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return MESSAGE_OVERHEAD;
  let n = MESSAGE_OVERHEAD;
  for (const p of parts as AnyPart[]) {
    if (typeof p.text === "string") n += encodeTokens(p.text);
    if (p.input !== undefined) n += encodeTokens(JSON.stringify(p.input));
    if (p.output !== undefined) n += encodeTokens(JSON.stringify(p.output));
  }
  return n;
}

let cachedToolsTokens: number | null = null;
export function estimateToolsTokens(): number {
  if (cachedToolsTokens !== null) return cachedToolsTokens;
  const serialized = Object.entries(buildToolsForTokenCount()).map(([name, tool]) => {
    const t = tool as { description?: string; inputSchema?: unknown };
    return {
      name,
      description: t.description ?? "",
      inputSchema: t.inputSchema ? JSON.stringify(t.inputSchema) : ""
    };
  });
  cachedToolsTokens = encodeTokens(JSON.stringify(serialized)) + 32;
  return cachedToolsTokens;
}

export type TrimResult = {
  window: UIMessage[];
  evictedEnd: number;
};

export function trimByTokens(
  messages: UIMessage[],
  budgetTokens: number
): TrimResult {
  if (messages.length === 0) return { window: [], evictedEnd: 0 };
  let total = 0;
  let startIdx = messages.length;
  for (let i = messages.length - 1; i >= 0; i--) {
    const cost = estimateMessageTokens(messages[i]);
    if (total + cost > budgetTokens && i !== messages.length - 1) break;
    total += cost;
    startIdx = i;
  }
  while (startIdx < messages.length && messages[startIdx].role !== "user") {
    startIdx += 1;
  }
  if (startIdx >= messages.length) {
    startIdx = Math.max(0, messages.length - 1);
  }
  return { window: messages.slice(startIdx), evictedEnd: startIdx };
}

export function dropOrphanToolResults(messages: UIMessage[]): UIMessage[] {
  const toolCallIds = new Set<string>();
  for (const m of messages) {
    const parts = (m as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) continue;
    for (const p of parts as AnyPart[]) {
      if (typeof p.type !== "string") continue;
      if (p.type.startsWith("tool-") && p.state !== "output-available" && p.toolCallId) {
        toolCallIds.add(p.toolCallId);
      }
      if (p.type === "tool-call" && p.toolCallId) {
        toolCallIds.add(p.toolCallId);
      }
    }
  }
  return messages.map((m) => {
    const parts = (m as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) return m;
    const filtered = (parts as AnyPart[]).filter((p) => {
      if (p.type === "tool-result" && p.toolCallId && !toolCallIds.has(p.toolCallId)) {
        return false;
      }
      return true;
    });
    if (filtered.length === parts.length) return m;
    return { ...m, parts: filtered } as UIMessage;
  });
}
