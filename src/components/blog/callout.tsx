import type { ReactNode } from "react";

type CalloutTone = "info" | "warn" | "success" | "note";

type CalloutProps = {
  tone?: CalloutTone;
  title?: string;
  children: ReactNode;
};

export function Callout({ tone = "note", title, children }: CalloutProps) {
  return (
    <aside className={`blog-callout blog-callout--${tone}`} role="note">
      {title && <p className="blog-callout__title">{title}</p>}
      <div className="blog-callout__body">{children}</div>
    </aside>
  );
}
