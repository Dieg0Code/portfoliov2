import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage
} from "ai";
import { NextRequest } from "next/server";
import { agentTools } from "@/lib/agent/tools";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { checkRateLimit } from "@/lib/agent/rate-limit";
import { getAllPostMeta } from "@/lib/blog/posts";
import {
  dropOrphanToolResults,
  encodeTokens,
  estimateToolsTokens,
  trimByTokens
} from "@/lib/agent/token-budget";
import { summarizeTurns } from "@/lib/agent/summarize";
import { embed } from "@/lib/agent/embeddings/client";
import { hybridSearchKB, type KBHit } from "@/lib/agent/memory/retrieve";
import { isSupabaseConfigured } from "@/lib/agent/memory/client";
import { collectServerTelemetry } from "@/lib/agent/telemetry/collect";
import { renderOsintBlock } from "@/lib/agent/telemetry/render";
import type { ClientTelemetry } from "@/lib/agent/telemetry/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL_CONTEXT_LIMIT = 8000;
// Mira's voice policy caps her at 3-6 lines for chat, 1-2 for tool confirms.
// 800 tokens is more than enough for any single response and frees ~400
// tokens for history vs the previous 1200.
const RESERVED_OUTPUT_TOKENS = 800;
const MIN_HISTORY_TOKENS = 300;
// Headroom for the rolling summary block when it appears.
const SUMMARY_HEADROOM_TOKENS = 200;

type PriorSummary = { text: string; coversThroughId: string };

type RequestBody = {
  messages: UIMessage[];
  threadId?: string;
  priorSummary?: PriorSummary;
  locale?: "es" | "en";
  clientTelemetry?: ClientTelemetry;
};

function countUserTurns(messages: UIMessage[]): number {
  let n = 0;
  for (const m of messages) if (m.role === "user") n++;
  return n;
}

function extractTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  let out = "";
  for (const p of parts as Array<{ type?: string; text?: string }>) {
    if (p.type === "text" && typeof p.text === "string") out += p.text;
  }
  return out;
}

function lastUserQuery(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "user") continue;
    const text = extractTextFromParts(
      (messages[i] as { parts?: unknown }).parts
    ).trim();
    if (text) return text;
  }
  return "";
}

const githubModels = createOpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_MODELS_TOKEN ?? ""
});

export async function POST(req: NextRequest) {
  if (!process.env.GITHUB_MODELS_TOKEN) {
    return new Response("Missing GITHUB_MODELS_TOKEN", { status: 500 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const limit = checkRateLimit(ip);
  if (!limit.ok) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: { "Retry-After": Math.ceil(limit.retryAfterMs / 1000).toString() }
    });
  }

  const body = (await req.json()) as RequestBody;
  const messages = body.messages ?? [];
  const priorSummary = body.priorSummary;
  const locale = body.locale === "en" ? "en" : "es";

  const posts = await getAllPostMeta();

  // Passive telemetry — server headers in parallel with KB retrieval below.
  const serverTelemetryPromise = collectServerTelemetry(req.headers).catch(() => ({
    source: "none" as const
  }));
  const turnNumber = countUserTurns(messages);

  // Knowledge-base retrieval: embed the latest user query and hybrid-search.
  // Silent failure path — if Supabase / embeddings are down we just proceed
  // with an empty KB block. Never let retrieval block the chat.
  let kbHits: KBHit[] = [];
  const query = lastUserQuery(messages);
  if (query && isSupabaseConfigured()) {
    try {
      const queryEmbedding = await embed(query);
      kbHits = await hybridSearchKB({
        queryText: query,
        queryEmbedding,
        locale,
        k: 4
      });
    } catch (err) {
      console.warn("[agent] KB retrieval failed, continuing without:", err);
    }
  }

  const serverTelemetry = await serverTelemetryPromise;
  const osintBlock = renderOsintBlock(
    { client: body.clientTelemetry, server: serverTelemetry },
    turnNumber
  );

  // Initial budget estimate with the summary + KB we were handed.
  let activeSummary = priorSummary?.text;
  let activeCoversThroughId = priorSummary?.coversThroughId;
  let systemPrompt = buildSystemPrompt({
    posts,
    priorSummary: activeSummary,
    kbHits,
    osintBlock
  });
  const toolsTokens = estimateToolsTokens();

  const computeBudget = (sys: string, reserveSummary: boolean) =>
    MODEL_CONTEXT_LIMIT -
    encodeTokens(sys) -
    toolsTokens -
    RESERVED_OUTPUT_TOKENS -
    (reserveSummary ? SUMMARY_HEADROOM_TOKENS : 0);

  let budget = computeBudget(systemPrompt, true);
  if (budget < MIN_HISTORY_TOKENS) {
    const sysTok = encodeTokens(systemPrompt);
    console.warn(
      `[agent] 413 context_overflow: system=${sysTok}, tools=${toolsTokens}, ` +
      `reserved=${RESERVED_OUTPUT_TOKENS}+${SUMMARY_HEADROOM_TOKENS}, ` +
      `budget=${budget} < min=${MIN_HISTORY_TOKENS}`
    );
    return Response.json(
      { error: "context_overflow", reason: "system prompt too large", systemTokens: sysTok, budget },
      { status: 413 }
    );
  }

  const { window, evictedEnd } = trimByTokens(messages, budget);

  // Determine which evicted turns are newer than what prior summary covers.
  let newlyEvicted: UIMessage[] = [];
  if (evictedEnd > 0) {
    if (!activeCoversThroughId) {
      newlyEvicted = messages.slice(0, evictedEnd);
    } else {
      const coverIdx = messages.findIndex((m) => m.id === activeCoversThroughId);
      const startAt = coverIdx >= 0 ? coverIdx + 1 : 0;
      newlyEvicted = messages.slice(startAt, evictedEnd);
    }
  }

  let summaryChanged = false;
  if (newlyEvicted.length > 0) {
    const updated = await summarizeTurns(activeSummary ?? "", newlyEvicted);
    if (updated && updated !== activeSummary) {
      activeSummary = updated;
      activeCoversThroughId = newlyEvicted[newlyEvicted.length - 1].id;
      summaryChanged = true;
      systemPrompt = buildSystemPrompt({
        posts,
        priorSummary: activeSummary,
        kbHits,
        osintBlock
      });
      // after updating the summary, reserveSummary=false — headroom already
      // spent — but validate we didn't blow past the cap.
      budget = computeBudget(systemPrompt, false);
      if (budget < MIN_HISTORY_TOKENS) {
        return Response.json(
          { error: "context_overflow", reason: "summary pushed system past budget" },
          { status: 413 }
        );
      }
    }
  }

  const cleanedWindow = dropOrphanToolResults(window);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      if (summaryChanged && activeSummary && activeCoversThroughId) {
        writer.write({
          type: "data-summary",
          data: { text: activeSummary, coversThroughId: activeCoversThroughId }
        });
      }
      const result = streamText({
        model: githubModels.chat("gpt-4o-mini"),
        system: systemPrompt,
        messages: await convertToModelMessages(cleanedWindow),
        tools: agentTools,
        stopWhen: stepCountIs(6),
        temperature: 0.75,
        maxOutputTokens: RESERVED_OUTPUT_TOKENS
      });
      writer.merge(result.toUIMessageStream());
    }
  });

  return createUIMessageStreamResponse({ stream });
}
