from __future__ import annotations

import unittest
from pathlib import Path

import numpy as np

from nemesis_runtime import NemesisEngine, history_to_board
from nemesis_runtime.board import PLAYER_1, PLAYER_2

MODEL_PATH = (
    Path(__file__).resolve().parents[1] / "api" / "models" / "nemesis-192.onnx"
)


class BoardHistoryTests(unittest.TestCase):
    def test_history_reconstructs_temporal_channels(self) -> None:
        board = history_to_board([[0, 8], [6, 4]])
        observation = board.get_observation()

        self.assertEqual(board.half_moves, 2)
        self.assertEqual(observation.shape, (15, 7, 7))
        self.assertEqual(float(observation[13, 0, 4]), 1.0)
        self.assertEqual(float(observation[14, 1, 1]), 1.0)
        self.assertEqual(int(np.sum(observation[13])), 1)
        self.assertEqual(int(np.sum(observation[14])), 1)

    def test_history_rejects_illegal_moves(self) -> None:
        with self.assertRaisesRegex(ValueError, "not a legal move"):
            history_to_board([[0, 48]])

    def test_player_two_can_open_without_an_illegal_pass(self) -> None:
        board = history_to_board([], starting_player=PLAYER_2)

        self.assertEqual(board.current_player, PLAYER_2)
        self.assertEqual(board.half_moves, 0)
        self.assertTrue(board.has_valid_moves(PLAYER_2))
        self.assertTrue(board.has_valid_moves(PLAYER_1))

    def test_ply_cap_ends_the_game_as_a_draw(self) -> None:
        """Without this cap a shuffling game never terminates."""
        from nemesis_runtime.board import MAX_HALF_MOVES, AtaxxBoard

        board = AtaxxBoard()
        board.half_moves = MAX_HALF_MOVES - 1
        self.assertFalse(board.is_game_over())

        board.half_moves = MAX_HALF_MOVES
        self.assertTrue(board.is_game_over())
        self.assertEqual(board.result_for_player_one(), 0)

    def test_ply_cap_matches_the_browser_board(self) -> None:
        """The two boards must agree or a game ends differently on each side."""
        from nemesis_runtime.board import MAX_HALF_MOVES

        source = (
            Path(__file__).resolve().parents[1]
            / "src"
            / "lib"
            / "ataxx"
            / "board.ts"
        ).read_text(encoding="utf-8")
        self.assertIn(f"MAX_HALF_MOVES = {MAX_HALF_MOVES};", source)


@unittest.skipUnless(MODEL_PATH.exists(), "NÉMESIS ONNX artifact is missing")
class NemesisInferenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = NemesisEngine(MODEL_PATH)

    def test_search_returns_a_legal_player_two_move(self) -> None:
        board = history_to_board([[0, 8]])
        self.assertEqual(board.current_player, PLAYER_2)

        result = self.engine.search(
            board,
            max_simulations=8,
            time_budget_ms=1_000,
        )

        self.assertIn(result.move, board.get_valid_moves())
        self.assertEqual(result.simulations, 8)
        self.assertTrue(np.isfinite(result.value))


if __name__ == "__main__":
    unittest.main()
