import { tool } from "ai";
import { z } from "zod";
import { homeContent } from "@/components/home/content";
import { embed } from "./embeddings/client";
import { hybridSearchKB } from "./memory/retrieve";
import {
  rememberVisitorFact,
  searchVisitorMemory,
  type MemoryKind
} from "./memory/visitor-memory";

export const SectionSchema = z.enum(["top", "work", "notes", "contact"]);
export const LocaleSchema = z.enum(["es", "en"]);
export const ExternalTargetSchema = z.enum(["github", "email", "blog"]);
export const MemoryKindSchema = z.enum(["preference", "interest", "intent", "fact"]);

// ── UI / navigation tools (handled client-side via onToolCall) ────────────
const uiTools = {
  navigate: tool({
    description:
      "Scroll smoothly to a section of the portfolio. Use when the user wants to see work/notes/contact/top.",
    inputSchema: z.object({ section: SectionSchema })
  }),
  setLocale: tool({
    description: "Switch the portfolio UI language between Spanish (es) and English (en).",
    inputSchema: z.object({ locale: LocaleSchema })
  }),
  openPost: tool({
    description: "Navigate to a specific blog post by its slug.",
    inputSchema: z.object({ slug: z.string().min(1) })
  }),
  openExternal: tool({
    description:
      "Open an external destination: the GitHub profile, a mail composer, or the full blog index.",
    inputSchema: z.object({ target: ExternalTargetSchema })
  }),
  listProjects: tool({
    description:
      "Return the structured list of projects featured in the portfolio. Use this when you need accurate titles/summaries before recommending.",
    inputSchema: z.object({}),
    execute: async () => ({
      projects: homeContent.es.work.projects.map((p) => ({
        title: p.title,
        summary: p.summary,
        tags: p.tags,
        href: p.href,
        experiment: Boolean(p.isExperiment)
      }))
    })
  })
};

export type AgentToolName = keyof typeof uiTools | CognitiveToolName;
export type CognitiveToolName =
  | "recall_kb"
  | "recall_about_visitor"
  | "remember_about_visitor";

export type ToolContext = {
  visitorId: string;
  conversationId: string | null;
  locale: "es" | "en";
};

// ── Cognitive tools (server-execute, closure over per-request context) ────
function buildCognitiveTools(ctx: ToolContext) {
  return {
    recall_kb: tool({
      description:
        "Search the portfolio KB by query when the auto-retrieved snippets don't cover what you need.",
      inputSchema: z.object({
        query: z.string().min(2).max(200)
      }),
      execute: async ({ query }) => {
        try {
          const e = await embed(query);
          const hits = await hybridSearchKB({
            queryText: query,
            queryEmbedding: e,
            locale: ctx.locale,
            k: 4
          });
          return {
            ok: true,
            hits: hits.map((h) => ({
              source_type: h.sourceType,
              source_id: h.sourceId,
              title: h.title,
              content: h.content.slice(0, 320),
              url: h.url
            }))
          };
        } catch (err) {
          return { ok: false, error: String(err) };
        }
      }
    }),

    recall_about_visitor: tool({
      description:
        "Search what you remember about THIS visitor by query. Top recent facts already come in the system prompt; use this for specific topic lookups only.",
      inputSchema: z.object({
        query: z.string().min(2).max(200)
      }),
      execute: async ({ query }) => {
        try {
          const e = await embed(query);
          const facts = await searchVisitorMemory({
            visitorId: ctx.visitorId,
            queryText: query,
            queryEmbedding: e,
            k: 4
          });
          return { ok: true, facts };
        } catch (err) {
          return { ok: false, error: String(err) };
        }
      }
    }),

    remember_about_visitor: tool({
      description:
        "Persist a fact about this visitor for future sessions. Only call when the visitor voluntarily shares info worth remembering — see policy in system. Content must be third-person factual.",
      inputSchema: z.object({
        kind: MemoryKindSchema,
        content: z.string().min(8).max(280)
      }),
      execute: async ({ kind, content }) => {
        const result = await rememberVisitorFact({
          visitorId: ctx.visitorId,
          kind: kind as MemoryKind,
          content,
          sourceConvId: ctx.conversationId
        });
        return result;
      }
    })
  };
}

export function buildAgentTools(ctx: ToolContext) {
  return { ...uiTools, ...buildCognitiveTools(ctx) };
}

// Backwards-compat: token-budget previously imported `agentTools`. The shape
// is the UI-only set; cognitive tool schemas are added separately by the
// route at call time. token-budget now accepts a tools arg.
export const agentTools = uiTools;

// Static schema-only export for token estimation (no execute closures).
export function buildToolsForTokenCount() {
  return buildAgentTools({
    visitorId: "00000000-0000-0000-0000-000000000000",
    conversationId: null,
    locale: "es"
  });
}
