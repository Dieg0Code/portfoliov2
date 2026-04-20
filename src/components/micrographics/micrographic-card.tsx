import type { MicrographicSeed } from "@/lib/micrographics/types";

type MicrographicCardProps = {
  entry: MicrographicSeed;
};

export function MicrographicCard({ entry }: MicrographicCardProps) {
  return (
    <article className="micro-card">
      <div className="micro-card__topline">
        <span>{`Component ${entry.id}`}</span>
        <span className={`micro-card__status micro-card__status--${entry.status}`}>
          {entry.status}
        </span>
      </div>
      <div className="micro-card__preview" aria-hidden="true">
        <div className="micro-card__preview-ring" />
        <div className="micro-card__preview-bar" />
        <div className="micro-card__preview-node" />
      </div>
      <h3>{entry.name}</h3>
      <p>{entry.summary}</p>
      <code>{entry.sourceSvg}</code>
    </article>
  );
}
