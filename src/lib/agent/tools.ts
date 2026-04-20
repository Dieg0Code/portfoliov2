import { tool } from "ai";
import { z } from "zod";
import { homeContent } from "@/components/home/content";

export const SectionSchema = z.enum(["top", "work", "notes", "contact"]);
export const LocaleSchema = z.enum(["es", "en"]);
export const ExternalTargetSchema = z.enum(["github", "email", "blog"]);

export const agentTools = {
  navigate: tool({
    description:
      "Scroll smoothly to a section of the portfolio. Use when the user wants to see work/notes/contact/top.",
    inputSchema: z.object({
      section: SectionSchema
    })
  }),
  setLocale: tool({
    description: "Switch the portfolio UI language between Spanish (es) and English (en).",
    inputSchema: z.object({
      locale: LocaleSchema
    })
  }),
  openPost: tool({
    description: "Navigate to a specific blog post by its slug.",
    inputSchema: z.object({
      slug: z.string().min(1)
    })
  }),
  openExternal: tool({
    description:
      "Open an external destination: the GitHub profile, a mail composer, or the full blog index.",
    inputSchema: z.object({
      target: ExternalTargetSchema
    })
  }),
  listProjects: tool({
    description:
      "Return the structured list of projects featured in the portfolio. Use this when you need accurate titles/summaries before recommending.",
    inputSchema: z.object({}),
    execute: async () => {
      return {
        projects: homeContent.es.work.projects.map((p) => ({
          title: p.title,
          summary: p.summary,
          tags: p.tags,
          href: p.href,
          experiment: Boolean(p.isExperiment)
        }))
      };
    }
  })
};

export type AgentToolName = keyof typeof agentTools;
