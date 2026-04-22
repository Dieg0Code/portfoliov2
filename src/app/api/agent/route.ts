import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { NextRequest } from "next/server";
import { agentTools } from "@/lib/agent/tools";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { checkRateLimit } from "@/lib/agent/rate-limit";
import { getAllPostMeta } from "@/lib/blog/posts";

export const runtime = "nodejs";
export const maxDuration = 30;

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

  const body = (await req.json()) as { messages: UIMessage[] };
  const posts = await getAllPostMeta();
  const system = buildSystemPrompt(posts);

  const result = streamText({
    model: githubModels.chat("gpt-4o-mini"),
    system,
    messages: await convertToModelMessages(body.messages),
    tools: agentTools,
    stopWhen: stepCountIs(6),
    temperature: 0.4
  });

  return result.toUIMessageStreamResponse();
}
