import type { Plugin } from "unified";
import type { Root, RootContent, Code } from "mdast";

type MdxJsxFlowElement = {
  type: "mdxJsxFlowElement";
  name: string;
  attributes: Array<{
    type: "mdxJsxAttribute";
    name: string;
    value: string;
  }>;
  children: [];
};

function transformChildren(children: RootContent[]): RootContent[] {
  return children.map((node) => {
    if (node.type === "code" && (node as Code).lang === "mermaid") {
      const code = node as Code;
      return {
        type: "mdxJsxFlowElement",
        name: "Mermaid",
        attributes: [
          { type: "mdxJsxAttribute", name: "chart", value: code.value },
          ...(code.meta
            ? [{ type: "mdxJsxAttribute", name: "caption", value: code.meta }]
            : [])
        ],
        children: []
      } as unknown as MdxJsxFlowElement as unknown as RootContent;
    }
    if ("children" in node && Array.isArray(node.children)) {
      const inner = transformChildren(node.children as RootContent[]);
      (node as { children: RootContent[] }).children = inner;
    }
    return node;
  });
}

export const remarkMermaid: Plugin<[], Root> = () => (tree) => {
  tree.children = transformChildren(tree.children);
};
