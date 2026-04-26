import { getSupabaseAdmin, isSupabaseConfigured } from "./client";
import { embed } from "../embeddings/client";

export type MemoryKind = "preference" | "interest" | "intent" | "fact";

export type VisitorFact = {
  id: number;
  kind: MemoryKind;
  content: string;
  salience: number;
};

const TTL_DAYS: Record<MemoryKind, number | null> = {
  preference: 90,
  interest: 30,
  intent: 14,
  fact: null
};

const SALIENCE_BY_KIND: Record<MemoryKind, number> = {
  intent: 0.8,
  fact: 0.7,
  preference: 0.6,
  interest: 0.5
};

// Light PII filter — rejects content with phone-like, ID-like, or email-like
// patterns. Belt-and-suspenders behind the in-prompt policy.
export function containsPII(text: string): boolean {
  if (/[\w._%+-]+@[\w.-]+\.[a-z]{2,}/i.test(text)) return true;
  // Long unbroken digit run (likely phone, DNI, card)
  if (/\b\d{7,}\b/.test(text)) return true;
  // Phone-like: 3-4 number groups separated by spaces / dots / dashes
  if (/(?:\+?\d[\s.\-()]*){9,}/.test(text)) return true;
  return false;
}

function expiresAtFor(kind: MemoryKind): string | null {
  const days = TTL_DAYS[kind];
  if (days === null) return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export async function getRecentVisitorFacts(
  visitorId: string,
  limit = 5
): Promise<VisitorFact[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("agent_memory")
    .select("id, kind, content, salience")
    .eq("visitor_id", visitorId)
    .or("expires_at.is.null,expires_at.gt.now()")
    .order("salience", { ascending: false })
    .order("last_used_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[visitor-memory] getRecent failed:", error.message);
    return [];
  }
  return ((data ?? []) as VisitorFact[]).map((r) => ({
    id: r.id,
    kind: r.kind as MemoryKind,
    content: r.content,
    salience: r.salience
  }));
}

export async function searchVisitorMemory(args: {
  visitorId: string;
  queryText: string;
  queryEmbedding: number[];
  k?: number;
}): Promise<Array<VisitorFact & { score: number }>> {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.rpc("hybrid_search_memory", {
    p_visitor_id: args.visitorId,
    query_embedding: args.queryEmbedding,
    query_text: args.queryText,
    match_count: args.k ?? 4
  });
  if (error) {
    console.warn("[visitor-memory] hybrid_search_memory failed:", error.message);
    return [];
  }
  return (data ?? []) as Array<VisitorFact & { score: number }>;
}

export type RememberResult =
  | { ok: true; id: number; created: boolean }
  | { ok: false; reason: string };

export async function rememberVisitorFact(args: {
  visitorId: string;
  kind: MemoryKind;
  content: string;
  sourceConvId: string | null;
}): Promise<RememberResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "supabase not configured" };
  }
  const trimmed = args.content.trim();
  if (trimmed.length < 8 || trimmed.length > 280) {
    return { ok: false, reason: "content length out of bounds (8-280 chars)" };
  }
  if (containsPII(trimmed)) {
    return { ok: false, reason: "content matches PII pattern; refused" };
  }
  const sb = getSupabaseAdmin();
  let embedding: number[];
  try {
    embedding = await embed(trimmed);
  } catch (err) {
    console.warn("[visitor-memory] embed failed:", err);
    return { ok: false, reason: "embedding failed" };
  }
  const row = {
    visitor_id: args.visitorId,
    kind: args.kind,
    content: trimmed,
    salience: SALIENCE_BY_KIND[args.kind],
    source_conv_id: args.sourceConvId,
    expires_at: expiresAtFor(args.kind),
    embedding,
    last_used_at: new Date().toISOString()
  };
  const { data, error } = await sb
    .from("agent_memory")
    .upsert(row, { onConflict: "visitor_id,kind,content" })
    .select("id")
    .single();
  if (error || !data) {
    console.warn("[visitor-memory] upsert failed:", error?.message);
    return { ok: false, reason: "db error" };
  }
  return { ok: true, id: (data as { id: number }).id, created: true };
}

export async function touchMemoryUse(ids: number[]): Promise<void> {
  if (ids.length === 0 || !isSupabaseConfigured()) return;
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  // Best-effort; we don't await use_count atomicity.
  await sb
    .from("agent_memory")
    .update({ last_used_at: now })
    .in("id", ids);
}
