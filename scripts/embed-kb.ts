/* eslint-disable no-console */
// Fase 1 KB builder.
// Run with: npm run embed:kb
//
// Pipeline:
//   1. Load posts (MDX frontmatter + body) and projects (content.ts).
//   2. Compose static bio + stack blocks from content.ts.
//   3. Chunk each source (posts by headings, rest as single doc).
//   4. Hash content. Skip rows whose content_hash already matches in DB.
//   5. Batch-embed new/changed chunks. Upsert. Delete stale rows for this source_id.

import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { createHash } from "node:crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "../src/lib/agent/memory/client";
import { embedBatch } from "../src/lib/agent/embeddings/client";
import { encodeTokens } from "../src/lib/agent/token-budget";
import { getAllPostMeta, getPostBySlug } from "../src/lib/blog/posts";
import { homeContent, contactEmail, githubProfile } from "../src/components/home/content";
import type { PostLocale } from "../src/lib/blog/types";

type PendingChunk = {
  source_type: "post" | "project" | "bio" | "faq" | "github_summary";
  source_id: string;
  chunk_index: number;
  title: string;
  content: string;
  url: string | null;
  locale: "es" | "en";
  metadata: Record<string, unknown>;
  content_hash: string;
};

const MAX_CHUNK_TOKENS = 480;
const MIN_CHUNK_TOKENS = 40;
const TARGET_CHUNK_CHARS = 1600;

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function stripMdxFrontmatter(raw: string): string {
  // readPostFile already strips frontmatter via gray-matter — source is body.
  return raw.trim();
}

// Heading-aware chunker. Splits on h2/h3, falls back to paragraph-split when
// a section exceeds MAX_CHUNK_TOKENS.
function chunkMarkdown(body: string): string[] {
  const text = stripMdxFrontmatter(body);
  if (!text) return [];

  const sections: string[] = [];
  let current = "";
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (/^#{1,3}\s/.test(line) && current.length > 0) {
      sections.push(current.trim());
      current = line + "\n";
    } else {
      current += line + "\n";
    }
  }
  if (current.trim()) sections.push(current.trim());

  const chunks: string[] = [];
  for (const sec of sections) {
    if (encodeTokens(sec) <= MAX_CHUNK_TOKENS) {
      chunks.push(sec);
      continue;
    }
    const paras = sec.split(/\n{2,}/);
    let buf = "";
    for (const p of paras) {
      const tentative = buf ? `${buf}\n\n${p}` : p;
      if (encodeTokens(tentative) > MAX_CHUNK_TOKENS && buf) {
        chunks.push(buf.trim());
        buf = p;
      } else {
        buf = tentative;
      }
    }
    if (buf.trim()) chunks.push(buf.trim());
  }
  return chunks.filter((c) => encodeTokens(c) >= MIN_CHUNK_TOKENS);
}

async function buildPostChunks(): Promise<PendingChunk[]> {
  const metas = await getAllPostMeta();
  const out: PendingChunk[] = [];
  for (const meta of metas) {
    const post = await getPostBySlug(meta.slug);
    if (!post) continue;
    const pieces = chunkMarkdown(post.source);
    pieces.forEach((content, idx) => {
      out.push({
        source_type: "post",
        source_id: meta.slug,
        chunk_index: idx,
        title: meta.title,
        content,
        url: `/blog/${meta.slug}`,
        locale: meta.locale as PostLocale,
        metadata: {
          date: meta.date,
          tags: meta.tags,
          excerpt: meta.excerpt
        },
        content_hash: sha(content)
      });
    });
  }
  return out;
}

function buildProjectChunks(): PendingChunk[] {
  const out: PendingChunk[] = [];
  (["es", "en"] as const).forEach((locale) => {
    const projects = homeContent[locale].work.projects;
    projects.forEach((p) => {
      const moduleLines = p.modules && p.modules.length > 0
        ? `Módulos/asignaturas: ${p.modules
            .map((m) => `${m.code} ${m.title}`)
            .join("; ")}`
        : "";
      const content = [
        `Título: ${p.title}`,
        p.kicker ? `Vertical: ${p.kicker}` : "",
        `Resumen: ${p.summary.replace(/\*\*/g, "")}`,
        moduleLines,
        p.tags.length ? `Tags: ${p.tags.join(", ")}` : "",
        p.href ? `Enlace: ${p.href}` : "",
        p.isExperiment ? "Tipo: experimento" : "Tipo: proyecto destacado"
      ]
        .filter(Boolean)
        .join("\n");
      const id = p.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      out.push({
        source_type: "project",
        source_id: id,
        chunk_index: 0,
        title: p.title,
        content,
        url: p.href ?? null,
        locale,
        metadata: {
          tags: p.tags,
          isExperiment: Boolean(p.isExperiment),
          kicker: p.kicker ?? null
        },
        content_hash: sha(content)
      });
    });
  });
  return out;
}

function buildBioChunks(): PendingChunk[] {
  const out: PendingChunk[] = [];
  (["es", "en"] as const).forEach((locale) => {
    const c = homeContent[locale];
    const content = [
      `${c.brand.name} — ${c.brand.strapline}`,
      c.hero.lede,
      c.hero.asideBody,
      `Contacto: ${contactEmail} · GitHub: ${githubProfile}`
    ].join("\n\n");
    out.push({
      source_type: "bio",
      source_id: "home-intro",
      chunk_index: 0,
      title: `${c.brand.name} — ${locale.toUpperCase()}`,
      content,
      url: "/",
      locale,
      metadata: {},
      content_hash: sha(content)
    });
  });
  return out;
}

async function fetchExistingHashes(): Promise<Map<string, string>> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("kb_documents")
    .select("source_type,source_id,chunk_index,locale,content_hash");
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const r = row as {
      source_type: string; source_id: string;
      chunk_index: number; locale: string; content_hash: string;
    };
    map.set(
      `${r.source_type}|${r.source_id}|${r.chunk_index}|${r.locale}`,
      r.content_hash
    );
  }
  return map;
}

async function deleteStaleRows(pending: PendingChunk[]): Promise<void> {
  const sb = getSupabaseAdmin();
  // Per (source_type, source_id, locale), delete rows whose chunk_index is not
  // in the new pending set. Handles posts that shrank after an edit.
  const byKey = new Map<string, Set<number>>();
  for (const c of pending) {
    const key = `${c.source_type}|${c.source_id}|${c.locale}`;
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key)!.add(c.chunk_index);
  }
  for (const [key, indices] of byKey) {
    const [source_type, source_id, locale] = key.split("|");
    const keep = Array.from(indices);
    const { error } = await sb
      .from("kb_documents")
      .delete()
      .eq("source_type", source_type)
      .eq("source_id", source_id)
      .eq("locale", locale)
      .not("chunk_index", "in", `(${keep.join(",")})`);
    if (error) {
      console.warn(`[embed-kb] delete stale for ${key} failed:`, error.message);
    }
  }
}

async function run(): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local. Aborting."
    );
    process.exit(1);
  }
  if (!process.env.GITHUB_MODELS_TOKEN) {
    console.error("Missing GITHUB_MODELS_TOKEN in .env.local. Aborting.");
    process.exit(1);
  }

  console.log("[embed-kb] building chunk set…");
  const pending: PendingChunk[] = [
    ...(await buildPostChunks()),
    ...buildProjectChunks(),
    ...buildBioChunks()
  ];
  console.log(`[embed-kb] ${pending.length} total chunks assembled.`);

  const existing = await fetchExistingHashes();
  const toEmbed = pending.filter((p) => {
    const key = `${p.source_type}|${p.source_id}|${p.chunk_index}|${p.locale}`;
    return existing.get(key) !== p.content_hash;
  });
  console.log(
    `[embed-kb] ${toEmbed.length} chunks need (re)embedding, ${pending.length - toEmbed.length} unchanged.`
  );

  if (toEmbed.length > 0) {
    console.log("[embed-kb] embedding…");
    const vectors = await embedBatch(toEmbed.map((c) => `${c.title}\n\n${c.content}`));
    const rows = toEmbed.map((c, i) => ({
      ...c,
      metadata: c.metadata,
      embedding: vectors[i]
    }));
    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from("kb_documents")
      .upsert(rows, {
        onConflict: "source_type,source_id,chunk_index,locale"
      });
    if (error) {
      console.error("[embed-kb] upsert failed:", error.message);
      process.exit(1);
    }
    console.log(`[embed-kb] upserted ${rows.length} rows.`);
  }

  console.log("[embed-kb] pruning stale chunks…");
  await deleteStaleRows(pending);

  console.log("[embed-kb] done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
