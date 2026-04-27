import remarkGfm from "remark-gfm";
import rehypePrettyCode, { type Options as PrettyCodeOptions } from "rehype-pretty-code";
import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import { createHighlighter } from "shiki";
import { archiveDark } from "./shiki-theme";
import { remarkMermaid } from "./remark-mermaid";

const prettyCodeOptions: PrettyCodeOptions = {
  theme: archiveDark,
  keepBackground: true,
  defaultLang: "plaintext",
  getHighlighter: (options) =>
    createHighlighter({
      ...options,
      themes: [archiveDark]
    })
};

export const mdxOptions: MDXRemoteProps["options"] = {
  mdxOptions: {
    remarkPlugins: [remarkMermaid, remarkGfm],
    rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]]
  },
  parseFrontmatter: false
};
