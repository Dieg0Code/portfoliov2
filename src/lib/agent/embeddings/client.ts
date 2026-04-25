import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import {
  embed as aiEmbed,
  embedMany as aiEmbedMany,
  type EmbeddingModel
} from "ai";
import { cacheGet, cacheKey, cacheSet } from "./cache";

const EMBED_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;
const BATCH_SIZE = 16;

// Lazy-init: reading process.env at module-load time breaks scripts that
// load dotenv after imports. Defer to first use, cache the instance.
let providerSingleton: OpenAIProvider | null = null;
let modelSingleton: EmbeddingModel | null = null;

function getModel(): EmbeddingModel {
  if (modelSingleton) return modelSingleton;
  const apiKey = process.env.GITHUB_MODELS_TOKEN;
  if (!apiKey) {
    throw new Error("GITHUB_MODELS_TOKEN is not set");
  }
  providerSingleton = createOpenAI({
    baseURL: "https://models.inference.ai.azure.com",
    apiKey
  });
  modelSingleton = providerSingleton.embedding(EMBED_MODEL);
  return modelSingleton;
}

export async function embed(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("embed(): empty input");
  const key = cacheKey(trimmed);
  const cached = cacheGet(key);
  if (cached) return cached;
  const { embedding } = await aiEmbed({ model: getModel(), value: trimmed });
  cacheSet(key, embedding);
  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = new Array(texts.length);
  const pending: { idx: number; text: string }[] = [];
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i].trim();
    if (!t) {
      throw new Error(`embedBatch(): empty input at index ${i}`);
    }
    const key = cacheKey(t);
    const cached = cacheGet(key);
    if (cached) {
      out[i] = cached;
    } else {
      pending.push({ idx: i, text: t });
    }
  }
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const slice = pending.slice(i, i + BATCH_SIZE);
    const { embeddings } = await aiEmbedMany({
      model: getModel(),
      values: slice.map((p) => p.text)
    });
    for (let j = 0; j < slice.length; j++) {
      const entry = slice[j];
      const vec = embeddings[j];
      out[entry.idx] = vec;
      cacheSet(cacheKey(entry.text), vec);
    }
  }
  return out;
}
