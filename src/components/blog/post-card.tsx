import Link from "next/link";
import type { PostMeta } from "@/lib/blog/types";

type PostCardProps = {
  meta: PostMeta;
  index: number;
};

export function PostCard({ meta, index }: PostCardProps) {
  return (
    <article className="blog-card">
      <Link className="blog-card__link" href={`/blog/${meta.slug}`}>
        <div className="blog-card__head">
          <span className="blog-card__index">{`0${index + 1}`.slice(-2)}</span>
          <span className="micro-note">{meta.date.slice(0, 10)}</span>
          <span className="micro-note">
            {meta.readingMinutes} {meta.locale === "es" ? "min" : "min"}
          </span>
        </div>
        <h2 className="blog-card__title">{meta.title}</h2>
        {meta.excerpt && <p className="blog-card__excerpt">{meta.excerpt}</p>}
        {meta.tags.length > 0 && (
          <div className="tag-list" aria-label="Tags">
            {meta.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </Link>
    </article>
  );
}
