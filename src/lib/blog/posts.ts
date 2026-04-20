import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import type { Post, PostLocale, PostMeta } from "./types";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const FILE_NAME_PATTERN = /^(\d{4}-\d{2}-\d{2})-(.+)\.mdx$/;

type FrontmatterInput = {
  title?: unknown;
  date?: unknown;
  excerpt?: unknown;
  tags?: unknown;
  cover?: unknown;
  locale?: unknown;
  draft?: unknown;
};

async function readBlogDir(): Promise<string[]> {
  try {
    const entries = await fs.readdir(BLOG_DIR);
    return entries.filter((name) => name.endsWith(".mdx"));
  } catch {
    return [];
  }
}

function parseSlugAndDate(filename: string): { slug: string; date: string } | null {
  const match = FILE_NAME_PATTERN.exec(filename);
  if (!match) return null;
  return { date: match[1], slug: match[2] };
}

function coerceString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function coerceTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function coerceLocale(value: unknown): PostLocale {
  return value === "en" ? "en" : "es";
}

async function readPostFile(filename: string): Promise<Post | null> {
  const parsed = parseSlugAndDate(filename);
  if (!parsed) return null;

  const filePath = path.join(BLOG_DIR, filename);
  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(raw);
  const fm = data as FrontmatterInput;

  if (fm.draft === true && process.env.NODE_ENV === "production") {
    return null;
  }

  const stats = readingTime(content);

  const meta: PostMeta = {
    slug: parsed.slug,
    title: coerceString(fm.title, parsed.slug),
    date: coerceString(fm.date, parsed.date),
    excerpt: coerceString(fm.excerpt, ""),
    tags: coerceTags(fm.tags),
    cover: typeof fm.cover === "string" ? fm.cover : undefined,
    readingMinutes: Math.max(1, Math.round(stats.minutes)),
    locale: coerceLocale(fm.locale)
  };

  return { meta, source: content };
}

export async function getAllPostMeta(): Promise<PostMeta[]> {
  const files = await readBlogDir();
  const posts = await Promise.all(files.map(readPostFile));
  return posts
    .filter((p): p is Post => p !== null)
    .map((p) => p.meta)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getAllSlugs(): Promise<string[]> {
  const meta = await getAllPostMeta();
  return meta.map((m) => m.slug);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const files = await readBlogDir();
  for (const filename of files) {
    const parsed = parseSlugAndDate(filename);
    if (parsed && parsed.slug === slug) {
      return readPostFile(filename);
    }
  }
  return null;
}
