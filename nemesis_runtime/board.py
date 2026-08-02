from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from typing import TypeAlias

import numpy as np

BOARD_SIZE = 7
EMPTY = 0
PLAYER_1 = 1
PLAYER_2 = -1
OBSERVATION_CHANNELS = 15
HALF_MOVE_OBS_SCALE = 120.0
# Hard ply cap, reached as a forced draw. Jumps move a piece instead of adding
# one, so the board need never fill, and threefold repetition needs the exact
# position three times — without this a game can run forever. Mirrors
# MAX_HALF_MOVES in src/lib/ataxx/board.ts; the two must stay in step.
MAX_HALF_MOVES = 120

Move: TypeAlias = tuple[int, int, int, int]
HistoryEntry: TypeAlias = Sequence[int] | None


def _build_radius2_targets() -> tuple[tuple[tuple[int, int], ...], ...]:
    targets: list[tuple[tuple[int, int], ...]] = []
    for row in range(BOARD_SIZE):
        for column in range(BOARD_SIZE):
            cell_targets: list[tuple[int, int]] = []
            for target_row in range(max(0, row - 2), min(BOARD_SIZE, row + 3)):
                for target_column in range(
                    max(0, column - 2),
                    min(BOARD_SIZE, column + 3),
                ):
                    if target_row == row and target_column == column:
                        continue
                    cell_targets.append((target_row, target_column))
            targets.append(tuple(cell_targets))
    return tuple(targets)


_RADIUS2_TARGETS = _build_radius2_targets()


def opponent(player: int) -> int:
    return -player


def move_distance(move: Move) -> int:
    row_from, column_from, row_to, column_to = move
    return max(abs(row_from - row_to), abs(column_from - column_to))


class AtaxxBoard:
    """Small, dependency-light mirror of the v15 Ataxx state."""

    def __init__(self, starting_player: int = PLAYER_1) -> None:
        if starting_player not in (PLAYER_1, PLAYER_2):
            raise ValueError("Starting player must be PLAYER_1 or PLAYER_2.")
        self.grid = np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=np.int8)
        self.grid[0, 0] = PLAYER_1
        self.grid[BOARD_SIZE - 1, BOARD_SIZE - 1] = PLAYER_1
        self.grid[0, BOARD_SIZE - 1] = PLAYER_2
        self.grid[BOARD_SIZE - 1, 0] = PLAYER_2
        self.current_player = starting_player
        self.half_moves = 0
        self._position_counts: Counter[tuple[int, bytes]] = Counter()
        self._position_counts[self._position_key()] = 1
        self._last_move_dst: tuple[int, int] | None = None
        self._prev_move_dst: tuple[int, int] | None = None

    def copy(self) -> AtaxxBoard:
        board = object.__new__(AtaxxBoard)
        board.grid = self.grid.copy()
        board.current_player = self.current_player
        board.half_moves = self.half_moves
        board._position_counts = Counter(self._position_counts)
        board._last_move_dst = self._last_move_dst
        board._prev_move_dst = self._prev_move_dst
        return board

    def _position_key(self) -> tuple[int, bytes]:
        return self.current_player, self.grid.tobytes()

    def get_valid_moves(self, player: int | None = None) -> list[Move]:
        mover = self.current_player if player is None else player
        moves: list[Move] = []
        for row_raw, column_raw in np.argwhere(self.grid == mover):
            row = int(row_raw)
            column = int(column_raw)
            for target_row, target_column in _RADIUS2_TARGETS[
                row * BOARD_SIZE + column
            ]:
                if self.grid[target_row, target_column] == EMPTY:
                    moves.append((row, column, target_row, target_column))
        return moves

    def has_valid_moves(self, player: int | None = None) -> bool:
        mover = self.current_player if player is None else player
        for row_raw, column_raw in np.argwhere(self.grid == mover):
            row = int(row_raw)
            column = int(column_raw)
            if any(
                self.grid[target_row, target_column] == EMPTY
                for target_row, target_column in _RADIUS2_TARGETS[
                    row * BOARD_SIZE + column
                ]
            ):
                return True
        return False

    def step(self, move: Move | None) -> None:
        if move is None:
            if self.has_valid_moves():
                raise ValueError("Pass is illegal while legal moves exist.")
            self.current_player = opponent(self.current_player)
            self.half_moves += 1
            self._position_counts[self._position_key()] += 1
            self._prev_move_dst = self._last_move_dst
            self._last_move_dst = None
            return

        row_from, column_from, row_to, column_to = move
        if self.grid[row_from, column_from] != self.current_player:
            raise ValueError("Move origin does not belong to the current player.")
        if self.grid[row_to, column_to] != EMPTY:
            raise ValueError("Move destination is not empty.")

        distance = move_distance(move)
        if distance == 1:
            self.grid[row_to, column_to] = self.current_player
        elif distance == 2:
            self.grid[row_from, column_from] = EMPTY
            self.grid[row_to, column_to] = self.current_player
        else:
            raise ValueError("Move distance must be one or two cells.")

        enemy = opponent(self.current_player)
        row_slice = slice(max(0, row_to - 1), min(BOARD_SIZE, row_to + 2))
        column_slice = slice(
            max(0, column_to - 1),
            min(BOARD_SIZE, column_to + 2),
        )
        window = self.grid[row_slice, column_slice]
        window[window == enemy] = self.current_player

        self.current_player = enemy
        self.half_moves += 1
        self._position_counts[self._position_key()] += 1
        self._prev_move_dst = self._last_move_dst
        self._last_move_dst = (row_to, column_to)

    def hit_half_move_cap(self) -> bool:
        return self.half_moves >= MAX_HALF_MOVES

    def is_game_over(self) -> bool:
        if self.hit_half_move_cap():
            return True
        if not np.any(self.grid == EMPTY):
            return True
        if not np.any(self.grid == PLAYER_1) or not np.any(self.grid == PLAYER_2):
            return True
        if max(self._position_counts.values(), default=0) >= 3:
            return True
        return not self.has_valid_moves(PLAYER_1) and not self.has_valid_moves(PLAYER_2)

    def result_for_player_one(self) -> int:
        if not self.is_game_over():
            raise ValueError("Result is only available for terminal boards.")
        if self.hit_half_move_cap():
            return 0
        if self._position_counts[self._position_key()] >= 3:
            return 0
        player_one = int(np.sum(self.grid == PLAYER_1))
        player_two = int(np.sum(self.grid == PLAYER_2))
        if player_one == player_two:
            return 0
        return PLAYER_1 if player_one > player_two else PLAYER_2

    def terminal_value_for_current_player(self) -> float:
        result = self.result_for_player_one()
        if result == 0:
            return 0.0
        return 1.0 if result == self.current_player else -1.0

    def _mobility_planes(
        self,
        player: int,
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        clone_destinations = np.zeros(
            (BOARD_SIZE, BOARD_SIZE),
            dtype=np.float32,
        )
        jump_destinations = np.zeros_like(clone_destinations)
        active_pieces = np.zeros_like(clone_destinations)

        for row_raw, column_raw in np.argwhere(self.grid == player):
            row = int(row_raw)
            column = int(column_raw)
            has_move = False
            for target_row, target_column in _RADIUS2_TARGETS[
                row * BOARD_SIZE + column
            ]:
                if self.grid[target_row, target_column] != EMPTY:
                    continue
                has_move = True
                distance = max(abs(row - target_row), abs(column - target_column))
                destination_plane = (
                    clone_destinations if distance == 1 else jump_destinations
                )
                destination_plane[target_row, target_column] = 1.0
            if has_move:
                active_pieces[row, column] = 1.0

        return clone_destinations, jump_destinations, active_pieces

    def _captures_potential_plane(self, player: int) -> np.ndarray:
        plane = np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=np.float32)
        reachable = np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=bool)
        for row_raw, column_raw in np.argwhere(self.grid == player):
            row = int(row_raw)
            column = int(column_raw)
            for target_row, target_column in _RADIUS2_TARGETS[
                row * BOARD_SIZE + column
            ]:
                if self.grid[target_row, target_column] == EMPTY:
                    reachable[target_row, target_column] = True

        enemy_mask = self.grid == opponent(player)
        for row, column in np.argwhere(reachable):
            row_start = max(0, int(row) - 1)
            row_end = min(BOARD_SIZE, int(row) + 2)
            column_start = max(0, int(column) - 1)
            column_end = min(BOARD_SIZE, int(column) + 2)
            plane[row, column] = (
                float(
                    np.sum(
                        enemy_mask[
                            row_start:row_end,
                            column_start:column_end,
                        ]
                    )
                )
                / 8.0
            )
        return plane

    def get_observation(self) -> np.ndarray:
        observation = np.zeros(
            (OBSERVATION_CHANNELS, BOARD_SIZE, BOARD_SIZE),
            dtype=np.float32,
        )
        observation[0] = self.grid == self.current_player
        observation[1] = self.grid == opponent(self.current_player)
        observation[2] = self.grid == EMPTY
        observation[3].fill(min(1.0, float(self.half_moves) / HALF_MOVE_OBS_SCALE))
        repetition_visits = self._position_counts[self._position_key()]
        observation[4].fill(min(1.0, float(max(0, repetition_visits - 1)) / 2.0))

        own_clone, own_jump, own_active = self._mobility_planes(self.current_player)
        opponent_clone, opponent_jump, opponent_active = self._mobility_planes(
            opponent(self.current_player)
        )
        observation[5] = own_clone
        observation[6] = own_jump
        observation[7] = opponent_clone
        observation[8] = opponent_jump
        observation[9] = own_active
        observation[10] = opponent_active
        observation[11] = self._captures_potential_plane(self.current_player)
        observation[12] = self._captures_potential_plane(opponent(self.current_player))
        if self._last_move_dst is not None:
            observation[13, self._last_move_dst[0], self._last_move_dst[1]] = 1.0
        if self._prev_move_dst is not None:
            observation[14, self._prev_move_dst[0], self._prev_move_dst[1]] = 1.0
        return observation


def move_from_indices(origin: int, destination: int) -> Move:
    if isinstance(origin, bool) or isinstance(destination, bool):
        raise TypeError("Move indices must be integers.")
    if not isinstance(origin, int) or not isinstance(destination, int):
        raise TypeError("Move indices must be integers.")
    if not 0 <= origin < BOARD_SIZE * BOARD_SIZE:
        raise ValueError("Move origin is outside the board.")
    if not 0 <= destination < BOARD_SIZE * BOARD_SIZE:
        raise ValueError("Move destination is outside the board.")
    return (
        origin // BOARD_SIZE,
        origin % BOARD_SIZE,
        destination // BOARD_SIZE,
        destination % BOARD_SIZE,
    )


def move_to_indices(move: Move | None) -> tuple[int, int] | None:
    if move is None:
        return None
    row_from, column_from, row_to, column_to = move
    return (
        row_from * BOARD_SIZE + column_from,
        row_to * BOARD_SIZE + column_to,
    )


def history_to_board(
    history: object,
    starting_player: int = PLAYER_1,
) -> AtaxxBoard:
    if not isinstance(history, list):
        raise TypeError("History must be a list.")
    if len(history) > MAX_HALF_MOVES:
        raise ValueError(
            f"History cannot contain more than {MAX_HALF_MOVES} half-moves."
        )

    board = AtaxxBoard(starting_player)
    for index, entry in enumerate(history):
        if board.is_game_over():
            raise ValueError(f"History continues after game over at item {index}.")
        if entry is None:
            board.step(None)
            continue
        if (
            not isinstance(entry, list)
            or len(entry) != 2
            or isinstance(entry[0], bool)
            or isinstance(entry[1], bool)
        ):
            raise ValueError(f"History item {index} must be [from, to] or null.")
        move = move_from_indices(entry[0], entry[1])
        if move not in board.get_valid_moves():
            raise ValueError(f"History item {index} is not a legal move.")
        board.step(move)
    return board
