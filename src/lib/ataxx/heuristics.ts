/**
 * The six heuristic opponents, ported from `src/agents/heuristic.py` in the
 * ataxx-zero-ai repo.
 *
 * These are the rivals that existed before the first neural network, and the
 * ones the models were trained and evaluated against — so the scoring is kept
 * numerically identical to the Python original. They run in the browser: no
 * network round trip, no serverless cost, instant replies.
 */

import {
  AtaxxBoard,
  BOARD_SIZE,
  moveDistance,
  opponent,
  type Move,
  type Player
} from "@/lib/ataxx/board";

export const HEURISTIC_LEVELS = [
  "easy",
  "normal",
  "hard",
  "apex",
  "gambit",
  "sentinel"
] as const;

export type HeuristicLevel = (typeof HEURISTIC_LEVELS)[number];

export function isHeuristicLevel(value: string): value is HeuristicLevel {
  return (HEURISTIC_LEVELS as readonly string[]).includes(value);
}

function countTargetsInRadius(
  board: AtaxxBoard,
  row: number,
  column: number,
  target: Player,
  radius: number
): number {
  let total = 0;
  const rowMin = Math.max(0, row - radius);
  const rowMax = Math.min(BOARD_SIZE, row + radius + 1);
  const columnMin = Math.max(0, column - radius);
  const columnMax = Math.min(BOARD_SIZE, column + radius + 1);
  for (let r = rowMin; r < rowMax; r += 1) {
    for (let c = columnMin; c < columnMax; c += 1) {
      if (board.grid[r * BOARD_SIZE + c] === target) total += 1;
    }
  }
  return total;
}

/** Own legal moves minus the opponent's, from the perspective of whoever just moved. */
function mobilityAdvantage(afterMove: AtaxxBoard): number {
  const opponentMoves = afterMove.getValidMoves(afterMove.currentPlayer).length;
  const ownMoves = afterMove.getValidMoves(
    opponent(afterMove.currentPlayer)
  ).length;
  return ownMoves - opponentMoves;
}

/** Material swing plus small positional biases. The base every level builds on. */
function scoreMove(state: AtaxxBoard, move: Move): number {
  const me = state.currentPlayer;
  const them = opponent(me);
  const beforeMe = state.countPieces(me);
  const beforeThem = state.countPieces(them);

  const scratch = state.copy();
  scratch.step(move);

  const afterMe = scratch.countPieces(me);
  const afterThem = scratch.countPieces(them);

  const [, , rowTo, columnTo] = move;
  const cloneBonus = moveDistance(move) === 1 ? 0.15 : 0.0;
  const centerBonus =
    0.05 * (3 - Math.abs(rowTo - 3) + 3 - Math.abs(columnTo - 3));

  return afterMe - beforeMe + (beforeThem - afterThem) + cloneBonus + centerBonus;
}

/** How good the opponent's best answer is. -2.0 when they are frozen out. */
function bestReplyPenalty(afterMove: AtaxxBoard): number {
  const replies = afterMove.getValidMoves();
  if (replies.length === 0) return -2.0;
  let best = -Infinity;
  for (const reply of replies) {
    const score = scoreMove(afterMove, reply);
    if (score > best) best = score;
  }
  return best;
}

function softmaxChoice(
  scored: ReadonlyArray<readonly [Move, number]>,
  temperature: number
): Move {
  let maxScore = -Infinity;
  for (const [, score] of scored) {
    if (score > maxScore) maxScore = score;
  }

  const weights = scored.map(([, score]) => Math.exp((score - maxScore) / temperature));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let sample = Math.random() * total;
  for (let index = 0; index < scored.length; index += 1) {
    sample -= weights[index];
    if (sample <= 0) return scored[index][0];
  }
  return scored[scored.length - 1][0];
}

function scoreApex(board: AtaxxBoard, move: Move): number {
  const base = scoreMove(board, move);
  const after = board.copy();
  after.step(move);

  const replies = after.getValidMoves();
  const mobility = mobilityAdvantage(after);
  if (replies.length === 0) return base + 3.0 + 0.2 * mobility;

  // Two-ply selective lookahead: punish lines where the opponent can spike the
  // score and we fail to recover with a strong counter on the next turn.
  const candidates = replies
    .map((reply) => [reply, scoreMove(after, reply)] as const)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);

  let worstLine = -Infinity;
  for (const [reply, replyScore] of candidates) {
    const replyBoard = after.copy();
    replyBoard.step(reply);
    const counters = replyBoard.getValidMoves();
    let counterBest = -2.5;
    if (counters.length > 0) {
      counterBest = -Infinity;
      for (const counter of counters) {
        const score = scoreMove(replyBoard, counter);
        if (score > counterBest) counterBest = score;
      }
    }
    const lineValue = replyScore - 0.55 * counterBest;
    if (lineValue > worstLine) worstLine = lineValue;
  }

  return base - 0.92 * worstLine + 0.2 * mobility;
}

function scoreGambit(board: AtaxxBoard, move: Move): number {
  const [, , rowTo, columnTo] = move;
  const base = scoreMove(board, move);
  const after = board.copy();
  after.step(move);

  const enemy = after.currentPlayer;
  const frontierRisk = countTargetsInRadius(after, rowTo, columnTo, enemy, 1);
  const pressureRing = countTargetsInRadius(after, rowTo, columnTo, enemy, 2);
  const jumpBonus = moveDistance(move) === 2 ? 0.55 : -0.12;
  const flankBonus =
    rowTo === 0 || rowTo === 6 || columnTo === 0 || columnTo === 6 ? 0.35 : 0.0;
  const hardGuard = bestReplyPenalty(after);

  return (
    base -
    0.58 * hardGuard +
    0.46 * pressureRing +
    jumpBonus +
    flankBonus -
    0.42 * frontierRisk
  );
}

function scoreSentinel(board: AtaxxBoard, move: Move): number {
  const [, , rowTo, columnTo] = move;
  const base = scoreMove(board, move);
  const after = board.copy();
  after.step(move);

  const enemy = after.currentPlayer;
  const own = opponent(enemy);
  const frontierRisk = countTargetsInRadius(after, rowTo, columnTo, enemy, 1);
  const localSupport =
    countTargetsInRadius(after, rowTo, columnTo, own, 1) - 1;
  const mobility = mobilityAdvantage(after);
  const centerBonus =
    0.18 * (3 - Math.abs(rowTo - 3) + 3 - Math.abs(columnTo - 3));
  const cloneBias = moveDistance(move) === 1 ? 0.4 : -0.06;
  const hardGuard = bestReplyPenalty(after);

  return (
    base -
    0.56 * hardGuard +
    0.34 * mobility +
    0.36 * localSupport +
    centerBonus +
    cloneBias -
    0.5 * frontierRisk
  );
}

/**
 * Every legal move scored by the given level's evaluation function.
 * Exposed so the port can be diffed against the Python original move by move.
 */
export function scoreMovesForLevel(
  board: AtaxxBoard,
  level: HeuristicLevel
): Array<readonly [Move, number]> {
  const validMoves = board.getValidMoves();

  if (level === "easy" || level === "normal") {
    return validMoves.map((move) => [move, scoreMove(board, move)] as const);
  }

  return validMoves.map((move) => {
    let score = scoreMove(board, move);
    if (level === "hard") {
      const scratch = board.copy();
      scratch.step(move);
      score -= 0.65 * bestReplyPenalty(scratch);
      score += 0.12 * mobilityAdvantage(scratch);
    } else if (level === "apex") {
      score = scoreApex(board, move);
    } else if (level === "gambit") {
      score = scoreGambit(board, move);
    } else if (level === "sentinel") {
      score = scoreSentinel(board, move);
    }
    return [move, score] as const;
  });
}

/**
 * Pick a move for the given heuristic level, or null when the side to move has
 * no legal move and must pass.
 */
export function heuristicMove(
  board: AtaxxBoard,
  level: HeuristicLevel
): Move | null {
  const scored = scoreMovesForLevel(board, level);
  if (scored.length === 0) return null;

  // Easy should still punish obvious blunders while keeping variety, and normal
  // is deliberately non-greedy to avoid repetitive games.
  if (level === "easy") return softmaxChoice(scored, 0.85);
  if (level === "normal") return softmaxChoice(scored, 0.35);

  let bestScore = -Infinity;
  for (const [, score] of scored) {
    if (score > bestScore) bestScore = score;
  }
  const bestMoves = scored
    .filter(([, score]) => score === bestScore)
    .map(([move]) => move);
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}
