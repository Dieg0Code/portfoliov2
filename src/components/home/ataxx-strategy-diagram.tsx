type AtaxxStrategyDiagramProps = {
  title: string;
  description: string;
  playLabel: string;
  searchLabel: string;
  learnLabel: string;
  championLabel: string;
};

const GRID_LINES = [1, 2, 3, 4, 5, 6];

const PIECES = [
  [0, 0, "oxide"],
  [6, 6, "oxide"],
  [2, 2, "oxide"],
  [3, 3, "oxide"],
  [0, 6, "machine"],
  [6, 0, "machine"],
  [2, 3, "machine"],
  [3, 2, "machine"],
  [4, 4, "machine"]
] as const;

export function AtaxxStrategyDiagram({
  title,
  description,
  playLabel,
  searchLabel,
  learnLabel,
  championLabel
}: AtaxxStrategyDiagramProps) {
  return (
    <svg
      className="ataxx-strategy-diagram"
      viewBox="0 0 360 210"
      role="img"
      aria-labelledby="ataxx-diagram-title ataxx-diagram-description"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="ataxx-diagram-title">{title}</title>
      <desc id="ataxx-diagram-description">{description}</desc>

      <defs>
        <marker
          id="ataxx-arrow"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path className="ataxx-strategy-diagram__arrow" d="M0 0 7 3.5 0 7Z" />
        </marker>
      </defs>

      <text className="ataxx-strategy-diagram__label" x="18" y="17">
        01 / {playLabel}
      </text>
      <text className="ataxx-strategy-diagram__label" x="173" y="17">
        02 / {searchLabel}
      </text>
      <text
        className="ataxx-strategy-diagram__label"
        x="344"
        y="17"
        textAnchor="end"
      >
        03 / {learnLabel}
      </text>

      <g className="ataxx-strategy-diagram__board">
        <rect x="18" y="39" width="133" height="133" />
        {GRID_LINES.map((line) => (
          <g key={line}>
            <path d={`M${18 + line * 19} 39v133`} />
            <path d={`M18 ${39 + line * 19}h133`} />
          </g>
        ))}

        <path
          className="ataxx-strategy-diagram__move"
          pathLength="1"
          d="M84.5 105.5v15"
          markerEnd="url(#ataxx-arrow)"
        />
        <circle
          className="ataxx-strategy-diagram__target"
          cx="84.5"
          cy="124.5"
          r="13"
        />

        {PIECES.map(([row, column, side]) => {
          const isSource = row === 3 && column === 3;
          const isInfectionTarget =
            side === "machine" &&
            ((row === 3 && column === 2) || (row === 4 && column === 4));

          return (
            <circle
              key={`${row}-${column}-${side}`}
              className={[
                "ataxx-strategy-diagram__piece",
                `ataxx-strategy-diagram__piece--${side}`,
                isSource ? "ataxx-strategy-diagram__piece--source" : "",
                isInfectionTarget
                  ? "ataxx-strategy-diagram__piece--infection-target"
                  : ""
              ]
                .filter(Boolean)
                .join(" ")}
              cx={27.5 + column * 19}
              cy={48.5 + row * 19}
              r="6"
            />
          );
        })}

        <circle
          className="ataxx-strategy-diagram__clone"
          cx="84.5"
          cy="124.5"
          r="6"
        />
        <rect
          className="ataxx-strategy-diagram__infection-wave"
          x="56"
          y="96"
          width="57"
          height="57"
        />
        <path
          className="ataxx-strategy-diagram__infection"
          pathLength="1"
          d="M79.5 119.5 70.5 110.5M90.5 124.5h7"
        />
        <text x="18" y="187">7 × 7 / ATAXX</text>
      </g>

      <path
        className="ataxx-strategy-diagram__handoff"
        d="M151 124.5C161 124.5 161 106 171 106"
        markerEnd="url(#ataxx-arrow)"
      />
      <path
        className="ataxx-strategy-diagram__handoff-pulse"
        pathLength="1"
        d="M151 124.5C161 124.5 161 106 171 106"
      />

      <g className="ataxx-strategy-diagram__search">
        <g className="ataxx-strategy-diagram__branches">
          <path d="M171 106h27" />
          <path d="M198 106l30-38m0 0 21-18m-21 18 21 5" />
          <path d="M198 106h30m0 0 21-13m-21 13 21 17" />
          <path d="M198 106l30 38m0 0 21-2" />
        </g>
        <path
          className="ataxx-strategy-diagram__principal"
          pathLength="1"
          d="M171 106h27l30-38 21 5"
          markerEnd="url(#ataxx-arrow)"
        />
        <path
          className="ataxx-strategy-diagram__simulation ataxx-strategy-diagram__simulation--upper"
          pathLength="1"
          d="M198 106 228 68 249 73"
        />
        <path
          className="ataxx-strategy-diagram__simulation ataxx-strategy-diagram__simulation--middle"
          pathLength="1"
          d="M198 106h30l21-13"
        />
        <path
          className="ataxx-strategy-diagram__simulation ataxx-strategy-diagram__simulation--lower"
          pathLength="1"
          d="M198 106 228 144 249 142"
        />
        <circle className="ataxx-strategy-diagram__node ataxx-strategy-diagram__node--root" cx="198" cy="106" r="7" />
        <circle className="ataxx-strategy-diagram__node ataxx-strategy-diagram__node--selected" cx="228" cy="68" r="6" />
        <circle className="ataxx-strategy-diagram__node ataxx-strategy-diagram__node--middle" cx="228" cy="106" r="6" />
        <circle className="ataxx-strategy-diagram__node ataxx-strategy-diagram__node--lower" cx="228" cy="144" r="6" />
        <circle className="ataxx-strategy-diagram__leaf" cx="254" cy="50" r="4" />
        <circle className="ataxx-strategy-diagram__leaf ataxx-strategy-diagram__leaf--selected" cx="254" cy="73" r="4" />
        <circle className="ataxx-strategy-diagram__leaf" cx="254" cy="93" r="4" />
        <circle className="ataxx-strategy-diagram__leaf" cx="254" cy="123" r="4" />
        <circle className="ataxx-strategy-diagram__leaf" cx="254" cy="142" r="4" />
        <text x="174" y="187">MCTS / 800 SIM</text>
      </g>

      <path
        className="ataxx-strategy-diagram__evaluation-bridge"
        d="M258 73h40"
      />
      <path
        className="ataxx-strategy-diagram__evaluation-pulse"
        pathLength="1"
        d="M258 73h40"
      />

      <g className="ataxx-strategy-diagram__league">
        <path
          className="ataxx-strategy-diagram__league-line"
          d="M298 50v108"
          markerEnd="url(#ataxx-arrow)"
        />
        <path
          className="ataxx-strategy-diagram__league-pulse"
          pathLength="1"
          d="M298 73v85"
        />
        <g className="ataxx-strategy-diagram__generation ataxx-strategy-diagram__generation--one" transform="translate(276 40)">
          <rect width="45" height="24" />
          <text x="7" y="15">G01</text>
        </g>
        <g className="ataxx-strategy-diagram__generation ataxx-strategy-diagram__generation--eight" transform="translate(284 82)">
          <rect width="45" height="24" />
          <text x="7" y="15">G08</text>
        </g>
        <rect
          className="ataxx-strategy-diagram__champion-seal"
          pathLength="1"
          x="288.5"
          y="120.5"
          width="59"
          height="42"
        />
        <g
          className="ataxx-strategy-diagram__champion"
          transform="translate(292 124)"
        >
          <g className="ataxx-strategy-diagram__champion-card">
            <rect width="52" height="35" />
            <text x="8" y="14">V15.3</text>
            <text x="8" y="27">NÉMESIS</text>
          </g>
        </g>
        <path
          className="ataxx-strategy-diagram__champion-latches"
          d="M283 130h9m52 0h9M283 153h9m52 0h9"
        />
        <text
          className="ataxx-strategy-diagram__champion-label"
          x="344"
          y="187"
          textAnchor="end"
        >
          {championLabel} · 38—0—2
        </text>
      </g>
    </svg>
  );
}
