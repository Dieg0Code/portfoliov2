import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { SiteHeader } from "@/components/shared/site-header";
import { PostHeader } from "@/components/blog/post-header";
import { PostFooter } from "@/components/blog/post-footer";
import { mdxComponents } from "@/components/blog/mdx-components";
import { ScrollProgressRail } from "@/components/home/scroll-progress-rail";
import { getAllPostMeta, getPostBySlug } from "@/lib/blog/posts";
import { mdxOptions } from "@/lib/blog/mdx-config";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const nav = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" }
];

export async function generateStaticParams() {
  const all = await getAllPostMeta();
  return all.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: `${post.meta.title} — Diego Obando`,
    description: post.meta.excerpt || undefined
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const all = await getAllPostMeta();
  const idx = all.findIndex((m) => m.slug === slug);
  const next = idx > 0 ? all[idx - 1] : undefined;
  const prev = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : undefined;

  return (
    <main className="shell">
      <SiteHeader
        strapline="Notas técnicas — IA aplicada, backend, docencia."
        nav={nav}
        current="/blog"
      />

      <article className="section section--tight blog-post">
        <PostHeader meta={post.meta} />
        <div className="blog-prose">
          <MDXRemote
            source={post.source}
            components={mdxComponents}
            options={mdxOptions}
          />
        </div>
        <PostFooter prev={prev} next={next} locale={post.meta.locale} />
      </article>

      <ScrollProgressRail />
    </main>
  );
}
