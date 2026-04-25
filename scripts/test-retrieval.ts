/* eslint-disable no-console */
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { getSupabaseAdmin } from "../src/lib/agent/memory/client";
import { embed } from "../src/lib/agent/embeddings/client";
import { hybridSearchKB } from "../src/lib/agent/memory/retrieve";

async function run() {
  const sb = getSupabaseAdmin();
  const { count } = await sb
    .from("kb_documents")
    .select("*", { count: "exact", head: true });
  console.log(`[test] kb_documents total rows: ${count}`);

  const { data: bySource } = await sb
    .from("kb_documents")
    .select("source_type, locale")
    .order("source_type");
  const counts = new Map<string, number>();
  for (const r of bySource ?? []) {
    const key = `${r.source_type}:${r.locale}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  console.log("[test] breakdown:");
  for (const [k, v] of counts) console.log(`  ${k} = ${v}`);

  const queries = [
    { q: "qué sabe Diego de Terraform", locale: "es" as const },
    { q: "tell me about reinforcement learning projects", locale: "en" as const },
    { q: "experiencia con Go y AWS", locale: "es" as const }
  ];
  for (const { q, locale } of queries) {
    console.log(`\n[test] query (${locale}): "${q}"`);
    const queryEmbedding = await embed(q);
    const hits = await hybridSearchKB({
      queryText: q,
      queryEmbedding,
      locale,
      k: 4
    });
    hits.forEach((h, i) => {
      console.log(
        `  ${i + 1}. [${h.sourceType}:${h.sourceId}] ${h.title} (score ${h.score.toFixed(4)})`
      );
      console.log(`     ${h.content.slice(0, 120).replace(/\s+/g, " ")}…`);
    });
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
