type NemMemoryDiagramProps = {
  title: string;
  description: string;
  agentsLabel: string;
  versionsLabel: string;
};

export function NemMemoryDiagram({
  title,
  description,
  agentsLabel,
  versionsLabel
}: NemMemoryDiagramProps) {
  return (
    <svg
      className="nem-memory-diagram"
      viewBox="0 0 320 200"
      role="img"
      aria-labelledby="nem-diagram-title nem-diagram-description"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="nem-diagram-title">{title}</title>
      <desc id="nem-diagram-description">{description}</desc>

      <defs>
        <marker
          id="nem-arrow"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path className="nem-memory-diagram__arrow" d="M0 0 7 3.5 0 7Z" />
        </marker>
      </defs>

      <text className="nem-memory-diagram__label" x="16" y="17">
        {agentsLabel}
      </text>
      <text
        className="nem-memory-diagram__label"
        x="304"
        y="17"
        textAnchor="end"
      >
        {versionsLabel}
      </text>

      <g className="nem-memory-diagram__agents">
        <g className="nem-memory-diagram__agent nem-memory-diagram__agent--one" transform="translate(16 32)">
          <rect width="48" height="36" />
          <text x="8" y="14">A1</text>
          <path d="M8 24h10m4 0h8" />
          <circle className="nem-memory-diagram__agent-led" cx="38" cy="24" r="2.5" />
        </g>
        <g className="nem-memory-diagram__agent nem-memory-diagram__agent--two" transform="translate(16 92)">
          <rect width="48" height="36" />
          <text x="8" y="14">A2</text>
          <path d="M8 24h10m4 0h8" />
          <circle className="nem-memory-diagram__agent-led" cx="38" cy="24" r="2.5" />
        </g>
        <g className="nem-memory-diagram__agent nem-memory-diagram__agent--three" transform="translate(16 152)">
          <rect width="48" height="36" />
          <text x="8" y="14">A3</text>
          <path d="M8 24h10m4 0h8" />
          <circle className="nem-memory-diagram__agent-led" cx="38" cy="24" r="2.5" />
        </g>
      </g>

      <g
        className="nem-memory-diagram__routes"
        markerEnd="url(#nem-arrow)"
      >
        <path d="M64 50C91 50 91 85 116 92" />
        <path d="M64 110H116" />
        <path d="M64 170C91 170 91 135 116 128" />
      </g>

      <g className="nem-memory-diagram__route-pulses">
        <path className="nem-memory-diagram__route-pulse nem-memory-diagram__route-pulse--one" pathLength="1" d="M64 50C91 50 91 85 116 92" />
        <path className="nem-memory-diagram__route-pulse nem-memory-diagram__route-pulse--two" pathLength="1" d="M64 110H116" />
        <path className="nem-memory-diagram__route-pulse nem-memory-diagram__route-pulse--three" pathLength="1" d="M64 170C91 170 91 135 116 128" />
      </g>

      <g className="nem-memory-diagram__store">
        <rect className="nem-memory-diagram__store-backplate" x="124" y="76" width="88" height="70" />
        <rect x="120" y="72" width="88" height="70" />
        <path d="M120 94h88" />
        <text className="nem-memory-diagram__store-name" x="164" y="89">
          NEM
        </text>
        <path className="nem-memory-diagram__store-lines" d="M134 108h46M134 118h60M134 128h38" />
        <g className="nem-memory-diagram__writers">
          <path className="nem-memory-diagram__writer nem-memory-diagram__writer--one" pathLength="1" d="M134 108h46" />
          <path className="nem-memory-diagram__writer nem-memory-diagram__writer--two" pathLength="1" d="M134 118h60" />
          <path className="nem-memory-diagram__writer nem-memory-diagram__writer--three" pathLength="1" d="M134 128h38" />
        </g>
        <circle className="nem-memory-diagram__store-led" cx="195" cy="128" r="4" />
      </g>

      <path
        className="nem-memory-diagram__output"
        d="M212 110h18"
        markerEnd="url(#nem-arrow)"
      />
      <path
        className="nem-memory-diagram__output-pulse"
        pathLength="1"
        d="M212 110h18"
      />

      <g className="nem-memory-diagram__versions">
        <path d="M239 110h62" />
        <circle className="nem-memory-diagram__commit-ring" cx="302" cy="110" r="13" />
        <circle cx="242" cy="110" r="9" />
        <circle cx="272" cy="110" r="9" />
        <circle className="nem-memory-diagram__current-version" cx="302" cy="110" r="9" />
        <text x="242" y="113">1</text>
        <text x="272" y="113">2</text>
        <text className="nem-memory-diagram__current-version-label" x="302" y="113">3</text>
        <path d="M242 128v18h60" />
        <text className="nem-memory-diagram__hash" x="242" y="160">
          <tspan>4F2E → 7A61 → </tspan>
          <tspan className="nem-memory-diagram__current-hash">C90D</tspan>
        </text>
      </g>
    </svg>
  );
}
