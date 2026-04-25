import type { KBHit } from "@/lib/agent/memory/retrieve";

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

export function renderKBBlock(hits: KBHit[]): string {
  if (hits.length === 0) return "";
  const lines = hits.map((h) => {
    const head = `- [${h.sourceType}:${h.sourceId}] ${h.title}`;
    const body = `  ${truncate(h.content.replace(/\s+/g, " "), 180)}`;
    const ref = h.url ? ` · ${h.url}` : "";
    return `${head}${ref}\n${body}`;
  });
  return `## KB recuperado (cita por source_type:source_id, no inventes)
${lines.join("\n")}`;
}
