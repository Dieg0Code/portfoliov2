from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from api.engine import get_engine, get_manifest  # noqa: E402
from nemesis_runtime.board import PLAYER_2, AtaxxBoard  # noqa: E402

MANIFEST_PATH = REPO_ROOT / "api" / "models" / "manifest.json"


@unittest.skipUnless(MANIFEST_PATH.exists(), "arena model bundle is missing")
class ArenaManifestTests(unittest.TestCase):
    def test_every_declared_model_file_exists(self) -> None:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        for entry in manifest["opponents"]:
            path = MANIFEST_PATH.parent / entry["file"]
            self.assertTrue(path.is_file(), f"missing artifact for {entry['id']}")

    def test_ladder_ids_match_the_typescript_ladder(self) -> None:
        """The browser sends ids from ladder.ts; the function only accepts these."""
        ladder = (REPO_ROOT / "src" / "lib" / "ataxx" / "ladder.ts").read_text(
            encoding="utf-8"
        )
        for opponent_id in get_manifest():
            self.assertIn(
                f'id: "{opponent_id}"',
                ladder,
                f"{opponent_id} is served but absent from the ladder",
            )


@unittest.skipUnless(MANIFEST_PATH.exists(), "arena model bundle is missing")
class ArenaInferenceTests(unittest.TestCase):
    def test_every_generation_answers_with_a_legal_move(self) -> None:
        """Each exported generation must load and produce a playable reply.

        This is the check that catches an architecture whose export silently
        broke: a model that cannot answer would be an unbeatable rung.
        """
        board = AtaxxBoard()
        board.step(board.get_valid_moves()[0])
        self.assertEqual(board.current_player, PLAYER_2)

        for opponent_id in get_manifest():
            with self.subTest(opponent=opponent_id):
                engine = get_engine(opponent_id)
                result = engine.search(
                    board.copy(),
                    max_simulations=8,
                    time_budget_ms=10_000,
                )
                self.assertIn(result.move, board.get_valid_moves())


if __name__ == "__main__":
    unittest.main()
