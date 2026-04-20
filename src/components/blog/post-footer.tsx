import Link from "next/link";
import type { PostMeta } from "@/lib/blog/types";

type PostFooterProps = {
  prev?: PostMeta;
  next?: PostMeta;
  locale: "es" | "en";
};

export function PostFooter({ prev, next, locale }: PostFooterProps) {
  const prevLabel = locale === "es" ? "Anterior" : "Previous";
  const nextLabel = locale === "es" ? "Siguiente" : "Next";
  const indexLabel = locale === "es" ? "Volver al blog" : "Back to blog";

  return (
    <footer className="blog-post__footer">
      <div className="blog-post__nav">
        {prev ? (
          <Link className="blog-post__nav-link" href={`/blog/${prev.slug}`}>
            <span className="micro-note">← {prevLabel}</span>
            <span>{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            className="blog-post__nav-link blog-post__nav-link--right"
            href={`/blog/${next.slug}`}
          >
            <span className="micro-note">{nextLabel} →</span>
            <span>{next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </div>
      <Link className="ghost-link" href="/blog">
        ← {indexLabel}
      </Link>
    </footer>
  );
}
