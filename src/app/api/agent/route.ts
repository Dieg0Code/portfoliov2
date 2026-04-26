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
import { after } from "next/server";
import { cookies } from "next/headers";
import { buildAgentTools } from "@/lib/agent/tools";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { checkRateLimit } from "@/lib/agent/rate-limit";
import { getAllPostMeta } from "@/lib/blog/posts";
import {
  dropOrphanToolResults,
  encodeTokens,
  estimateToolsTokens,
  trimByTokens
} from "@/lib/agent/token-budget";
import { embed } from "@/lib/agent/embeddings/client";
import { hybridSearchKB, type KBHit } from "@/lib/agent/memory/retrieve";
import { isSupabaseConfigured } from "@/lib/agent/memory/client";
import { collectServerTelemetry } from "@/lib/agent/telemetry/collect";
import { renderOsintBlock } from "@/lib/agent/telemetry/render";
import type { ClientTelemetry } from "@/lib/agent/telemetry/types";
import { resolveVisitor, serializeSetCookie } from "@/lib/agent/memory/visitor";
import {
  getOrCreateConversation,
  appendMessage,
  bumpConversationActivity
} from "@/lib/agent/memory/conversation";
import { summarizeIfNeeded } from "@/lib/agent/memory/summary-policy";
import { getRecentVisitorFacts } from "@/lib/agent/memory/visitor-memory";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL_CONTEXT_LIMIT = 8000;
const RESERVED_OUTPUT_TOKENS = 800;
const MIN_HISTORY_TOKENS = 300;
const SUMMARY_HEADROOM_TOKENS = 200;

type RequestBody = {
  messages: UIMessage[];
  conversationId?: string;
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

function lastUserMessage(messages: UIMessage[]): UIMessage | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i];
  }
  return null;
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
  const locale = body.locale === "en" ? "en" : "es";

  // Visitor identity. Cookie is created on first request and lives 180 days.
  const cookieStore = await cookies();
  const visitor = resolveVisitor(cookieStore);

  // Conversation: server-side state. Falls back to creation if Supabase isn't
  // configured or the lookup fails — agent must keep working.
  const supabaseOn = isSupabaseConfigured();
  let conversationId: string | null = null;
  let priorSummary = "";
  if (supabaseOn) {
    try {
      const conv = await getOrCreateConversation({
        visitorId: visitor.id,
        conversationId: body.conversationId,
        locale
      });
      conversationId = conv.id;
      priorSummary = conv.summary;
    } catch (err) {
      console.warn("[agent] conversation init failed, continuing stateless:", err);
    }
  }

  const posts = await getAllPostMeta();

  // Passive telemetry — server headers in parallel with KB retrieval below.
  const serverTelemetryPromise = collectServerTelemetry(req.headers).catch(() => ({
    source: "none" as const
  }));
  const turnNumber = countUserTurns(messages);

  // Visitor memory — top facts injected as a system block. Silent failure.
  const visitorFactsPromise = getRecentVisitorFacts(visitor.id, 5).catch(() => []);

  // Knowledge-base retrieval — silent failure path.
  let kbHits: KBHit[] = [];
  const lastUser = lastUserMessage(messages);
  const query = extractTextFromParts((lastUser as { parts?: unknown } | null)?.parts).trim();
  if (query && supabaseOn) {
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

  const [serverTelemetry, visitorFacts] = await Promise.all([
    serverTelemetryPromise,
    visitorFactsPromise
  ]);
  const osintBlock = renderOsintBlock(
    { client: body.clientTelemetry, server: serverTelemetry },
    turnNumber
  );

  const systemPrompt = buildSystemPrompt({
    posts,
    priorSummary,
    kbHits,
    osintBlock,
    visitorFacts
  });
  const toolsTokens = estimateToolsTokens();
  const budget =
    MODEL_CONTEXT_LIMIT -
    encodeTokens(systemPrompt) -
    toolsTokens -
    RESERVED_OUTPUT_TOKENS -
    SUMMARY_HEADROOM_TOKENS;

  if (budget < MIN_HISTORY_TOKENS) {
    const sysTok = encodeTokens(systemPrompt);
    console.warn(
      `[agent] 413 context_overflow: system=${sysTok}, tools=${toolsTokens}, ` +
      `budget=${budget} < min=${MIN_HISTORY_TOKENS}`
    );
    return Response.json(
      { error: "context_overflow", systemTokens: sysTok, budget },
      { status: 413 }
    );
  }

  const { window } = trimByTokens(messages, budget);
  const cleanedWindow = dropOrphanToolResults(window);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      if (conversationId) {
        writer.write({
          type: "data-conversation",
          data: { id: conversationId }
        });
      }
      const tools = buildAgentTools({
        visitorId: visitor.id,
        conversationId,
        locale
      });
      const result = streamText({
        model: githubModels.chat("gpt-4o-mini"),
        system: systemPrompt,
        messages: await convertToModelMessages(cleanedWindow),
        tools,
        stopWhen: stepCountIs(6),
        temperature: 0.85,
        maxOutputTokens: RESERVED_OUTPUT_TOKENS,
        onFinish: ({ text }) => {
          // Persist after the response is flushed. Order matters: user msg
          // first, then assistant. We cannot build the final user msg parts
          // here because the AI SDK only owns the assistant side, so we
          // serialise from the request body.
          if (!conversationId) return;
          const cid = conversationId;
          const userMsg = lastUser;
          const assistantText = text;
          after(async () => {
            try {
              if (userMsg) {
                await appendMessage(cid, {
                  role: "user",
                  content: extractTextFromParts(
                    (userMsg as { parts?: unknown }).parts
                  ),
                  parts: (userMsg as { parts?: unknown }).parts
                });
              }
              if (assistantText && assistantText.trim()) {
                await appendMessage(cid, {
                  role: "assistant",
                  content: assistantText,
                  parts: [{ type: "text", text: assistantText }]
                });
              }
              await bumpConversationActivity(cid, (userMsg ? 1 : 0) + (assistantText ? 1 : 0));
              await summarizeIfNeeded(cid);
            } catch (err) {
              console.warn("[agent] post-stream persistence failed:", err);
            }
          });
        }
      });
      writer.merge(result.toUIMessageStream());
    }
  });

  const response = createUIMessageStreamResponse({ stream });
  if (visitor.setCookie) {
    response.headers.append("Set-Cookie", serializeSetCookie(visitor.setCookie));
  }
  return response;
}
