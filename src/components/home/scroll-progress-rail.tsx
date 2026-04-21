"use client";

import { useEffect, useRef, useState } from "react";

const RAIL_HEIGHT = 14;
const TRAIL_MS = 420;

type Echo = { pos: number; at: number };

export function ScrollProgressRail() {
  const [progress, setProgress] = useState(0);
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const frameRef = useRef(0);
  const lastPosRef = useRef(0);
  const tickRef = useRef(0);

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

  useEffect(() => {
    if (pos === lastPosRef.current) return;
    const now = performance.now();
    setEchoes((prev) => {
      const filtered = prev.filter((e) => now - e.at < TRAIL_MS && e.pos !== pos);
      return [...filtered, { pos: lastPosRef.current, at: now }].slice(-3);
    });
    lastPosRef.current = pos;
  }, [pos]);

  useEffect(() => {
    if (echoes.length === 0) return;
    const tick = () => {
      const now = performance.now();
      setEchoes((prev) => prev.filter((e) => now - e.at < TRAIL_MS));
      tickRef.current = window.requestAnimationFrame(tick);
    };
    tickRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (tickRef.current) window.cancelAnimationFrame(tickRef.current);
    };
  }, [echoes.length]);

  const now = performance.now();
  const echoMap = new Map<number, number>();
  for (const e of echoes) {
    const age = (now - e.at) / TRAIL_MS;
    const intensity = Math.max(0, 1 - age);
    const prior = echoMap.get(e.pos) ?? 0;
    if (intensity > prior) echoMap.set(e.pos, intensity);
  }

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
        const echoIntensity = echoMap.get(i) ?? 0;
        const state = isActive ? "active" : echoIntensity > 0 ? "echo" : "idle";
        const glyph = isActive
          ? "●"
          : echoIntensity > 0.55
            ? "∙"
            : echoIntensity > 0
              ? "◦"
              : "·";
        const pct = Math.round((i / (RAIL_HEIGHT - 1)) * 100);
        return (
          <button
            key={i}
            type="button"
            className="scroll-rail__row"
            data-state={state}
            onClick={() => jumpTo(i)}
            aria-label={`Scroll to ${pct}%`}
            style={
              state === "echo"
                ? { opacity: 0.5 + echoIntensity * 0.4 }
                : undefined
            }
          >
            {glyph}
          </button>
        );
      })}
    </div>
  );
}
