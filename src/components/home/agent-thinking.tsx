"use client";

import { useEffect, useState } from "react";
import type { HomeLocale } from "@/components/home/content";

const SETS: string[][] = [
  ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  ["·", "∙", "•", "●", "•", "∙"],
  ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
  ["·", "✦", "✧", "◇", "✧", "✦"],
  ["╌", "╍", "━", "╍", "╌", "─"],
  ["◜", "◠", "◝", "◞", "◡", "◟"]
];

const LABELS_ES = [
  "pensando",
  "consultando archivo",
  "indexando",
  "buscando",
  "preparando respuesta"
];

const LABELS_EN = [
  "thinking",
  "querying archive",
  "indexing",
  "searching",
  "drafting reply"
];

const FRAME_MS = 90;
const FRAMES_PER_SET = 22;
const LABEL_SWAP_FRAMES = 42;

type Props = { locale: HomeLocale };

export function AgentThinking({ locale }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), FRAME_MS);
    return () => window.clearInterval(id);
  }, []);

  const setIndex = Math.floor(tick / FRAMES_PER_SET) % SETS.length;
  const frames = SETS[setIndex];
  const glyph = frames[tick % frames.length];

  const labels = locale === "es" ? LABELS_ES : LABELS_EN;
  const label = labels[Math.floor(tick / LABEL_SWAP_FRAMES) % labels.length];

  return (
    <span className="agent-thinking" aria-live="polite" aria-label={label}>
      <span className="agent-thinking__glyph" aria-hidden="true">
        {glyph}
      </span>
      <span className="agent-thinking__label">{label}</span>
      <span className="agent-thinking__dots" aria-hidden="true">
        {".".repeat((tick % 4))}
      </span>
    </span>
  );
}
