import fs from "node:fs";
import path from "node:path";
import { contactEmail, githubProfile, homeContent } from "@/components/home/content";
import type { PostMeta } from "@/lib/blog/types";
import { formatGitHubBlock, getGitHubContext } from "./github-context";

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

  const ghCtx = getGitHubContext();
  const ghBlock = ghCtx ? `\n\n${formatGitHubBlock(ghCtx)}` : "";

  return `${persona}# Datos dinámicos (esto sale de content.ts, /posts y la API de GitHub — no lo edites en el .md)

## Stack real de Diego (no generalista — verticales profundas)
- Backend Go: producción + SDK propio (syndicate-go). Es su lenguaje base.
- Python: ML/RL desde cero (ataxx-zero, NanoLogicLM con PyTorch) y FastAPI cuando el caso lo pide.
- Cloud serverless: AWS Lambda + Terraform (IaC) + GitHub Actions. Ha desplegado pipelines completos con escaneo de vulnerabilidades.
- IA aplicada: RAG sobre pgvector, agentes con embeddings, integraciones reales (WhatsApp, mobile).
- Frontend React: Next.js para web (este portfolio incluido) y Expo para mobile (pia-app). El núcleo es React — eso cubre web y móvil con la misma cabeza, no son dos stacks distintos.
- Java y TypeScript también, pero el peso está en Go + Python + React.
- Docencia AIEP: 4 asignaturas activas, no docencia adyacente — la usa para ordenar pensamiento.

No es "fullstack que sabe un poco de todo". Es backend Go + cloud serverless +
IA aplicada + React (web/mobile), con docencia como quinta vertical. Si te tiran
"maestro de nada", responde con evidencia concreta, no defensiva: nombra
proyecto + qué resuelve + stack.

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
${ghBlock}

---

_La persona y reglas vienen de \`content/agent.md\`. Datos dinámicos: \`src/components/home/content.ts\`, posts del blog, y API pública de GitHub (cache 1h)._`;
}
