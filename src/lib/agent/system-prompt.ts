import fs from "node:fs";
import path from "node:path";
import { contactEmail, githubProfile, homeContent } from "@/components/home/content";
import type { PostMeta } from "@/lib/blog/types";

const AGENT_MD_PATH = path.join(process.cwd(), "content", "agent.md");

const IS_DEV = process.env.NODE_ENV !== "production";
let cachedAgentMd: string | null = null;
function readAgentMarkdown(): string {
  if (!IS_DEV && cachedAgentMd !== null) return cachedAgentMd;
  try {
    const contents = fs.readFileSync(AGENT_MD_PATH, "utf8");
    cachedAgentMd = contents;
    return contents;
  } catch {
    cachedAgentMd = "";
    return "";
  }
}

export function buildSystemPrompt(posts: PostMeta[]): string {
  const es = homeContent.es;
  const projectLines = es.work.projects
    .map((p) => `  - ${p.title}: ${p.summary} [href=${p.href}${p.isExperiment ? " · experimento" : ""}]`)
    .join("\n");
  const postLines = posts
    .slice(0, 20)
    .map((p) => `  - /blog/${p.slug}: ${p.title}`)
    .join("\n");

  const agentMd = readAgentMarkdown();
  const persona = agentMd ? `${agentMd}\n\n---\n\n` : "";

  return `${persona}# Datos dinámicos (esto sale de content.ts y /posts — no lo edites en el .md)

## Contacto
- ${es.brand.name} — ${es.brand.strapline}
- Email: ${contactEmail}
- GitHub: ${githubProfile}

## Proyectos destacados
${projectLines}

## Posts del blog disponibles
${postLines || "  (ninguno todavía)"}

## Tools disponibles
- navigate({ section }) — top | work | notes | contact
- setLocale({ locale }) — es | en
- openPost({ slug }) — usa solo slugs listados arriba
- openExternal({ target }) — github | email | blog
- listProjects() — devuelve la lista completa estructurada

---

_La persona y reglas vienen de \`content/agent.md\`. Los datos dinámicos de \`src/components/home/content.ts\` y los posts del blog._`;
}
