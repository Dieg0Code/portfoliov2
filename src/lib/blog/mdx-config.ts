import remarkGfm from "remark-gfm";
import rehypePrettyCode, { type Options as PrettyCodeOptions } from "rehype-pretty-code";
import type { MDXRemoteProps } from "next-mdx-remote/rsc";

const prettyCodeOptions: PrettyCodeOptions = {
  theme: {
    dark: "github-dark-dimmed",
    light: "github-light"
  },
  keepBackground: false,
  defaultLang: "plaintext"
};

export const mdxOptions: MDXRemoteProps["options"] = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]]
  },
  parseFrontmatter: false
};
