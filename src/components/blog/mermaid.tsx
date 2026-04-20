"use client";

import { useEffect, useRef, useState } from "react";

type MermaidProps = {
  chart: string;
  caption?: string;
};

let counter = 0;

export function Mermaid({ chart, caption }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          fontFamily: "var(--font-mono, monospace)",
          themeVariables: {
            background: "#fcf9f1",
            primaryColor: "#fcf9f1",
            primaryTextColor: "#0f0f10",
            primaryBorderColor: "#0f0f10",
            lineColor: "#0f0f10",
            secondaryColor: "#e9e3d2",
            tertiaryColor: "#ffffff"
          }
        });

        const id = `mermaid-${counter++}`;
        const { svg: rendered } = await mermaid.render(id, chart);
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
  }, [chart]);

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
