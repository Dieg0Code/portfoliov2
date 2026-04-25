/* eslint-disable no-console */
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { buildSystemPrompt } from "../src/lib/agent/system-prompt";
import { encodeTokens, estimateToolsTokens } from "../src/lib/agent/token-budget";
import { getAllPostMeta } from "../src/lib/blog/posts";
import { renderOsintBlock } from "../src/lib/agent/telemetry/render";
import { embed } from "../src/lib/agent/embeddings/client";
import { hybridSearchKB } from "../src/lib/agent/memory/retrieve";

async function run() {
  const posts = await getAllPostMeta();

  console.log("=== Token measurement of system prompt ===\n");

  // 1. agent.md alone (read raw)
  const fs = await import("node:fs");
  const path = await import("node:path");
  const agentMd = fs.readFileSync(
    path.join(process.cwd(), "content", "agent.md"),
    "utf8"
  );
  console.log(`agent.md: ${encodeTokens(agentMd)} tokens (${agentMd.length} chars)`);

  // 2. dynamic block alone (no KB, no OSINT, no summary)
  const dynamicOnly = buildSystemPrompt({ posts });
  console.log(`system w/o kb/osint/summary: ${encodeTokens(dynamicOnly)} tokens`);

  // 3. + OSINT (sample)
  const osint = renderOsintBlock(
    {
      server: { ipClass: "public", country: "CL", city: "Santiago", timezone: "America/Santiago", approx: true, source: "vercel" },
      client: { userAgent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/131.0", platform: "Linux", language: "es-CL", languages: ["es-CL", "es", "en"], timezone: "America/Santiago", screenW: 2560, screenH: 1440, devicePixelRatio: 1, referrer: "", colorScheme: "dark", touchPoints: 0 }
    },
    1
  );
  const withOsint = buildSystemPrompt({ posts, osintBlock: osint });
  console.log(`+ osint: ${encodeTokens(withOsint)} tokens`);

  // 4. + KB hits (real query)
  const q = "qué sabe Diego de Terraform y AWS";
  const queryEmbedding = await embed(q);
  const hits = await hybridSearchKB({ queryText: q, queryEmbedding, locale: "es", k: 6 });
  const withKb = buildSystemPrompt({ posts, osintBlock: osint, kbHits: hits });
  console.log(`+ kb (k=6): ${encodeTokens(withKb)} tokens (kb has ${hits.length} hits)`);

  const withKb4 = buildSystemPrompt({ posts, osintBlock: osint, kbHits: hits.slice(0, 4) });
  console.log(`+ kb (k=4): ${encodeTokens(withKb4)} tokens`);

  // 5. + summary (synthetic 180-token sample)
  const fakeSummary = "El user pregunta sobre los proyectos de Diego. Mira mencionó ataxx-zero, NanoLogicLM y syndicate-go. El user mostró interés en RAG sobre pgvector y la integración con WhatsApp. Confirmó que está evaluando perfiles para un equipo de ML, foco en backend Python + serverless AWS. Pidió que le abriera el blog en algún momento, aún no lo hizo.";
  const withAll = buildSystemPrompt({ posts, osintBlock: osint, kbHits: hits, priorSummary: fakeSummary });
  console.log(`+ summary (~${encodeTokens(fakeSummary)} tok): ${encodeTokens(withAll)} tokens`);

  // 6. tools
  const toolsT = estimateToolsTokens();
  console.log(`\ntools schemas: ${toolsT} tokens`);

  // 7. budget
  const RESERVED = 1200;
  const HEADROOM = 250;
  const total = encodeTokens(withAll) + toolsT + RESERVED + HEADROOM;
  const remainder = 8000 - total;
  console.log(`\nworst-case total: ${total} / 8000`);
  console.log(`history budget after reserve+headroom: ${remainder} tokens`);
  if (remainder < 500) {
    console.log("⚠ this trips MIN_HISTORY_TOKENS=500 → 413");
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
