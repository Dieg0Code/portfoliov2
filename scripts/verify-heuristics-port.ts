/**
 * Diff the TypeScript heuristics against the Python originals.
 *
 * Reads the fixture written by `dump-heuristic-fixtures.py` and recomputes every
 * score with the browser implementation. Any drift means the six pre-neural
 * rivals on the site are not the ones the models were trained against.
 *
 * Node 24 runs TypeScript directly:
 *   node scripts/verify-heuristics-port.ts <fixtures.json>
 */

import { readFileSync } from "node:fs";
import {
  boardFromHistory,
  moveToIndices,
  type HistoryEntry
} from "@/lib/ataxx/board";
import {
  HEURISTIC_LEVELS,
  scoreMovesForLevel,
  type HeuristicLevel
} from "@/lib/ataxx/heuristics";

type Fixture = {
  cases: Array<{
    history: Array<[number, number] | null>;
    levels: Record<HeuristicLevel, Array<[number, number, number]>>;
  }>;
};

const TOLERANCE = 1e-9;

const fixturePath = process.argv[2];
if (!fixturePath) {
  console.error("usage: node scripts/verify-heuristics-port.ts <fixtures.json>");
  process.exit(2);
}

const fixture: Fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));

let compared = 0;
let mismatches = 0;
const worstByLevel = new Map<HeuristicLevel, number>();

for (const testCase of fixture.cases) {
  const history: HistoryEntry[] = testCase.history.map((entry) =>
    entry === null ? null : { from: entry[0], to: entry[1] }
  );
  const board = boardFromHistory(history);

  for (const level of HEURISTIC_LEVELS) {
    const expected = new Map<string, number>();
    for (const [from, to, score] of testCase.levels[level]) {
      expected.set(`${from}-${to}`, score);
    }

    const actual = scoreMovesForLevel(board, level);
    if (actual.length !== expected.size) {
      console.error(
        `${level}: legal move count differs — ts ${actual.length}, py ${expected.size}`
      );
      mismatches += 1;
      continue;
    }

    for (const [move, score] of actual) {
      const { from, to } = moveToIndices(move);
      const key = `${from}-${to}`;
      const reference = expected.get(key);
      compared += 1;
      if (reference === undefined) {
        console.error(`${level}: ts produced a move python did not: ${key}`);
        mismatches += 1;
        continue;
      }
      const delta = Math.abs(reference - score);
      worstByLevel.set(level, Math.max(worstByLevel.get(level) ?? 0, delta));
      if (delta > TOLERANCE) {
        mismatches += 1;
        if (mismatches <= 10) {
          console.error(
            `${level} ${key}: ts ${score.toFixed(9)} vs py ${reference.toFixed(9)} (Δ ${delta.toExponential(2)})`
          );
        }
      }
    }
  }
}

console.log(`\ncompared ${compared} scored moves across ${fixture.cases.length} positions\n`);
for (const level of HEURISTIC_LEVELS) {
  const worst = worstByLevel.get(level) ?? 0;
  console.log(`  ${level.padEnd(10)} max |Δ| ${worst.toExponential(2)}`);
}

if (mismatches > 0) {
  console.error(`\n${mismatches} mismatch(es) beyond ${TOLERANCE}`);
  process.exit(1);
}
console.log("\nport matches the python reference");
