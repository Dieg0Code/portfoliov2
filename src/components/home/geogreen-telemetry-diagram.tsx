import { useId } from "react";

type GeoGreenTelemetryDiagramProps = {
  title: string;
  description: string;
  senseLabel: string;
  sendLabel: string;
  viewLabel: string;
  levelLabel: string;
  alertLabel: string;
};

export function GeoGreenTelemetryDiagram({
  title,
  description,
  senseLabel,
  sendLabel,
  viewLabel,
  levelLabel,
  alertLabel
}: GeoGreenTelemetryDiagramProps) {
  const instanceId = useId().replaceAll(":", "");
  const titleId = `${instanceId}-geogreen-title`;
  const descriptionId = `${instanceId}-geogreen-description`;
  const arrowId = `${instanceId}-geogreen-arrow`;
  const binClipId = `${instanceId}-geogreen-bin-clip`;

  return (
    <svg
      className="geogreen-telemetry-diagram"
      viewBox="0 0 360 210"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <title id={titleId}>{title}</title>
      <desc id={descriptionId}>{description}</desc>

      <defs>
        <marker
          id={arrowId}
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path className="geogreen-telemetry-diagram__arrow" d="M0 0 7 3.5 0 7Z" />
        </marker>
        <clipPath id={binClipId}>
          <path d="M32 74h112l-8 112H40Z" />
        </clipPath>
      </defs>

      <text className="geogreen-telemetry-diagram__label" x="20" y="18">
        01 / {senseLabel}
      </text>
      <text className="geogreen-telemetry-diagram__label" x="174" y="18">
        02 / {sendLabel}
      </text>
      <text className="geogreen-telemetry-diagram__label" x="340" y="18" textAnchor="end">
        03 / {viewLabel}
      </text>

      <g className="geogreen-telemetry-diagram__bin">
        <path className="geogreen-telemetry-diagram__bin-body" d="M32 74h112l-8 112H40Z" />
        <g
          className="geogreen-telemetry-diagram__fragments"
          clipPath={`url(#${binClipId})`}
        >
          <rect className="geogreen-telemetry-diagram__fragment geogreen-telemetry-diagram__fragment--one" x="51" y="82" width="7" height="5" />
          <circle className="geogreen-telemetry-diagram__fragment geogreen-telemetry-diagram__fragment--two" cx="108" cy="83" r="3.5" />
          <path className="geogreen-telemetry-diagram__fragment geogreen-telemetry-diagram__fragment--three" d="M130 79l5 8h-10Z" />
        </g>
        <g clipPath={`url(#${binClipId})`}>
          <path className="geogreen-telemetry-diagram__fill" d="M28 123c18-8 34 8 52 0s34 8 52 0 29 3 36 7v96H28Z" />
        </g>
        <path className="geogreen-telemetry-diagram__bin-lid" d="M25 68h126M40 68l7-15h82l7 15" />
        <rect x="73" y="55" width="30" height="9" />
        <circle cx="81" cy="59.5" r="2.4" />
        <circle cx="95" cy="59.5" r="2.4" />
        <path className="geogreen-telemetry-diagram__sonar" d="M80 66c-10 12-10 24 0 36M95 66c10 12 10 24 0 36M87.5 66v45" />
        <path className="geogreen-telemetry-diagram__measure" d="M122 82v88m-5-5 5 5 5-5m-10-78 5-5 5 5" />
        <text className="geogreen-telemetry-diagram__level geogreen-telemetry-diagram__level--base" x="52" y="151">
          68%
        </text>
        <text className="geogreen-telemetry-diagram__level geogreen-telemetry-diagram__level--alert" x="52" y="151">
          80%
        </text>
        <text className="geogreen-telemetry-diagram__small" x="52" y="165">
          {levelLabel}
        </text>
      </g>

      <path
        className="geogreen-telemetry-diagram__route"
        d="M145 111h27"
        markerEnd={`url(#${arrowId})`}
      />
      <circle
        className="geogreen-telemetry-diagram__packet geogreen-telemetry-diagram__packet--sensor"
        cx="148"
        cy="111"
        r="2.6"
      />

      <g className="geogreen-telemetry-diagram__module">
        <rect x="180" y="71" width="54" height="83" />
        <rect x="187" y="80" width="40" height="25" />
        <path className="geogreen-telemetry-diagram__screen-trace" d="M194 96h7l5-9 6 13 5-7h5" />
        <path className="geogreen-telemetry-diagram__screen-scan" pathLength="1" d="M194 96h7l5-9 6 13 5-7h5" />
        <circle className="geogreen-telemetry-diagram__status geogreen-telemetry-diagram__status--ready" cx="194" cy="119" r="4" />
        <circle className="geogreen-telemetry-diagram__status geogreen-telemetry-diagram__status--buffer" cx="207" cy="119" r="4" />
        <circle className="geogreen-telemetry-diagram__status geogreen-telemetry-diagram__status--send" cx="220" cy="119" r="4" />
        <path d="M192 136h30M192 143h19" />
        <path className="geogreen-telemetry-diagram__signal" d="M196 66c6-7 16-7 22 0m-17-6c3-3 9-3 12 0" />
      </g>

      <path
        className="geogreen-telemetry-diagram__route"
        d="M235 111h23"
        markerEnd={`url(#${arrowId})`}
      />
      <circle
        className="geogreen-telemetry-diagram__packet geogreen-telemetry-diagram__packet--uplink"
        cx="238"
        cy="111"
        r="2.6"
      />

      <g className="geogreen-telemetry-diagram__map">
        <rect x="266" y="42" width="78" height="133" />
        <path d="M276 58h58M276 74h58M276 90h58M276 106h58M276 122h58M276 138h58M276 154h58M282 50v117M298 50v117M314 50v117M330 50v117" />
        <path className="geogreen-telemetry-diagram__pin" d="M306 71c-11 0-18 8-18 18 0 14 18 32 18 32s18-18 18-32c0-10-7-18-18-18Z" />
        <circle className="geogreen-telemetry-diagram__pin-core" cx="306" cy="89" r="6" />
        <path className="geogreen-telemetry-diagram__chart" d="M278 151l11-10 9 5 12-18 11 8 12-20" />
        <path className="geogreen-telemetry-diagram__chart-sweep" pathLength="1" d="M278 151l11-10 9 5 12-18 11 8 12-20" />
        <circle className="geogreen-telemetry-diagram__chart-point" cx="333" cy="116" r="3" />
      </g>

      <g className="geogreen-telemetry-diagram__alert">
        <rect x="166" y="169" width="88" height="25" />
        <circle cx="178" cy="181.5" r="3.5" />
        <text x="188" y="185">
          {alertLabel} · 80%
        </text>
      </g>
    </svg>
  );
}
