import type { PostMeta } from "@/lib/blog/types";

type PostHeaderProps = {
  meta: PostMeta;
};

function formatDate(iso: string, locale: "es" | "en"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale === "es" ? "es-CL" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export function PostHeader({ meta }: PostHeaderProps) {
  return (
    <header className="blog-post__header">
      <p className="eyebrow">
        {meta.locale === "es" ? "Entrada" : "Post"} / {meta.date.slice(0, 7)}
      </p>
      <h1 className="blog-post__title">{meta.title}</h1>
      {meta.excerpt && <p className="lead blog-post__excerpt">{meta.excerpt}</p>}
      <div className="blog-post__meta">
        <span className="micro-note">{formatDate(meta.date, meta.locale)}</span>
        <span className="micro-note">
          {meta.readingMinutes} {meta.locale === "es" ? "min de lectura" : "min read"}
        </span>
      </div>
      {meta.tags.length > 0 && (
        <div className="tag-list" aria-label="Tags">
          {meta.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}
      {meta.cover && (
        <div className="blog-post__cover">
          {/* Cover dimensions are author-controlled frontmatter and may be unknown. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={meta.cover} alt="" loading="eager" />
        </div>
      )}
    </header>
  );
}
