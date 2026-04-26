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
        // `theme: "base"` requires a *complete* themeVariables map; missing
        // keys make mermaid v11 crash with "Cannot read .replace of
        // undefined" deep in its color derivation. `neutral` is fully
        // pre-populated; we apply Archive Aesthetic via CSS on the SVG.
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          fontFamily: 'var(--font-mono, ui-monospace, "SFMono-Regular", monospace)',
          securityLevel: "strict"
        });

        const id = `mermaid-${counter++}`;
        const trimmed = chart.trim();
        const { svg: rendered } = await mermaid.render(id, trimmed);
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
