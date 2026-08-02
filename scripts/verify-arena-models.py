"""Verify the exported arena models before they are served.

Three checks, because shipping a weaker model than the one advertised would be
a lie the page tells on every match:

  parity  int8 vs fp32 on the same positions: top-1 policy agreement and value
          error. Catches quantization damage without playing a single game.
  bench   wall-clock per search, which is what decides how many simulations fit
          inside the serverless time budget.
  duel    two models play each other through the real runtime.

Run with an interpreter that has numpy + onnxruntime, e.g. the ataxx repo venv:
    ../ataxx-zero-ai/.venv/Scripts/python.exe scripts/verify-arena-models.py parity --bundle ...
"""
from __future__ import annotations

import argparse
import json
import random
import sys
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from nemesis_runtime import NemesisEngine  # noqa: E402
from nemesis_runtime.board import (  # noqa: E402
    PLAYER_1,
    AtaxxBoard,
)
from nemesis_runtime.engine import ACTION_SPACE  # noqa: E402


def _load_manifest(bundle: Path) -> list[dict]:
    payload = json.loads((bundle / "manifest.json").read_text(encoding="utf-8"))
    return payload["models"]


def _random_positions(count: int, seed: int = 7) -> list[AtaxxBoard]:
    """Positions from random playouts, spread across the whole game arc."""
    rng = random.Random(seed)
    positions: list[AtaxxBoard] = []
    while len(positions) < count:
        board = AtaxxBoard()
        depth = rng.randint(0, 45)
        for _ in range(depth):
            if board.is_game_over():
                break
            moves = board.get_valid_moves()
            board.step(rng.choice(moves) if moves else None)
        if not board.is_game_over():
            positions.append(board)
    return positions


def _session(path: Path) -> ort.InferenceSession:
    options = ort.SessionOptions()
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    options.intra_op_num_threads = 2
    return ort.InferenceSession(
        str(path),
        sess_options=options,
        providers=["CPUExecutionProvider"],
    )


def _infer(
    session: ort.InferenceSession,
    boards: list[AtaxxBoard],
) -> tuple[np.ndarray, np.ndarray]:
    observations = np.stack([b.get_observation() for b in boards]).astype(np.float32)
    masks = np.zeros((len(boards), ACTION_SPACE.size), dtype=np.float32)
    for row, board in enumerate(boards):
        for move in board.get_valid_moves():
            masks[row, ACTION_SPACE.encode(move)] = 1.0
        if not board.get_valid_moves():
            masks[row, ACTION_SPACE.pass_index] = 1.0
    policy, value = session.run(["policy", "value"], {"board": observations, "action_mask": masks})
    return np.asarray(policy), np.asarray(value).reshape(-1)


def command_parity(args: argparse.Namespace) -> int:
    bundle = Path(args.bundle)
    positions = _random_positions(args.positions)
    failures = 0

    print(f"parity on {len(positions)} positions\n")
    print("conf = how peaked the fp32 policy itself is (top-1 probability).")
    print("A flat-policy model disagrees on argmax by coin flip, so the verdict")
    print("rides on TV distance between distributions and on value error.\n")
    header = (
        f"{'model':16s} {'conf':>6s} {'top1':>7s} {'TV':>7s} "
        f"{'val MAE':>8s} {'verdict':>9s}"
    )
    print(header)
    print("-" * len(header))

    for entry in _load_manifest(bundle):
        if "int8" not in entry:
            continue
        fp32 = _session(bundle / entry["fp32"]["file"])
        int8 = _session(bundle / entry["int8"]["file"])

        policy_a, value_a = _infer(fp32, positions)
        policy_b, value_b = _infer(int8, positions)

        top1 = 0
        confidences: list[float] = []
        distances: list[float] = []
        for row, board in enumerate(positions):
            legal = [ACTION_SPACE.encode(m) for m in board.get_valid_moves()]
            if not legal:
                continue
            logits_a = policy_a[row, legal]
            logits_b = policy_b[row, legal]
            probs_a = _softmax(logits_a)
            probs_b = _softmax(logits_b)
            top1 += int(int(np.argmax(logits_a)) == int(np.argmax(logits_b)))
            confidences.append(float(np.max(probs_a)))
            # Total variation: half the L1 gap between the two move distributions.
            distances.append(float(0.5 * np.sum(np.abs(probs_a - probs_b))))

        top1_rate = top1 / len(positions)
        confidence = float(np.mean(confidences))
        distance = float(np.mean(distances))
        value_mae = float(np.mean(np.abs(value_a - value_b)))
        ok = distance <= args.max_tv and value_mae <= args.max_value_mae
        failures += int(not ok)
        print(
            f"{entry['codename']:16s} {confidence:5.1%} {top1_rate:6.1%} "
            f"{distance:7.4f} {value_mae:8.4f} {'ok' if ok else 'DEGRADED':>9s}"
        )

    print()
    if failures:
        print(f"{failures} model(s) degraded past the threshold.")
    return 1 if failures else 0


def _softmax(values: np.ndarray) -> np.ndarray:
    shifted = values - float(np.max(values))
    exponentials = np.exp(shifted)
    return exponentials / float(np.sum(exponentials))


def command_bench(args: argparse.Namespace) -> int:
    bundle = Path(args.bundle)
    board = AtaxxBoard()
    for move in board.get_valid_moves()[:1]:
        board.step(move)

    print(f"search bench: {args.sims} sims, {args.repeat} repeats\n")
    for name in args.model:
        path = bundle / name
        engine = NemesisEngine(path)
        engine.warmup()
        timings = []
        for _ in range(args.repeat):
            started = time.perf_counter()
            engine.search(board.copy(), max_simulations=args.sims, time_budget_ms=60_000)
            timings.append((time.perf_counter() - started) * 1000)
        print(
            f"{name:32s} median {sorted(timings)[len(timings) // 2]:7.0f} ms"
            f"   min {min(timings):7.0f} ms"
        )
    return 0


def command_duel(args: argparse.Namespace) -> int:
    bundle = Path(args.bundle)
    engine_a = NemesisEngine(bundle / args.model_a)
    engine_b = NemesisEngine(bundle / args.model_b)
    engine_a.warmup()
    engine_b.warmup()

    wins_a = wins_b = draws = 0
    for game_index in range(args.games):
        # Alternate colours so an opening advantage cannot decide the match.
        a_is_player_one = game_index % 2 == 0
        board = AtaxxBoard()
        while not board.is_game_over():
            a_to_move = (board.current_player == PLAYER_1) == a_is_player_one
            engine = engine_a if a_to_move else engine_b
            if not board.has_valid_moves():
                board.step(None)
                continue
            result = engine.search(
                board,
                max_simulations=args.sims,
                time_budget_ms=60_000,
            )
            board.step(result.move)

        outcome = board.result_for_player_one()
        if outcome == 0:
            draws += 1
        elif (outcome == PLAYER_1) == a_is_player_one:
            wins_a += 1
        else:
            wins_b += 1
        print(
            f"  game {game_index + 1:2d}/{args.games}: "
            f"{wins_a}-{wins_b}-{draws}",
            flush=True,
        )

    score = (wins_a + 0.5 * draws) / args.games
    print(
        f"\n{args.model_a} vs {args.model_b} @ {args.sims} sims: "
        f"{wins_a}-{wins_b}-{draws} (score {score:.3f} for A)"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    parity = sub.add_parser("parity", help="int8 vs fp32 agreement")
    parity.add_argument("--bundle", required=True)
    parity.add_argument("--positions", type=int, default=200)
    parity.add_argument("--max-tv", type=float, default=0.06)
    parity.add_argument("--max-value-mae", type=float, default=0.08)
    parity.set_defaults(func=command_parity)

    bench = sub.add_parser("bench", help="search wall-clock")
    bench.add_argument("--bundle", required=True)
    bench.add_argument("--model", action="append", required=True)
    bench.add_argument("--sims", type=int, default=160)
    bench.add_argument("--repeat", type=int, default=5)
    bench.set_defaults(func=command_bench)

    duel = sub.add_parser("duel", help="head to head through the real runtime")
    duel.add_argument("--bundle", required=True)
    duel.add_argument("--model-a", required=True)
    duel.add_argument("--model-b", required=True)
    duel.add_argument("--games", type=int, default=20)
    duel.add_argument("--sims", type=int, default=160)
    duel.set_defaults(func=command_duel)

    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
