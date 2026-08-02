"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { requestOpponentMove, warmOpponent } from "@/lib/ataxx/arena-client";
import { boardFromHistory, type HistoryEntry } from "@/lib/ataxx/board";
import { LADDER_BY_ID } from "@/lib/ataxx/ladder";

/** The home card always plays the newest champion; the ladder lives in the arena. */
const CHAMPION = LADDER_BY_ID.get("nemesis-192")!;

type AtaxxHistoryEntry = HistoryEntry;

const BOARD_SIZE = 7;
const EMPTY = 0;
const HUMAN = 1;
const HEURISTIC = -1;

type Cell = -1 | 0 | 1;
type Board = Cell[];
type Turn = "human" | "heuristic" | "over";
type Result = "human" | "heuristic" | "draw" | null;

type Move = {
  from: number;
  to: number;
};

type GameState = {
  board: Board;
  turn: Turn;
  selected: number | null;
  lastMove: Move | null;
  history: AtaxxHistoryEntry[];
  converted: number[];
  moveId: number;
  result: Result;
  notice: "none" | "human-pass" | "heuristic-pass";
  opponentEngine: "nemesis" | "fallback" | null;
};

type AtaxxPlayCardProps = {
  flipped: boolean;
  onFlippedChange: (flipped: boolean) => void;
  releaseLabel: string;
  status: string;
  stack: string;
  playLabel: string;
  flipLabel: string;
  boardLabel: string;
  humanLabel: string;
  heuristicLabel: string;
  yourTurnLabel: string;
  thinkingLabel: string;
  selectLabel: string;
  humanPassLabel: string;
  heuristicPassLabel: string;
  winLabel: string;
  loseLabel: string;
  drawLabel: string;
  acceptLabel: string;
  newGameLabel: string;
  backLabel: string;
};

function createInitialBoard(): Board {
  const board = Array<Cell>(BOARD_SIZE * BOARD_SIZE).fill(EMPTY);
  board[0] = HUMAN;
  board[BOARD_SIZE * BOARD_SIZE - 1] = HUMAN;
  board[BOARD_SIZE - 1] = HEURISTIC;
  board[BOARD_SIZE * (BOARD_SIZE - 1)] = HEURISTIC;
  return board;
}

function createInitialGame(): GameState {
  return {
    board: createInitialBoard(),
    turn: "human",
    selected: null,
    lastMove: null,
    history: [],
    converted: [],
    moveId: 0,
    result: null,
    notice: "none",
    opponentEngine: null
  };
}

function rowOf(index: number) {
  return Math.floor(index / BOARD_SIZE);
}

function columnOf(index: number) {
  return index % BOARD_SIZE;
}

function distance(from: number, to: number) {
  return Math.max(
    Math.abs(rowOf(from) - rowOf(to)),
    Math.abs(columnOf(from) - columnOf(to))
  );
}

function getValidMoves(board: Board, player: Cell): Move[] {
  const moves: Move[] = [];

  for (let from = 0; from < board.length; from += 1) {
    if (board[from] !== player) continue;

    const fromRow = rowOf(from);
    const fromColumn = columnOf(from);

    for (
      let row = Math.max(0, fromRow - 2);
      row <= Math.min(BOARD_SIZE - 1, fromRow + 2);
      row += 1
    ) {
      for (
        let column = Math.max(0, fromColumn - 2);
        column <= Math.min(BOARD_SIZE - 1, fromColumn + 2);
        column += 1
      ) {
        const to = row * BOARD_SIZE + column;
        const moveDistance = distance(from, to);
        if (
          board[to] === EMPTY &&
          (moveDistance === 1 || moveDistance === 2)
        ) {
          moves.push({ from, to });
        }
      }
    }
  }

  return moves;
}

function getConvertedIndices(
  board: Board,
  move: Move,
  player: Cell
): number[] {
  const converted: number[] = [];
  const targetRow = rowOf(move.to);
  const targetColumn = columnOf(move.to);
  for (
    let row = Math.max(0, targetRow - 1);
    row <= Math.min(BOARD_SIZE - 1, targetRow + 1);
    row += 1
  ) {
    for (
      let column = Math.max(0, targetColumn - 1);
      column <= Math.min(BOARD_SIZE - 1, targetColumn + 1);
      column += 1
    ) {
      const index = row * BOARD_SIZE + column;
      if (board[index] === -player) converted.push(index);
    }
  }

  return converted;
}

function applyMove(board: Board, move: Move, player: Cell): Board {
  const next = [...board];
  if (distance(move.from, move.to) === 2) {
    next[move.from] = EMPTY;
  }
  next[move.to] = player;
  for (const index of getConvertedIndices(board, move, player)) {
    next[index] = player;
  }

  return next;
}

function countPieces(board: Board, player: Cell) {
  return board.reduce<number>(
    (total, cell) => total + Number(cell === player),
    0
  );
}

function resolveResult(board: Board): Result {
  const humanCount = countPieces(board, HUMAN);
  const heuristicCount = countPieces(board, HEURISTIC);
  const boardFull = !board.includes(EMPTY);
  const noMoves =
    getValidMoves(board, HUMAN).length === 0 &&
    getValidMoves(board, HEURISTIC).length === 0;

  if (
    !boardFull &&
    humanCount > 0 &&
    heuristicCount > 0 &&
    !noMoves
  ) {
    return null;
  }

  if (humanCount === heuristicCount) return "draw";
  return humanCount > heuristicCount ? "human" : "heuristic";
}

function scoreNormalMove(board: Board, move: Move): number {
  const beforeHeuristic = countPieces(board, HEURISTIC);
  const beforeHuman = countPieces(board, HUMAN);
  const after = applyMove(board, move, HEURISTIC);
  const gain =
    countPieces(after, HEURISTIC) -
    beforeHeuristic +
    (beforeHuman - countPieces(after, HUMAN));
  const cloneBonus = distance(move.from, move.to) === 1 ? 0.15 : 0;
  const row = rowOf(move.to);
  const column = columnOf(move.to);
  const centerBonus =
    0.05 * (3 - Math.abs(row - 3) + 3 - Math.abs(column - 3));
  return gain + cloneBonus + centerBonus;
}

function chooseNormalHeuristicMove(board: Board): Move | null {
  const moves = getValidMoves(board, HEURISTIC);
  if (moves.length === 0) return null;

  const scores = moves.map((move) => scoreNormalMove(board, move));
  const maxScore = Math.max(...scores);
  const weights = scores.map((score) => Math.exp((score - maxScore) / 0.35));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let sample = Math.random() * total;

  for (let index = 0; index < moves.length; index += 1) {
    sample -= weights[index];
    if (sample <= 0) return moves[index];
  }

  return moves[moves.length - 1];
}

function movesAreEqual(left: Move, right: Move) {
  return left.from === right.from && left.to === right.to;
}

function applyOpponentTurn(
  current: GameState,
  move: Move | null,
  opponentEngine: "nemesis" | "fallback"
): GameState {
  const legalMoves = getValidMoves(current.board, HEURISTIC);
  const isLegal =
    move === null
      ? legalMoves.length === 0
      : legalMoves.some((legalMove) => movesAreEqual(legalMove, move));

  if (!isLegal) return current;

  if (move === null) {
    const result = resolveResult(current.board);
    return result
      ? {
          ...current,
          turn: "over",
          selected: null,
          history: [...current.history, null],
          converted: [],
          result,
          notice: "none",
          opponentEngine
        }
      : {
          ...current,
          turn: "human",
          selected: null,
          history: [...current.history, null],
          converted: [],
          notice: "heuristic-pass",
          opponentEngine
        };
  }

  const converted = getConvertedIndices(
    current.board,
    move,
    HEURISTIC
  );
  const board = applyMove(current.board, move, HEURISTIC);
  const result = resolveResult(board);
  const history: AtaxxHistoryEntry[] = [...current.history, move];

  if (result) {
    return {
      ...current,
      board,
      turn: "over",
      selected: null,
      lastMove: move,
      history,
      converted,
      moveId: current.moveId + 1,
      result,
      notice: "none",
      opponentEngine
    };
  }

  if (getValidMoves(board, HUMAN).length === 0) {
    return {
      ...current,
      board,
      turn: "heuristic",
      selected: null,
      lastMove: move,
      history: [...history, null],
      converted,
      moveId: current.moveId + 1,
      notice: "human-pass",
      opponentEngine
    };
  }

  return {
    ...current,
    board,
    turn: "human",
    selected: null,
    lastMove: move,
    history,
    converted,
    moveId: current.moveId + 1,
    notice: "none",
    opponentEngine
  };
}

function RestartIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M12.7 5.2A5.5 5.5 0 1 0 13 10" />
      <path d="M10.2 2.8h3.2V6" />
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="11" y="3.5" width="5.5" height="13" />
      <path d="M2.5 10h10m-4-4 4 4-4 4" />
    </svg>
  );
}

export function AtaxxPlayCard({
  flipped,
  onFlippedChange,
  releaseLabel,
  status,
  stack,
  playLabel,
  flipLabel,
  boardLabel,
  humanLabel,
  heuristicLabel,
  yourTurnLabel,
  thinkingLabel,
  selectLabel,
  humanPassLabel,
  heuristicPassLabel,
  winLabel,
  loseLabel,
  drawLabel,
  acceptLabel,
  newGameLabel,
  backLabel
}: AtaxxPlayCardProps) {
  const [game, setGame] = useState<GameState>(createInitialGame);
  const [hoveredDestination, setHoveredDestination] = useState<number | null>(
    null
  );
  const [dismissedResult, setDismissedResult] = useState<Result>(null);
  const [leavingResult, setLeavingResult] = useState<Result>(null);
  const resultTimerRef = useRef<number | null>(null);
  const resultButtonRef = useRef<HTMLButtonElement>(null);
  const restartButtonRef = useRef<HTMLButtonElement>(null);

  const legalDestinations = useMemo(() => {
    if (game.selected === null || game.turn !== "human") {
      return new Set<number>();
    }
    return new Set(
      getValidMoves(game.board, HUMAN)
        .filter((move) => move.from === game.selected)
        .map((move) => move.to)
    );
  }, [game.board, game.selected, game.turn]);

  useEffect(() => {
    if (!flipped) return;
    const controller = new AbortController();
    void warmOpponent(CHAMPION, controller.signal);
    return () => controller.abort();
  }, [flipped]);

  useEffect(() => {
    if (!flipped || game.turn !== "heuristic" || game.result) return;

    const controller = new AbortController();
    const expectedMoveId = game.moveId;
    const expectedHistoryLength = game.history.length;
    const board = [...game.board];
    const history = [...game.history];
    let live = true;

    const playOpponentTurn = async () => {
      let move: Move | null;
      let opponentEngine: "nemesis" | "fallback";

      try {
        const response = await requestOpponentMove(
          CHAMPION,
          boardFromHistory(history),
          history,
          HUMAN,
          controller.signal
        );
        if (response.source !== "model") {
          throw new Error("NÉMESIS did not answer.");
        }

        const legalMoves = getValidMoves(board, HEURISTIC);
        if (response.move === null) {
          if (legalMoves.length > 0) {
            throw new Error("NÉMESIS passed with legal moves available.");
          }
          move = null;
        } else {
          const [rowFrom, columnFrom, rowTo, columnTo] = response.move;
          const candidate = {
            from: rowFrom * BOARD_SIZE + columnFrom,
            to: rowTo * BOARD_SIZE + columnTo
          };
          if (
            !legalMoves.some((legalMove) => movesAreEqual(legalMove, candidate))
          ) {
            throw new Error("NÉMESIS proposed an illegal move.");
          }
          move = candidate;
        }
        opponentEngine = "nemesis";
      } catch {
        if (!live || controller.signal.aborted) return;
        move = chooseNormalHeuristicMove(board);
        opponentEngine = "fallback";
        await new Promise((resolve) => window.setTimeout(resolve, 320));
      }

      if (!live || controller.signal.aborted) return;
      setGame((current) => {
        if (
          current.turn !== "heuristic" ||
          current.result ||
          current.moveId !== expectedMoveId ||
          current.history.length !== expectedHistoryLength
        ) {
          return current;
        }
        return applyOpponentTurn(current, move, opponentEngine);
      });
    };

    void playOpponentTurn();
    return () => {
      live = false;
      controller.abort();
    };
  }, [
    flipped,
    game.board,
    game.history,
    game.moveId,
    game.result,
    game.turn
  ]);

  useEffect(() => {
    if (game.result && dismissedResult !== game.result) {
      window.requestAnimationFrame(() => resultButtonRef.current?.focus());
    }
  }, [dismissedResult, game.result]);

  useEffect(
    () => () => {
      if (resultTimerRef.current !== null) {
        window.clearTimeout(resultTimerRef.current);
      }
    },
    []
  );

  const humanCount = countPieces(game.board, HUMAN);
  const heuristicCount = countPieces(game.board, HEURISTIC);
  const statusLabel = game.result
    ? game.result === "human"
      ? winLabel
      : game.result === "heuristic"
        ? loseLabel
        : drawLabel
    : game.turn === "heuristic"
      ? thinkingLabel
      : game.notice === "human-pass"
        ? humanPassLabel
        : game.notice === "heuristic-pass"
          ? heuristicPassLabel
          : game.selected === null
            ? selectLabel
            : yourTurnLabel;

  const handleCellClick = (index: number) => {
    if (game.turn !== "human" || game.result) return;

    if (game.board[index] === HUMAN) {
      setHoveredDestination(null);
      setGame((current) => ({
        ...current,
        selected: current.selected === index ? null : index,
        notice: "none"
      }));
      return;
    }

    if (game.selected === null || !legalDestinations.has(index)) return;
    const move = { from: game.selected, to: index };
    const converted = getConvertedIndices(game.board, move, HUMAN);
    const board = applyMove(game.board, move, HUMAN);
    const result = resolveResult(board);
    setHoveredDestination(null);
    setGame((current) => ({
      ...current,
      board,
      turn: result ? "over" : "heuristic",
      selected: null,
      lastMove: move,
      history: [...current.history, move],
      converted,
      moveId: current.moveId + 1,
      result,
      notice: "none"
    }));
  };

  const resetGame = () => {
    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    setDismissedResult(null);
    setLeavingResult(null);
    setHoveredDestination(null);
    setGame(createInitialGame());
  };

  const acceptResult = () => {
    if (!game.result || leavingResult) return;
    const acceptedResult = game.result;
    setLeavingResult(acceptedResult);
    resultTimerRef.current = window.setTimeout(() => {
      setDismissedResult(acceptedResult);
      setLeavingResult(null);
      resultTimerRef.current = null;
      restartButtonRef.current?.focus();
    }, 480);
  };

  const visibleResult =
    game.result && dismissedResult !== game.result ? game.result : null;
  const resultLabel =
    game.result === "human"
      ? winLabel
      : game.result === "heuristic"
        ? loseLabel
        : drawLabel;
  const previewMove =
    game.selected !== null && hoveredDestination !== null
      ? { from: game.selected, to: hoveredDestination }
      : null;
  const movePlayer =
    game.lastMove && game.board[game.lastMove.to] === HUMAN
      ? "human"
      : "heuristic";

  return (
    <section className="ataxx-play-card" data-flipped={flipped}>
      <div className="ataxx-play-card__inner">
        <button
          className="ataxx-play-card__face ataxx-play-card__front"
          type="button"
          onClick={() => onFlippedChange(true)}
          aria-label={flipLabel}
          aria-expanded={flipped}
          tabIndex={flipped ? -1 : 0}
        >
          <span>{releaseLabel}</span>
          <strong>{status}</strong>
          <small>{stack}</small>
          <span className="ataxx-play-card__cta" aria-hidden="true">
            <b>{playLabel}</b>
            <FlipIcon />
          </span>
        </button>

        <div
          className="ataxx-play-card__face ataxx-play-card__back"
          data-result={game.result ?? undefined}
          data-engine={game.opponentEngine ?? undefined}
          aria-hidden={!flipped}
          aria-label={backLabel}
          inert={!flipped ? true : undefined}
          onClick={(event) => {
            const target = event.target;
            if (
              !(target instanceof Element) ||
              target.closest(
                ".ataxx-mini-game__board, .ataxx-result-strip, button"
              )
            ) {
              return;
            }
            onFlippedChange(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onFlippedChange(false);
            }
          }}
        >
          <header>
            <span>
              {humanLabel} <b>{humanCount.toString().padStart(2, "0")}</b>
            </span>
            <span>
              {heuristicLabel}{" "}
              <b>{heuristicCount.toString().padStart(2, "0")}</b>
            </span>
          </header>

          <div
            className="ataxx-mini-game__board"
            role="grid"
            aria-label={boardLabel}
          >
            {game.board.map((cell, index) => {
              const isSelected = game.selected === index;
              const isLegal = legalDestinations.has(index);
              const isOrigin = game.lastMove?.from === index;
              const isArrival = game.lastMove?.to === index;
              const isConverted = game.converted.includes(index);
              const moveKind =
                game.lastMove && distance(game.lastMove.from, game.lastMove.to) === 1
                  ? "clone"
                  : "jump";
              const moveStyle =
                isArrival && game.lastMove
                  ? ({
                      "--ataxx-move-x": `${
                        (columnOf(game.lastMove.from) - columnOf(index)) * 131.58
                      }%`,
                      "--ataxx-move-y": `${
                        (rowOf(game.lastMove.from) - rowOf(index)) * 131.58
                      }%`
                    } as CSSProperties)
                  : undefined;
              return (
                <button
                  key={index}
                  type="button"
                  role="gridcell"
                  className={[
                    cell === HUMAN
                      ? "has-human"
                      : cell === HEURISTIC
                        ? "has-heuristic"
                        : "",
                    isSelected ? "is-selected" : "",
                    isLegal ? "is-legal" : "",
                    isOrigin ? "is-origin" : "",
                    isArrival ? `is-arrival is-arrival--${moveKind}` : "",
                    isConverted ? "is-converted" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={moveStyle}
                  onClick={() => handleCellClick(index)}
                  onMouseEnter={() => {
                    if (isLegal) setHoveredDestination(index);
                  }}
                  onMouseLeave={() => {
                    if (hoveredDestination === index) {
                      setHoveredDestination(null);
                    }
                  }}
                  onFocus={() => {
                    if (isLegal) setHoveredDestination(index);
                  }}
                  onBlur={() => {
                    if (hoveredDestination === index) {
                      setHoveredDestination(null);
                    }
                  }}
                  disabled={
                    game.turn !== "human" ||
                    Boolean(game.result) ||
                    (cell !== HUMAN && !isLegal)
                  }
                  aria-label={`${String.fromCharCode(65 + columnOf(index))}${
                    rowOf(index) + 1
                  }`}
                >
                  {cell !== EMPTY ? (
                    <i
                      key={
                        isConverted || isArrival
                          ? `${cell}-${game.moveId}`
                          : `${cell}-stable`
                      }
                      className={
                        cell === HUMAN
                          ? "ataxx-piece ataxx-piece--human"
                          : "ataxx-piece ataxx-piece--heuristic"
                      }
                    />
                  ) : null}
                </button>
              );
            })}

            <svg
              className="ataxx-move-feedback"
              viewBox="0 0 7 7"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {game.lastMove ? (
                <line
                  key={`move-${game.moveId}`}
                  className={`ataxx-move-feedback__committed is-${movePlayer}`}
                  x1={columnOf(game.lastMove.from) + 0.5}
                  y1={rowOf(game.lastMove.from) + 0.5}
                  x2={columnOf(game.lastMove.to) + 0.5}
                  y2={rowOf(game.lastMove.to) + 0.5}
                />
              ) : null}
              {previewMove ? (
                <>
                  <line
                    className="ataxx-move-feedback__preview"
                    x1={columnOf(previewMove.from) + 0.5}
                    y1={rowOf(previewMove.from) + 0.5}
                    x2={columnOf(previewMove.to) + 0.5}
                    y2={rowOf(previewMove.to) + 0.5}
                  />
                  <circle
                    className="ataxx-move-feedback__target"
                    cx={columnOf(previewMove.to) + 0.5}
                    cy={rowOf(previewMove.to) + 0.5}
                    r="0.18"
                  />
                </>
              ) : null}
            </svg>
          </div>

          <footer>
            <output aria-live="polite">{statusLabel}</output>
            <button
              ref={restartButtonRef}
              className="ataxx-play-card__restart"
              type="button"
              onClick={resetGame}
              aria-label={newGameLabel}
              title={newGameLabel}
            >
              <RestartIcon />
            </button>
          </footer>

          {visibleResult ? (
            <button
              ref={resultButtonRef}
              type="button"
              className={[
                "ataxx-result-strip",
                `ataxx-result-strip--${visibleResult}`,
                leavingResult === visibleResult ? "is-leaving" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={acceptResult}
              aria-label={`${resultLabel}. ${acceptLabel}`}
            >
              <strong>{resultLabel}</strong>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
