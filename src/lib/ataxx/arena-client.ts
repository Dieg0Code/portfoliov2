/**
 * Browser client for the arena: heuristics run locally, models go to the
 * Python inference function. Callers do not need to know which is which.
 */

import {
  AtaxxBoard,
  historyToWire,
  type HistoryEntry,
  type Move,
  type Player
} from "@/lib/ataxx/board";
import { heuristicMove, type HeuristicLevel } from "@/lib/ataxx/heuristics";
import type { Rung } from "@/lib/ataxx/ladder";

const ENGINE_TIMEOUT_MS = 9_000;
const ENGINE_RETRIES = 2;
const ENGINE_RETRY_DELAY_MS = 700;

/**
 * How long a heuristic pretends to think, per level.
 *
 * They run in the browser and answer in under a millisecond, so the piece lands
 * before the player has finished their own move — it reads as a glitch, not as
 * an opponent, and it clashes with the rhythm of the model rungs. The wait is
 * scaled by how much work the level actually does: `easy` scores each move
 * once, `apex` searches two plies over three candidate replies.
 */
const HEURISTIC_THINKING_MS: Record<string, [number, number]> = {
  easy: [240, 420],
  normal: [280, 460],
  hard: [400, 640],
  apex: [520, 820],
  gambit: [460, 720],
  sentinel: [480, 760]
};

function thinkingDelayFor(level: string) {
  const [low, high] = HEURISTIC_THINKING_MS[level] ?? [320, 520];
  return low + Math.random() * (high - low);
}

export type EngineMove = {
  move: Move | null;
  /**
   * Which engine actually produced the move. `fallback` means the model could
   * not be reached and the `hard` heuristic stood in, which the caller must
   * show on screen and record on the stored match — a substituted move is not
   * a move by the rival the player picked.
   */
  source: "heuristic" | "model" | "fallback";
  simulations: number | null;
  searchMs: number | null;
  /** Root value from the engine's own perspective, -1 losing to +1 winning. */
  value: number | null;
};

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new Error("aborted"));
      },
      { once: true }
    );
  });
}

const warmups = new Map<string, Promise<void>>();

/**
 * Ask the function to load a model before the player's first move, so the cold
 * start does not land in the middle of the game.
 */
export function warmOpponent(rung: Rung, signal?: AbortSignal) {
  if (rung.kind !== "model") return Promise.resolve();

  const existing = warmups.get(rung.engine);
  if (existing) return existing;

  const warmup = fetch(
    `/api/engine?opponent=${encodeURIComponent(rung.engine)}`,
    { method: "GET", cache: "no-store", signal }
  )
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      if (warmups.get(rung.engine) === warmup) warmups.delete(rung.engine);
    });

  warmups.set(rung.engine, warmup);
  return warmup;
}

function isBoardIndex(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < 49;
}

async function requestModelMove(
  opponent: string,
  history: readonly HistoryEntry[],
  startingPlayer: Player,
  externalSignal?: AbortSignal
): Promise<EngineMove> {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", forwardAbort, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), ENGINE_TIMEOUT_MS);

  try {
    const response = await fetch("/api/engine", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opponent,
        history: historyToWire(history),
        startingPlayer
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Arena engine unavailable (${response.status}).`);
    }

    const payload: unknown = await response.json();
    if (
      !payload ||
      typeof payload !== "object" ||
      !("opponent" in payload) ||
      payload.opponent !== opponent ||
      !("move" in payload)
    ) {
      throw new Error("Arena engine returned an invalid response.");
    }

    const simulations =
      "simulations" in payload && Number.isInteger(payload.simulations)
        ? (payload.simulations as number)
        : null;
    const searchMs =
      "searchMs" in payload && Number.isInteger(payload.searchMs)
        ? (payload.searchMs as number)
        : null;
    const value =
      "value" in payload && typeof payload.value === "number"
        ? payload.value
        : null;

    if (payload.move === null) {
      return { move: null, source: "model", simulations, searchMs, value };
    }

    if (
      !Array.isArray(payload.move) ||
      payload.move.length !== 2 ||
      !isBoardIndex(payload.move[0]) ||
      !isBoardIndex(payload.move[1])
    ) {
      throw new Error("Arena engine returned an invalid move.");
    }

    const from = payload.move[0] as number;
    const to = payload.move[1] as number;
    return {
      move: [
        Math.floor(from / 7),
        from % 7,
        Math.floor(to / 7),
        to % 7
      ] as Move,
      source: "model",
      simulations,
      searchMs,
      value
    };
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", forwardAbort);
  }
}

function isLegal(board: AtaxxBoard, move: Move | null) {
  const legalMoves = board.getValidMoves();
  if (move === null) return legalMoves.length === 0;
  return legalMoves.some(
    (candidate) =>
      candidate[0] === move[0] &&
      candidate[1] === move[1] &&
      candidate[2] === move[2] &&
      candidate[3] === move[3]
  );
}

/**
 * Get the opponent's move.
 *
 * Retries before giving up, because a cold serverless start routinely loses the
 * first request and substituting on the first hiccup would swap the rival far
 * more often than necessary. Only after those attempts does the `hard`
 * heuristic stand in, so the match keeps going instead of dead-ending — and the
 * caller is told through `source` so the substitution is shown and recorded
 * rather than passed off as the chosen rival's play.
 */
export async function requestOpponentMove(
  rung: Rung,
  board: AtaxxBoard,
  history: readonly HistoryEntry[],
  startingPlayer: Player,
  signal?: AbortSignal
): Promise<EngineMove> {
  if (rung.kind === "heuristic") {
    // Decide first, then wait: the pause is presentation, and the move must not
    // depend on a board that the player could have changed meanwhile.
    const move = heuristicMove(board, rung.engine as HeuristicLevel);
    await delay(thinkingDelayFor(rung.engine), signal);
    return {
      move,
      source: "heuristic",
      simulations: null,
      searchMs: null,
      value: null
    };
  }

  for (let attempt = 0; attempt <= ENGINE_RETRIES; attempt += 1) {
    if (attempt > 0) await delay(ENGINE_RETRY_DELAY_MS, signal);
    try {
      const result = await requestModelMove(
        rung.engine,
        history,
        startingPlayer,
        signal
      );
      if (!isLegal(board, result.move)) {
        throw new Error("Arena engine proposed an illegal move.");
      }
      return result;
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  return {
    move: heuristicMove(board, "hard"),
    source: "fallback",
    simulations: null,
    searchMs: null,
    value: null
  };
}
