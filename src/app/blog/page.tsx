import type { Metadata } from "next";
import { SiteHeader } from "@/components/shared/site-header";
import { PostCard } from "@/components/blog/post-card";
import { getAllPostMeta } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog — Diego Obando",
  description: "Notas técnicas sobre IA aplicada, backend y docencia."
};

const nav = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" }
];

export default async function BlogIndexPage() {
  const posts = await getAllPostMeta();

  return (
    <main className="shell">
      <SiteHeader
        strapline="Notas técnicas — IA aplicada, backend, docencia."
        nav={nav}
        current="/blog"
      />

      <section className="section section--tight blog-index">
        <div className="section__heading">
          <p className="eyebrow">Blog</p>
          <h1>Notas técnicas.</h1>
          <p className="lead lead--compact">
            Apuntes sobre lo que estoy construyendo, aprendiendo y enseñando —
            con código, diagramas y detalle suficiente para que sirva.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="micro-note blog-index__empty">
            Sin entradas todavía. Pronto.
          </p>
        ) : (
          <div className="blog-index__list">
            {posts.map((meta, index) => (
              <PostCard key={meta.slug} meta={meta} index={index} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
