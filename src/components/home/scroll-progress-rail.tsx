"use client";

import { useEffect, useRef, useState } from "react";

const RAIL_HEIGHT = 14;

export function ScrollProgressRail() {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const update = () => {
      frameRef.current = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const next = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      setProgress(next);
    };
    const onScroll = () => {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const pos = Math.round(progress * (RAIL_HEIGHT - 1));

  const jumpTo = (index: number) => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    const target = (index / (RAIL_HEIGHT - 1)) * max;
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <div className="scroll-rail">
      {Array.from({ length: RAIL_HEIGHT }, (_, i) => {
        const isActive = i === pos;
        const pct = Math.round((i / (RAIL_HEIGHT - 1)) * 100);
        return (
          <button
            key={i}
            type="button"
            className="scroll-rail__row"
            data-state={isActive ? "active" : "idle"}
            onClick={() => jumpTo(i)}
            aria-label={`Scroll to ${pct}%`}
          >
            {isActive ? "●" : "·"}
          </button>
        );
      })}
    </div>
  );
}
