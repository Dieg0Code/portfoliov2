"""Dump heuristic scores from the Python originals, for the TypeScript port to match.

Produces a fixture of random positions with, for every level, the score the
reference implementation assigns to every legal move. `verify-heuristics-port.ts`
recomputes the same numbers in TypeScript and diffs them.

Run from the ataxx repo so `src/` is importable:
    .venv/Scripts/python.exe ../portfolio/scripts/dump-heuristic-fixtures.py --out fixtures.json
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

ATAXX_ROOT = Path(__file__).resolve().parents[2] / "ataxx-zero-ai"
if str(ATAXX_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ATAXX_ROOT / "src"))

import numpy as np  # noqa: E402

from agents.heuristic import (  # noqa: E402
    HEURISTIC_LEVELS,
    _best_reply_penalty,
    _mobility_advantage,
    _score_apex,
    _score_gambit,
    _score_move,
    _score_sentinel,
)
from game.board import AtaxxBoard, BOARD_SIZE  # noqa: E402


def _score_for_level(board: AtaxxBoard, move, level: str) -> float:
    score = _score_move(board, move)
    if level in ("easy", "normal"):
        return score
    if level == "hard":
        scratch = board.copy()
        scratch.step(move)
        score -= 0.65 * _best_reply_penalty(scratch)
        score += 0.12 * _mobility_advantage(scratch)
        return score
    if level == "apex":
        return _score_apex(board, move)
    if level == "gambit":
        return _score_gambit(board, move)
    if level == "sentinel":
        return _score_sentinel(board, move)
    raise ValueError(level)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True)
    parser.add_argument("--positions", type=int, default=60)
    parser.add_argument("--seed", type=int, default=11)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    cases = []
    while len(cases) < args.positions:
        board = AtaxxBoard()
        history: list[list[int] | None] = []
        depth = rng.randint(0, 40)
        for _ in range(depth):
            if board.is_game_over():
                break
            moves = board.get_valid_moves()
            if not moves:
                board.step(None)
                history.append(None)
                continue
            move = rng.choice(moves)
            board.step(move)
            history.append(
                [
                    move[0] * BOARD_SIZE + move[1],
                    move[2] * BOARD_SIZE + move[3],
                ]
            )
        if board.is_game_over() or not board.get_valid_moves():
            continue

        levels = {}
        for level in HEURISTIC_LEVELS:
            levels[level] = [
                [
                    move[0] * BOARD_SIZE + move[1],
                    move[2] * BOARD_SIZE + move[3],
                    float(_score_for_level(board, move, level)),
                ]
                for move in board.get_valid_moves()
            ]
        cases.append({"history": history, "levels": levels})

    Path(args.out).write_text(
        json.dumps({"cases": cases}, indent=1),
        encoding="utf-8",
    )
    total = sum(len(c["levels"]["hard"]) for c in cases)
    print(f"{len(cases)} positions, {total} scored moves per level -> {args.out}")


if __name__ == "__main__":
    main()
