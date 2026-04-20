"use client";

import { useEffect, useRef, useState } from "react";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function useInterval(callback: () => void, intervalMs: number, paused: boolean) {
  const saved = useRef(callback);
  saved.current = callback;
  useEffect(() => {
    if (paused) return;
    const tick = () => {
      if (document.visibilityState === "visible") saved.current();
    };
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, paused]);
}

const WAVE_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇"];

export function SignalTicker({
  width = 16,
  intervalMs = 160,
  className
}: {
  width?: number;
  intervalMs?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [buffer, setBuffer] = useState<number[]>(() =>
    Array.from({ length: width }, (_, i) =>
      Math.floor(3 + Math.sin(i * 0.6) * 2)
    )
  );

  useInterval(
    () => {
      setBuffer((prev) => {
        const last = prev[prev.length - 1] ?? 3;
        const delta = Math.floor(Math.random() * 3) - 1;
        const next = Math.max(0, Math.min(WAVE_CHARS.length - 1, last + delta));
        return [...prev.slice(1), next];
      });
    },
    intervalMs,
    reduced
  );

  const text = buffer.map((v) => WAVE_CHARS[v]).join("");
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ fontFamily: "var(--font-mono)", letterSpacing: "-0.05em" }}
    >
      {text}
    </span>
  );
}

const SCAN_WIDTH = 9;

export function ScanIndicator({
  intervalMs = 220,
  className
}: {
  intervalMs?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [pos, setPos] = useState(0);
  const [dir, setDir] = useState(1);

  useInterval(
    () => {
      setPos((p) => {
        let next = p + dir;
        if (next >= SCAN_WIDTH - 1) {
          setDir(-1);
          next = SCAN_WIDTH - 1;
        } else if (next <= 0) {
          setDir(1);
          next = 0;
        }
        return next;
      });
    },
    intervalMs,
    reduced
  );

  const slots = Array.from({ length: SCAN_WIDTH }, (_, i) =>
    i === pos ? "●" : "·"
  ).join("");

  return (
    <span aria-hidden="true" className={className}>
      [{slots}]
    </span>
  );
}

const CURSOR_FRAMES = ["▋", " "];

export function TerminalCursor({
  intervalMs = 520,
  className
}: {
  intervalMs?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useInterval(
    () => setIndex((i) => (i + 1) % CURSOR_FRAMES.length),
    intervalMs,
    reduced
  );

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        display: "inline-block",
        width: "1ch",
        textAlign: "center",
        whiteSpace: "pre"
      }}
    >
      {reduced ? "▋" : CURSOR_FRAMES[index]}
    </span>
  );
}

const MARKER_FRAMES = ["▸", "▹", "▸", "▸"];

export function BreathingMarker({
  intervalMs = 720,
  className
}: {
  intervalMs?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useInterval(
    () => setIndex((i) => (i + 1) % MARKER_FRAMES.length),
    intervalMs,
    reduced
  );

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        display: "inline-block",
        width: "1ch",
        textAlign: "center",
        whiteSpace: "pre"
      }}
    >
      {MARKER_FRAMES[index]}
    </span>
  );
}

const STREAM_FRAMES = [
  "⟩··",
  "·⟩·",
  "··⟩",
  "⟩·⟩",
  "⟩⟩⟩",
  "·⟩⟩",
  "··⟩",
  "···"
];

export function StreamArrows({
  intervalMs = 240,
  className
}: {
  intervalMs?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useInterval(
    () => setIndex((i) => (i + 1) % STREAM_FRAMES.length),
    intervalMs,
    reduced
  );

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        display: "inline-block",
        width: "3ch",
        textAlign: "center",
        letterSpacing: 0,
        whiteSpace: "pre"
      }}
    >
      {STREAM_FRAMES[index]}
    </span>
  );
}

const PULSE_FRAMES = ["·", "∙", "•", "●", "•", "∙"];

export function PulseDot({
  intervalMs = 420,
  className
}: {
  intervalMs?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useInterval(
    () => setIndex((i) => (i + 1) % PULSE_FRAMES.length),
    intervalMs,
    reduced
  );

  return (
    <span aria-hidden="true" className={className}>
      {PULSE_FRAMES[index]}
    </span>
  );
}
