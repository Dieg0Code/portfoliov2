"use client";

import { type ReactNode, isValidElement, useEffect, useRef, useState } from "react";

type MermaidProps = {
  chart?: string;
  children?: ReactNode;
  caption?: string;
};

let counter = 0;

function nodeToString(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToString).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return nodeToString(props.children);
  }
  return "";
}

function extractSource(chart: string | undefined, children: ReactNode): string {
  if (typeof chart === "string" && chart.trim()) return chart;
  return nodeToString(children);
}

export function Mermaid({ chart, children, caption }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const source = extractSource(chart, children).trim();

  useEffect(() => {
    let cancelled = false;
    if (!source) {
      setError("Mermaid: no chart source provided");
      return;
    }

    const render = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const ink = "#0f0f10";
        const bone = "#fcf9f1";
        const tan = "#ece3d0";
        const tanDeep = "#dcd2bc";
        const accent = "#8a1c2b";
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            background: bone,
            primaryColor: bone,
            primaryTextColor: ink,
            primaryBorderColor: ink,
            secondaryColor: tan,
            secondaryTextColor: ink,
            secondaryBorderColor: ink,
            tertiaryColor: tanDeep,
            tertiaryTextColor: ink,
            tertiaryBorderColor: ink,
            lineColor: ink,
            textColor: ink,
            mainBkg: bone,
            secondBkg: tan,
            nodeBorder: ink,
            nodeTextColor: ink,
            clusterBkg: tanDeep,
            clusterBorder: ink,
            edgeLabelBackground: bone,
            titleColor: ink,
            labelTextColor: ink,
            errorBkgColor: bone,
            errorTextColor: accent,
            fontFamily: 'ui-monospace, "SFMono-Regular", "Space Mono", monospace',
            fontSize: "20px"
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: false,
            curve: "basis",
            padding: 20,
            nodeSpacing: 60,
            rankSpacing: 70
          },
          sequence: { useMaxWidth: true },
          gantt: { useMaxWidth: true },
          securityLevel: "strict"
        });

        const id = `mermaid-${counter++}`;
        const { svg: rendered } = await mermaid.render(id, source);
        if (!cancelled) setSvg(rendered);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Mermaid render failed");
        }
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [source]);

  return (
    <figure className="blog-mermaid">
      {error ? (
        <pre className="blog-mermaid__error">{error}</pre>
      ) : svg ? (
        <div
          ref={containerRef}
          className="blog-mermaid__svg"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="blog-mermaid__placeholder">loading diagram…</div>
      )}
      {caption && <figcaption className="blog-mermaid__caption">{caption}</figcaption>}
    </figure>
  );
}
