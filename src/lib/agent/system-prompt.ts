import fs from "node:fs";
import path from "node:path";
import { contactEmail, githubProfile, homeContent } from "@/components/home/content";
import type { PostMeta } from "@/lib/blog/types";
import { formatGitHubBlock, getGitHubContext } from "./github-context";
import { renderKBBlock } from "./prompt/blocks";
import type { KBHit } from "./memory/retrieve";

type BuildArgs = {
  posts: PostMeta[];
  priorSummary?: string;
  kbHits?: KBHit[];
  osintBlock?: string;
};

const DIEGO_LOCATION = "Osorno, Chile";
const DIEGO_TZ = "America/Santiago"; // CL national TZ; UTC-3 in summer, UTC-4 winter
const CAREER_START_YEAR = 2018;

function renderNowBlock(): string {
  const now = new Date();
  const date = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(now);
  const time = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: DIEGO_TZ,
    timeZoneName: "shortOffset"
  }).format(now);
  const years = now.getUTCFullYear() - CAREER_START_YEAR;
  return `## Ahora (real, no inventes)
fecha: ${date} · ${time} en ${DIEGO_LOCATION} (Diego)
experiencia Diego: ${years} años (desde ${CAREER_START_YEAR})`;
}

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

export function buildSystemPrompt(args: BuildArgs): string {
  const { posts, priorSummary, kbHits, osintBlock } = args;
  const es = homeContent.es;
  const projectLines = es.work.projects
    .map((p) => `  - ${p.title}: ${p.summary} [href=${p.href}${p.isExperiment ? " · experimento" : ""}]`)
    .join("\n");
  const postIndexLines = posts
    .slice(0, 12)
    .map((p) => `  - /blog/${p.slug}: ${p.title}`)
    .join("\n");

  const agentMd = readAgentMarkdown();
  const persona = agentMd ? `${agentMd}\n\n---\n\n` : "";

  const ghCtx = getGitHubContext();
  const ghBlock = ghCtx ? `\n\n${formatGitHubBlock(ghCtx)}` : "";

  const summaryBlock = priorSummary && priorSummary.trim()
    ? `## Resumen de la conversación previa
(Mira recuerda esto aunque los turnos antiguos ya no estén en la ventana.)

${priorSummary.trim()}

---

`
    : "";

  const kbBlock = kbHits && kbHits.length > 0
    ? `${renderKBBlock(kbHits)}\n\n---\n\n`
    : "";

  const osintSection = osintBlock
    ? `${osintBlock}\n\n---\n\n`
    : "";

  const nowBlock = renderNowBlock();

  return `${persona}${summaryBlock}${osintSection}${kbBlock}# Datos dinámicos

${nowBlock}

## Contacto
${es.brand.name} — ${es.brand.strapline} · ${contactEmail} · ${githubProfile}

## Proyectos (índice — detalle profundo viene por KB retrieval)
${projectLines}

## Posts disponibles (slugs para openPost · contenido profundo via KB)
${postIndexLines || "  (ninguno todavía)"}

## Tools
navigate{section: top|work|notes|contact} · setLocale{locale: es|en} · openPost{slug} · openExternal{target: github|email|blog} · listProjects()
${ghBlock}`;
}
