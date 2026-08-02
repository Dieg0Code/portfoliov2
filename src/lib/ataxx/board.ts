/**
 * Faithful TypeScript mirror of the v15 Ataxx state.
 *
 * Kept byte-for-byte equivalent to `nemesis_runtime/board.py` (which in turn
 * mirrors the training environment) so that a history produced in the browser
 * always reconstructs the same position on the inference function, and so the
 * ported heuristics score positions exactly as they did during training.
 */

export const BOARD_SIZE = 7;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
export const EMPTY = 0;
export const PLAYER_1 = 1;
export const PLAYER_2 = -1;

/**
 * Hard ply cap, reached as a forced draw.
 *
 * Without it a game can run forever: jumps move a piece instead of adding one,
 * so the board never fills, and threefold repetition needs the *exact* position
 * three times — two engines can shuffle past that indefinitely. 120 is the
 * project's canonical episode length: it matches `HALF_MOVE_OBS_SCALE`, the
 * `max_half_moves_per_episode` v15 was aligned to, and the limit the inference
 * function accepts in a history. Training scores a cap-cut episode as a draw,
 * so this does too.
 */
export const MAX_HALF_MOVES = 120;

export type Player = typeof PLAYER_1 | typeof PLAYER_2;
export type Cell = Player | typeof EMPTY;

/** A move as [rowFrom, columnFrom, rowTo, columnTo]. */
export type Move = readonly [number, number, number, number];

/** A move as flat board indices, which is the wire format for the engine. */
export type MoveIndices = { from: number; to: number };

export type HistoryEntry = MoveIndices | null;

function buildRadius2Targets(): ReadonlyArray<ReadonlyArray<number>> {
  const targets: number[][] = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const cellTargets: number[] = [];
      for (
        let targetRow = Math.max(0, row - 2);
        targetRow < Math.min(BOARD_SIZE, row + 3);
        targetRow += 1
      ) {
        for (
          let targetColumn = Math.max(0, column - 2);
          targetColumn < Math.min(BOARD_SIZE, column + 3);
          targetColumn += 1
        ) {
          if (targetRow === row && targetColumn === column) continue;
          cellTargets.push(targetRow * BOARD_SIZE + targetColumn);
        }
      }
      targets.push(cellTargets);
    }
  }
  return targets;
}

const RADIUS2_TARGETS = buildRadius2Targets();

export function opponent(player: Player): Player {
  return -player as Player;
}

export function rowOf(index: number) {
  return Math.floor(index / BOARD_SIZE);
}

export function columnOf(index: number) {
  return index % BOARD_SIZE;
}

export function moveDistance(move: Move) {
  return Math.max(Math.abs(move[0] - move[2]), Math.abs(move[1] - move[3]));
}

export function moveToIndices(move: Move): MoveIndices {
  return {
    from: move[0] * BOARD_SIZE + move[1],
    to: move[2] * BOARD_SIZE + move[3]
  };
}

export function moveFromIndices(from: number, to: number): Move {
  return [
    Math.floor(from / BOARD_SIZE),
    from % BOARD_SIZE,
    Math.floor(to / BOARD_SIZE),
    to % BOARD_SIZE
  ];
}

export class AtaxxBoard {
  grid: Int8Array;
  currentPlayer: Player;
  halfMoves: number;
  /** Threefold repetition is a real draw condition, so positions are counted. */
  private positionCounts: Map<string, number>;
  lastMoveDestination: number | null;
  previousMoveDestination: number | null;

  constructor() {
    this.grid = new Int8Array(CELL_COUNT);
    this.grid[0] = PLAYER_1;
    this.grid[CELL_COUNT - 1] = PLAYER_1;
    this.grid[BOARD_SIZE - 1] = PLAYER_2;
    this.grid[BOARD_SIZE * (BOARD_SIZE - 1)] = PLAYER_2;
    this.currentPlayer = PLAYER_1;
    this.halfMoves = 0;
    this.positionCounts = new Map();
    this.positionCounts.set(this.positionKey(), 1);
    this.lastMoveDestination = null;
    this.previousMoveDestination = null;
  }

  copy(): AtaxxBoard {
    const board: AtaxxBoard = Object.create(AtaxxBoard.prototype);
    board.grid = this.grid.slice();
    board.currentPlayer = this.currentPlayer;
    board.halfMoves = this.halfMoves;
    board.positionCounts = new Map(this.positionCounts);
    board.lastMoveDestination = this.lastMoveDestination;
    board.previousMoveDestination = this.previousMoveDestination;
    return board;
  }

  private positionKey() {
    return `${this.currentPlayer}:${this.grid.join("")}`;
  }

  getValidMoves(player?: Player): Move[] {
    const mover = player ?? this.currentPlayer;
    const moves: Move[] = [];
    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (this.grid[index] !== mover) continue;
      const row = rowOf(index);
      const column = columnOf(index);
      for (const target of RADIUS2_TARGETS[index]) {
        if (this.grid[target] === EMPTY) {
          moves.push([row, column, rowOf(target), columnOf(target)]);
        }
      }
    }
    return moves;
  }

  hasValidMoves(player?: Player): boolean {
    const mover = player ?? this.currentPlayer;
    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (this.grid[index] !== mover) continue;
      for (const target of RADIUS2_TARGETS[index]) {
        if (this.grid[target] === EMPTY) return true;
      }
    }
    return false;
  }

  countPieces(player: Player): number {
    let total = 0;
    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (this.grid[index] === player) total += 1;
    }
    return total;
  }

  /** Cells the move would flip, before it is applied. */
  getConvertedCells(move: Move): number[] {
    const converted: number[] = [];
    const enemy = opponent(this.currentPlayer);
    const [, , rowTo, columnTo] = move;
    for (
      let row = Math.max(0, rowTo - 1);
      row < Math.min(BOARD_SIZE, rowTo + 2);
      row += 1
    ) {
      for (
        let column = Math.max(0, columnTo - 1);
        column < Math.min(BOARD_SIZE, columnTo + 2);
        column += 1
      ) {
        const index = row * BOARD_SIZE + column;
        if (this.grid[index] === enemy) converted.push(index);
      }
    }
    return converted;
  }

  step(move: Move | null): void {
    if (move === null) {
      if (this.hasValidMoves()) {
        throw new Error("Pass is illegal while legal moves exist.");
      }
      this.currentPlayer = opponent(this.currentPlayer);
      this.halfMoves += 1;
      this.bumpPositionCount();
      this.previousMoveDestination = this.lastMoveDestination;
      this.lastMoveDestination = null;
      return;
    }

    const [rowFrom, columnFrom, rowTo, columnTo] = move;
    const fromIndex = rowFrom * BOARD_SIZE + columnFrom;
    const toIndex = rowTo * BOARD_SIZE + columnTo;

    if (this.grid[fromIndex] !== this.currentPlayer) {
      throw new Error("Move origin does not belong to the current player.");
    }
    if (this.grid[toIndex] !== EMPTY) {
      throw new Error("Move destination is not empty.");
    }

    const distance = moveDistance(move);
    if (distance === 1) {
      this.grid[toIndex] = this.currentPlayer;
    } else if (distance === 2) {
      this.grid[fromIndex] = EMPTY;
      this.grid[toIndex] = this.currentPlayer;
    } else {
      throw new Error("Move distance must be one or two cells.");
    }

    const enemy = opponent(this.currentPlayer);
    for (
      let row = Math.max(0, rowTo - 1);
      row < Math.min(BOARD_SIZE, rowTo + 2);
      row += 1
    ) {
      for (
        let column = Math.max(0, columnTo - 1);
        column < Math.min(BOARD_SIZE, columnTo + 2);
        column += 1
      ) {
        const index = row * BOARD_SIZE + column;
        if (this.grid[index] === enemy) this.grid[index] = this.currentPlayer;
      }
    }

    this.currentPlayer = enemy;
    this.halfMoves += 1;
    this.bumpPositionCount();
    this.previousMoveDestination = this.lastMoveDestination;
    this.lastMoveDestination = toIndex;
  }

  private bumpPositionCount() {
    const key = this.positionKey();
    this.positionCounts.set(key, (this.positionCounts.get(key) ?? 0) + 1);
  }

  private maxPositionCount() {
    let max = 0;
    for (const count of this.positionCounts.values()) {
      if (count > max) max = count;
    }
    return max;
  }

  /** True when the game ended by hitting the ply cap rather than on the board. */
  hitHalfMoveCap(): boolean {
    return this.halfMoves >= MAX_HALF_MOVES;
  }

  isGameOver(): boolean {
    if (this.hitHalfMoveCap()) return true;

    let hasEmpty = false;
    let hasPlayerOne = false;
    let hasPlayerTwo = false;
    for (let index = 0; index < CELL_COUNT; index += 1) {
      const cell = this.grid[index];
      if (cell === EMPTY) hasEmpty = true;
      else if (cell === PLAYER_1) hasPlayerOne = true;
      else hasPlayerTwo = true;
    }

    if (!hasEmpty) return true;
    if (!hasPlayerOne || !hasPlayerTwo) return true;
    if (this.maxPositionCount() >= 3) return true;
    return !this.hasValidMoves(PLAYER_1) && !this.hasValidMoves(PLAYER_2);
  }

  /** PLAYER_1, PLAYER_2, or 0 for a draw. Only valid on terminal boards. */
  resultForPlayerOne(): number {
    if (!this.isGameOver()) {
      throw new Error("Result is only available for terminal boards.");
    }
    if (this.hitHalfMoveCap()) return 0;
    if ((this.positionCounts.get(this.positionKey()) ?? 0) >= 3) return 0;
    const playerOne = this.countPieces(PLAYER_1);
    const playerTwo = this.countPieces(PLAYER_2);
    if (playerOne === playerTwo) return 0;
    return playerOne > playerTwo ? PLAYER_1 : PLAYER_2;
  }
}

export function boardFromHistory(history: readonly HistoryEntry[]): AtaxxBoard {
  const board = new AtaxxBoard();
  for (const entry of history) {
    if (entry === null) {
      board.step(null);
      continue;
    }
    board.step(moveFromIndices(entry.from, entry.to));
  }
  return board;
}

/** Wire format for the inference function: [from, to] pairs, null for a pass. */
export function historyToWire(
  history: readonly HistoryEntry[]
): (number[] | null)[] {
  return history.map((entry) => (entry ? [entry.from, entry.to] : null));
}
