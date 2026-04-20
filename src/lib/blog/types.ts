export type PostLocale = "es" | "en";

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  cover?: string;
  readingMinutes: number;
  locale: PostLocale;
};

export type Post = {
  meta: PostMeta;
  source: string;
};
