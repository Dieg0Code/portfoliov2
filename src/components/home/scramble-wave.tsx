"use client";

import { useEffect, useRef, useState } from "react";

const SCRAMBLE_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#@%=+/<>[]";
const SCRAMBLE_TICK_MS = 70;
const SCRAMBLE_HEAD = 0.15;
const SCRAMBLE_TAIL = 0.25;

function randomChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)] ?? "#";
}

type ScrambleWaveProps = {
  text: string;
  activeKey: number;
  duration?: number;
  charWindow?: number;
  indexOffset?: number;
  totalChars?: number;
  className?: string;
};

export function ScrambleWave({
  text,
  activeKey,
  duration = 1800,
  charWindow = 0.22,
  indexOffset = 0,
  totalChars,
  className
}: ScrambleWaveProps) {
  const chars = Array.from(text);
  const total = totalChars ?? chars.length;
  const [progress, setProgress] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const glyphRef = useRef<Map<number, { char: string; tickAt: number }>>(new Map());

  useEffect(() => {
    if (activeKey === 0) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    glyphRef.current.clear();
    const start = performance.now();
    const tick = () => {
      const t = performance.now() - start;
      const p = Math.min(1, t / duration);
      setElapsed(t);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        const reset = requestAnimationFrame(() => {
          glyphRef.current.clear();
          setProgress(-1);
          setElapsed(0);
        });
        rafRef.current = reset;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [activeKey, duration]);

  const denominator = Math.max(total - 1, 1);

  return (
    <span className={className} aria-label={text}>
      {chars.map((ch, i) => {
        const globalIndex = indexOffset + i;
        const startP = (globalIndex / denominator) * (1 - charWindow);
        const endP = startP + charWindow;
        const isSpace = ch === " " || ch === "\u00a0";
        let displayChar = ch;
        let isActive = false;
        let isScrambling = false;

        if (progress >= 0 && !isSpace && progress >= startP && progress < endP) {
          isActive = true;
          const localProgress = (progress - startP) / charWindow;
          if (localProgress >= SCRAMBLE_HEAD && localProgress <= 1 - SCRAMBLE_TAIL) {
            isScrambling = true;
            const entry = glyphRef.current.get(globalIndex);
            if (!entry || elapsed - entry.tickAt >= SCRAMBLE_TICK_MS) {
              const next = { char: randomChar(), tickAt: elapsed };
              glyphRef.current.set(globalIndex, next);
              displayChar = next.char;
            } else {
              displayChar = entry.char;
            }
          }
        }

        if (isSpace) {
          return (
            <span key={i} aria-hidden="true" className="scramble-wave__char scramble-wave__char--space">
              {ch}
            </span>
          );
        }

        const classes = ["scramble-wave__char"];
        if (isActive) classes.push("is-active");
        if (isScrambling) classes.push("is-scrambling");

        return (
          <span key={i} aria-hidden="true" className={classes.join(" ")}>
            {displayChar}
          </span>
        );
      })}
    </span>
  );
}
