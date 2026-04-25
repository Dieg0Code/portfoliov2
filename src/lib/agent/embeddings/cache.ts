// Process-scoped LRU cache for embeddings. Keyed by sha256 of input text.
// Avoids re-embedding identical queries within the same server process —
// e.g. repeated "qué sabe de go" from different visitors hitting the same
// warm Node process.

import { createHash } from "node:crypto";

const MAX_ENTRIES = 512;

type Entry = { value: number[]; at: number };

const store = new Map<string, Entry>();

export function cacheKey(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function cacheGet(key: string): number[] | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  hit.at = Date.now();
  return hit.value;
}

export function cacheSet(key: string, value: number[]): void {
  if (store.size >= MAX_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [k, v] of store) {
      if (v.at < oldestAt) {
        oldestAt = v.at;
        oldestKey = k;
      }
    }
    if (oldestKey) store.delete(oldestKey);
  }
  store.set(key, { value, at: Date.now() });
}
