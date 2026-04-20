import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import { Callout } from "./callout";
import { Figure } from "./figure";
import { Mermaid } from "./mermaid";

export const mdxComponents: MDXRemoteProps["components"] = {
  Callout,
  Figure,
  Mermaid
};
