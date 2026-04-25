import { getSupabaseAdmin, isSupabaseConfigured } from "./client";

export type KBSourceType = "post" | "project" | "bio" | "faq" | "github_summary";

export type KBHit = {
  id: number;
  sourceType: KBSourceType;
  sourceId: string;
  title: string;
  content: string;
  url: string | null;
  metadata: Record<string, unknown>;
  score: number;
};

type RawHit = {
  id: number;
  source_type: KBSourceType;
  source_id: string;
  title: string;
  content: string;
  url: string | null;
  metadata: Record<string, unknown> | null;
  score: number;
};

export type KBSearchArgs = {
  queryText: string;
  queryEmbedding: number[];
  locale?: "es" | "en";
  sourceFilter?: KBSourceType[];
  k?: number;
};

export async function hybridSearchKB(args: KBSearchArgs): Promise<KBHit[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.rpc("hybrid_search_kb", {
    query_text: args.queryText,
    query_embedding: args.queryEmbedding,
    query_locale: args.locale ?? "es",
    source_filter: args.sourceFilter ?? null,
    match_count: args.k ?? 6
  });
  if (error) {
    console.warn("[retrieve] hybrid_search_kb failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as RawHit[];
  return rows.map((r) => ({
    id: r.id,
    sourceType: r.source_type,
    sourceId: r.source_id,
    title: r.title,
    content: r.content,
    url: r.url,
    metadata: r.metadata ?? {},
    score: r.score
  }));
}
