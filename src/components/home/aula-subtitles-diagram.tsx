type AulaSubtitlesDiagramProps = {
  title: string;
  description: string;
  captureLabel: string;
  relayLabel: string;
  overlayLabel: string;
  liveLabel: string;
  sessionLabel: string;
  captionLineOne: string;
  captionLineTwo: string;
};

export function AulaSubtitlesDiagram({
  title,
  description,
  captureLabel,
  relayLabel,
  overlayLabel,
  liveLabel,
  sessionLabel,
  captionLineOne,
  captionLineTwo
}: AulaSubtitlesDiagramProps) {
  return (
    <svg
      className="aula-subtitles-diagram"
      viewBox="0 0 360 210"
      role="img"
      aria-labelledby="aula-diagram-title aula-diagram-description"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="aula-diagram-title">{title}</title>
      <desc id="aula-diagram-description">{description}</desc>

      <defs>
        <marker
          id="aula-arrow"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path className="aula-subtitles-diagram__arrow" d="M0 0 7 3.5 0 7Z" />
        </marker>
      </defs>

      <text className="aula-subtitles-diagram__label" x="18" y="18">
        01 / {captureLabel}
      </text>
      <text className="aula-subtitles-diagram__label" x="150" y="18">
        02 / {relayLabel}
      </text>
      <text
        className="aula-subtitles-diagram__label"
        x="342"
        y="18"
        textAnchor="end"
      >
        03 / {overlayLabel}
      </text>

      <g className="aula-subtitles-diagram__phone">
        <rect x="24" y="39" width="78" height="137" rx="5" />
        <rect x="32" y="54" width="62" height="95" />
        <path d="M54 47h18M56 164h14" />
        <circle cx="63" cy="102" r="18" />
        <rect x="59" y="83" width="8" height="24" rx="4" />
        <path d="M52 101v4c0 8 5 13 11 13s11-5 11-13v-4M63 118v9M55 127h16" />
        <path
          className="aula-subtitles-diagram__wave"
          d="M38 74h6l4-7 6 14 7-20 7 22 6-12 5 7h9"
        />
        <circle className="aula-subtitles-diagram__live-dot" cx="41" cy="139" r="3" />
        <text className="aula-subtitles-diagram__micro-label" x="49" y="142">
          {liveLabel}
        </text>
      </g>

      <path
        className="aula-subtitles-diagram__route"
        d="M103 107h39"
        markerEnd="url(#aula-arrow)"
      />

      <g className="aula-subtitles-diagram__relay">
        <rect className="aula-subtitles-diagram__relay-shadow" x="153" y="67" width="62" height="77" />
        <rect className="aula-subtitles-diagram__relay-body" x="149" y="63" width="62" height="77" />
        <text className="aula-subtitles-diagram__relay-name" x="180" y="80">
          WSS
        </text>
        <path d="M160 92h40M160 102h27M160 112h34" />
        <circle cx="161" cy="128" r="4" />
        <circle cx="199" cy="128" r="4" />
        <path className="aula-subtitles-diagram__relay-link" d="M165 128h30" />
        <path className="aula-subtitles-diagram__relay-air" d="M161 56c11-10 27-10 38 0m-30-5c6-5 16-5 22 0" />
        <text className="aula-subtitles-diagram__session" x="180" y="158" textAnchor="middle">
          {sessionLabel} · A4E21B
        </text>
      </g>

      <g className="aula-subtitles-diagram__screen">
        <rect className="aula-subtitles-diagram__screen-frame" x="249" y="39" width="94" height="126" />
        <rect className="aula-subtitles-diagram__screen-canvas" x="257" y="49" width="78" height="91" />
        <path className="aula-subtitles-diagram__slide" d="M266 61h38M266 69h24M266 85h60M266 93h46M266 101h52" />

        <rect className="aula-subtitles-diagram__caption-shadow" x="239" y="106" width="114" height="42" />
        <rect className="aula-subtitles-diagram__caption" x="235" y="102" width="114" height="42" />
        <circle className="aula-subtitles-diagram__live-dot" cx="245" cy="112" r="2.5" />
        <text className="aula-subtitles-diagram__caption-live" x="252" y="115">
          {liveLabel}
        </text>
        <text className="aula-subtitles-diagram__caption-copy" x="245" y="128">
          {captionLineOne}
        </text>
        <text className="aula-subtitles-diagram__caption-copy" x="245" y="138">
          {captionLineTwo}
        </text>
      </g>

      <path
        className="aula-subtitles-diagram__route"
        d="M215 107h28"
        markerEnd="url(#aula-arrow)"
      />

      <g className="aula-subtitles-diagram__packet" aria-hidden="true">
        <circle cx="119" cy="107" r="3" />
        <circle cx="227" cy="107" r="3" />
      </g>
    </svg>
  );
}
