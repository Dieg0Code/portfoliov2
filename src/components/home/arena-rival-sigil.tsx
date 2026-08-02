import { memo } from "react";

import type { Rung } from "@/lib/ataxx/ladder";

type ArenaRivalSigilProps = {
  id: string;
  kind: Rung["kind"];
  strength?: number;
};

function signatureSeed(value: string) {
  return [...value].reduce(
    (seed, character) => (seed * 31 + character.charCodeAt(0)) % 997,
    17
  );
}

/** A literal type mark: decision tree for rules, layered network for models. */
function RivalSigil({ id, kind, strength = 0 }: ArenaRivalSigilProps) {
  const seed = signatureSeed(id);

  if (kind === "heuristic") {
    const upperIsPrimary = seed % 2 === 0;

    return (
      <svg
        className="arena-ladder__sigil arena-ladder__sigil--heuristic"
        viewBox="0 0 54 36"
        aria-hidden="true"
      >
        <text className="arena-ladder__sigil-type" x="3" y="8">
          IF
        </text>
        <path className="arena-ladder__sigil-route" d="M5 20h10" />
        <rect
          className="arena-ladder__sigil-decision"
          x="15"
          y="16"
          width="8"
          height="8"
          transform="rotate(45 19 20)"
        />
        <path
          className={
            upperIsPrimary
              ? "arena-ladder__sigil-route arena-ladder__sigil-route--active"
              : "arena-ladder__sigil-route"
          }
          d="M23 17 30 11h10"
        />
        <path
          className={
            upperIsPrimary
              ? "arena-ladder__sigil-route"
              : "arena-ladder__sigil-route arena-ladder__sigil-route--active"
          }
          d="m23 23 7 6h10"
        />
        <rect className="arena-ladder__sigil-terminal" x="40" y="7" width="10" height="8" />
        <rect className="arena-ladder__sigil-terminal" x="40" y="25" width="10" height="8" />
        <text className="arena-ladder__sigil-answer" x="43" y="13">
          Y
        </text>
        <text className="arena-ladder__sigil-answer" x="43" y="31">
          N
        </text>
      </svg>
    );
  }

  const clampedStrength = Math.max(0, Math.min(1, strength));
  const inputs = [12, 19, 26] as const;
  const hidden = [10, 16, 22, 28] as const;
  const outputs = [12, 19, 26] as const;
  const activeHidden = seed % hidden.length;
  const activeOutput = (seed * 3) % outputs.length;

  return (
    <svg
      className="arena-ladder__sigil arena-ladder__sigil--model"
      viewBox="0 0 54 36"
      aria-hidden="true"
    >
      <text className="arena-ladder__sigil-type" x="2" y="8">
        NN
      </text>
      <g className="arena-ladder__sigil-network-links">
        {inputs.flatMap((inputY, inputIndex) =>
          hidden
            .filter((_, hiddenIndex) => (hiddenIndex + inputIndex) % 2 === 0)
            .map((hiddenY) => (
              <line key={`i-${inputY}-${hiddenY}`} x1="10" y1={inputY} x2="27" y2={hiddenY} />
            ))
        )}
        {hidden.flatMap((hiddenY, hiddenIndex) =>
          outputs
            .filter((_, outputIndex) => (outputIndex + hiddenIndex) % 2 === 0)
            .map((outputY) => (
              <line key={`o-${hiddenY}-${outputY}`} x1="27" y1={hiddenY} x2="45" y2={outputY} />
            ))
        )}
      </g>
      <path className="arena-ladder__sigil-flow" d={`M10 19 27 ${hidden[activeHidden]} 45 ${outputs[activeOutput]}`} />
      {inputs.map((y) => (
        <circle key={`input-${y}`} className="arena-ladder__sigil-network-node" cx="10" cy={y} r="1.8" />
      ))}
      {hidden.map((y, index) => (
        <circle
          key={`hidden-${y}`}
          className={
            index === activeHidden
              ? "arena-ladder__sigil-network-node arena-ladder__sigil-network-node--active"
              : "arena-ladder__sigil-network-node"
          }
          cx="27"
          cy={y}
          r="1.8"
        />
      ))}
      {outputs.map((y, index) => (
        <circle
          key={`output-${y}`}
          className={
            index === activeOutput
              ? "arena-ladder__sigil-network-node arena-ladder__sigil-network-node--output"
              : "arena-ladder__sigil-network-node"
          }
          cx="45"
          cy={y}
          r="1.8"
        />
      ))}
      <rect className="arena-ladder__sigil-meter-track" x="5" y="33" width="44" height="2" />
      <rect
        className="arena-ladder__sigil-meter-value"
        x="5"
        y="33"
        width={44 * clampedStrength}
        height="2"
      />
    </svg>
  );
}

/*
  Memoised because the ladder holds twenty-two of these, each one a full SVG,
  and every one of them was re-rendering on every board move, every telemetry
  tick and every scroll frame. The props are three primitives fixed per rung,
  so the comparison always short-circuits after the first paint.
*/
export const ArenaRivalSigil = memo(RivalSigil);
