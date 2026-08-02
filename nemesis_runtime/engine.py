from __future__ import annotations

import math
import time
from collections import OrderedDict
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import onnxruntime as ort

from .board import AtaxxBoard, Move


class ActionSpace:
    def __init__(self) -> None:
        moves: list[Move | None] = []
        move_to_index: dict[Move, int] = {}
        deltas = [
            (row_delta, column_delta)
            for row_delta in range(-2, 3)
            for column_delta in range(-2, 3)
            if not (row_delta == 0 and column_delta == 0)
        ]

        for row in range(7):
            for column in range(7):
                for row_delta, column_delta in deltas:
                    target_row = row + row_delta
                    target_column = column + column_delta
                    if 0 <= target_row < 7 and 0 <= target_column < 7:
                        move = (row, column, target_row, target_column)
                        move_to_index[move] = len(moves)
                        moves.append(move)

        self.pass_index = len(moves)
        moves.append(None)
        self.moves = tuple(moves)
        self.move_to_index = move_to_index
        self.size = len(moves)

    def encode(self, move: Move | None) -> int:
        return self.pass_index if move is None else self.move_to_index[move]

    def decode(self, action_index: int) -> Move | None:
        return self.moves[action_index]


ACTION_SPACE = ActionSpace()


@dataclass(frozen=True)
class SearchResult:
    move: Move | None
    value: float
    simulations: int
    duration_ms: int


class SearchNode:
    __slots__ = ("children", "prior", "value_sum", "visits")

    def __init__(self, prior: float) -> None:
        self.prior = prior
        self.visits = 0
        self.value_sum = 0.0
        self.children: dict[int, SearchNode] = {}

    def value(self) -> float:
        return self.value_sum / self.visits if self.visits else 0.0


class NemesisEngine:
    """ONNX policy/value inference with the same PUCT family as NÉMESIS."""

    def __init__(
        self,
        model_path: str | Path,
        *,
        c_puct: float = 1.5,
        fpu_reduction: float = 0.25,
        leaf_batch_size: int = 8,
        cache_size: int = 4_096,
    ) -> None:
        options = ort.SessionOptions()
        options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        options.add_session_config_entry("session.intra_op.allow_spinning", "0")
        options.add_session_config_entry("session.inter_op.allow_spinning", "0")
        self.session = ort.InferenceSession(
            str(model_path),
            sess_options=options,
            providers=["CPUExecutionProvider"],
        )
        self.c_puct = c_puct
        self.fpu_reduction = fpu_reduction
        self.leaf_batch_size = max(1, leaf_batch_size)
        self.cache_size = max(0, cache_size)
        self.cache: OrderedDict[
            bytes,
            tuple[np.ndarray, np.ndarray, float],
        ] = OrderedDict()
        self.rng = np.random.default_rng()
        self._warmed_up = False

    def warmup(self) -> None:
        if self._warmed_up:
            return
        board = AtaxxBoard()
        node = SearchNode(prior=1.0)
        self._expand_batch([(node, board)])
        self._warmed_up = True

    @staticmethod
    def _legal_actions(board: AtaxxBoard) -> np.ndarray:
        valid_moves = board.get_valid_moves()
        if not valid_moves:
            return np.asarray([ACTION_SPACE.pass_index], dtype=np.int64)
        return np.fromiter(
            (ACTION_SPACE.encode(move) for move in valid_moves),
            dtype=np.int64,
            count=len(valid_moves),
        )

    @staticmethod
    def _softmax(values: np.ndarray) -> np.ndarray:
        shifted = values - float(np.max(values))
        exponentials = np.exp(shifted)
        total = float(np.sum(exponentials))
        if not np.isfinite(total) or total <= 0.0:
            return np.full(
                values.shape,
                1.0 / float(values.size),
                dtype=np.float32,
            )
        return np.asarray(exponentials / total, dtype=np.float32)

    @staticmethod
    def _populate_children(
        node: SearchNode,
        action_indices: np.ndarray,
        priors: np.ndarray,
    ) -> None:
        node.children = {
            int(action_index): SearchNode(float(prior))
            for action_index, prior in zip(action_indices, priors, strict=True)
        }

    def _remember(
        self,
        key: bytes,
        action_indices: np.ndarray,
        priors: np.ndarray,
        value: float,
    ) -> None:
        if self.cache_size == 0:
            return
        self.cache[key] = (action_indices.copy(), priors.copy(), value)
        self.cache.move_to_end(key)
        while len(self.cache) > self.cache_size:
            self.cache.popitem(last=False)

    def _expand_batch(
        self,
        leaves: list[tuple[SearchNode, AtaxxBoard]],
    ) -> list[float]:
        results = [0.0] * len(leaves)
        pending: list[tuple[int, SearchNode, np.ndarray, bytes, np.ndarray]] = []

        for index, (node, board) in enumerate(leaves):
            observation = board.get_observation()
            key = observation.tobytes()
            cached = self.cache.get(key)
            if cached is not None:
                action_indices, priors, value = cached
                self.cache.move_to_end(key)
                self._populate_children(node, action_indices, priors)
                results[index] = value
                continue

            action_indices = self._legal_actions(board)
            pending.append((index, node, action_indices, key, observation))

        if not pending:
            return results

        observations = np.stack(
            [observation for _, _, _, _, observation in pending],
            axis=0,
        ).astype(np.float32, copy=False)
        masks = np.zeros(
            (len(pending), ACTION_SPACE.size),
            dtype=np.float32,
        )
        for batch_index, (_, _, action_indices, _, _) in enumerate(pending):
            masks[batch_index, action_indices] = 1.0

        raw_outputs = self.session.run(
            ["policy", "value"],
            {"board": observations, "action_mask": masks},
        )
        policy_logits = np.asarray(raw_outputs[0], dtype=np.float32)
        values = np.asarray(raw_outputs[1], dtype=np.float32).reshape(-1)

        for batch_index, (
            result_index,
            node,
            action_indices,
            key,
            _,
        ) in enumerate(pending):
            legal_logits = policy_logits[batch_index, action_indices]
            priors = self._softmax(legal_logits)
            value = float(values[batch_index])
            self._populate_children(node, action_indices, priors)
            self._remember(key, action_indices, priors, value)
            results[result_index] = value

        return results

    def _select_child(self, node: SearchNode) -> tuple[int, SearchNode]:
        parent_value = node.value()
        visited_prior = sum(
            child.prior for child in node.children.values() if child.visits > 0
        )
        first_play_value = parent_value - self.fpu_reduction * math.sqrt(visited_prior)
        exploration_scale = math.sqrt(node.visits + 1)
        best_score = -math.inf
        candidates: list[tuple[int, SearchNode]] = []

        for action_index, child in node.children.items():
            exploitation = first_play_value if child.visits == 0 else -child.value()
            exploration = (
                self.c_puct * child.prior * exploration_scale / (1 + child.visits)
            )
            score = exploitation + exploration
            if score > best_score + 1e-12:
                best_score = score
                candidates = [(action_index, child)]
            elif math.isclose(score, best_score, rel_tol=0.0, abs_tol=1e-12):
                candidates.append((action_index, child))

        if not candidates:
            raise RuntimeError("Expanded search node has no selectable child.")
        return candidates[int(self.rng.integers(0, len(candidates)))]

    @staticmethod
    def _backpropagate(path: list[SearchNode], value: float) -> None:
        for node in reversed(path):
            node.visits += 1
            node.value_sum += value
            value = -value

    @staticmethod
    def _apply_virtual_loss(path: list[SearchNode]) -> None:
        for node in path[1:]:
            node.visits += 1
            node.value_sum += 1.0

    @staticmethod
    def _revert_virtual_loss(path: list[SearchNode]) -> None:
        for node in path[1:]:
            node.visits -= 1
            node.value_sum -= 1.0

    def search(
        self,
        board: AtaxxBoard,
        *,
        max_simulations: int = 72,
        time_budget_ms: int = 3_200,
    ) -> SearchResult:
        if board.is_game_over():
            raise ValueError("Cannot search a finished game.")

        started = time.perf_counter()
        deadline = started + max(250, time_budget_ms) / 1_000.0
        root = SearchNode(prior=1.0)
        root_value = self._expand_batch([(root, board)])[0]
        simulations = 0

        while simulations < max_simulations and time.perf_counter() < deadline:
            batch_size = min(
                self.leaf_batch_size,
                max_simulations - simulations,
            )
            pending: list[tuple[SearchNode, AtaxxBoard, list[SearchNode]]] = []

            for _ in range(batch_size):
                node = root
                simulation_board = board.copy()
                path = [node]

                while node.children:
                    action_index, node = self._select_child(node)
                    simulation_board.step(ACTION_SPACE.decode(action_index))
                    path.append(node)

                if simulation_board.is_game_over():
                    self._backpropagate(
                        path,
                        simulation_board.terminal_value_for_current_player(),
                    )
                else:
                    if len(path) > 1:
                        self._apply_virtual_loss(path)
                    pending.append((node, simulation_board, path))
                simulations += 1

            if pending:
                values = self._expand_batch(
                    [(node, leaf_board) for node, leaf_board, _ in pending]
                )
                for (_, _, path), value in zip(pending, values, strict=True):
                    if len(path) > 1:
                        self._revert_virtual_loss(path)
                    self._backpropagate(path, value)

        ranked = sorted(
            root.children.items(),
            key=lambda item: (item[1].visits, item[1].prior),
            reverse=True,
        )
        if not ranked:
            raise RuntimeError("NÉMESIS produced no legal action.")

        best_action, _ = ranked[0]
        duration_ms = round((time.perf_counter() - started) * 1_000)
        return SearchResult(
            move=ACTION_SPACE.decode(best_action),
            value=root_value,
            simulations=simulations,
            duration_ms=duration_ms,
        )
