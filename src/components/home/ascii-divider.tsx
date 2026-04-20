import type { ReactNode } from "react";

type AsciiDividerProps = {
  marker?: ReactNode;
  className?: string;
};

const DOT_RULE = "· ".repeat(48).trimEnd();

export function AsciiDivider({
  marker = "◆",
  className
}: AsciiDividerProps) {
  const composed = ["ascii-divider", className].filter(Boolean).join(" ");
  return (
    <div className={composed} aria-hidden="true">
      <span className="ascii-divider__rule">{DOT_RULE}</span>
      <span className="ascii-divider__glyph">{marker}</span>
      <span className="ascii-divider__rule">{DOT_RULE}</span>
    </div>
  );
}
