"""Assemble the served model bundle into `api/models/`.

Picks a precision per generation and writes the manifest the inference function
validates opponent ids against.

int8 is the default because the whole genealogy in fp32 is ~250 MB, which does
not fit in a serverless function alongside onnxruntime and numpy. Generations
where quantization measurably changed the network — see `verify-arena-models.py
parity` — are shipped in fp32 instead; they are small enough that it is free.

    ../ataxx-zero-ai/.venv/Scripts/python.exe scripts/assemble-arena-bundle.py \
        --bundle ../ataxx-zero-ai/build/arena
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = REPO_ROOT / "api" / "models"

# Quantization moved cerbero and plomo past the parity thresholds (value error
# 0.114 and TV distance 0.071). Both are small, so they ship full precision.
#
# nemesis-192 is here for a different reason: it passed parity, but in a direct
# duel the fp32 copy beat its own int8 copy 7-2 over 9 games. That is a small
# sample (an even matchup produces it ~9% of the time), so it is suggestive
# rather than proven — but this is the rung the page advertises as the latest
# checkpoint that exists, and 43 MB is a cheap price for not shipping a champion
# that is quietly weaker than the one it claims to be.
FP32_OVERRIDES = {"cerbero", "plomo", "nemesis-192"}

# Every generation searches at the same depth, so the ladder ordering reflects
# the models rather than a handicap we invented. 160 rather than the registry's
# evaluation depth of 256: measured on Vercel, deeper search makes the page feel
# frozen while waiting for a move. The models play a touch below their published
# eval numbers, which is the right trade for a game people actually play.
SIMULATIONS = 160

# Ladder order, mirroring src/lib/ataxx/ladder.ts.
LADDER_ORDER = [
    "golem",
    "espectro",
    "icaro",
    "augur",
    "augur-ocaso",
    "cerbero",
    "leteo",
    "legion",
    "quimera",
    "cisma",
    "plomo",
    "ariete",
    "vispera",
    "vertice",
    "nemesis",
    "nemesis-192",
]

LABELS = {
    "golem": "GOLEM",
    "espectro": "ESPECTRO",
    "icaro": "ÍCARO",
    "augur": "AUGUR",
    "augur-ocaso": "AUGUR · OCASO",
    "cerbero": "CERBERO",
    "leteo": "LETEO",
    "legion": "LEGIÓN",
    "quimera": "QUIMERA",
    "cisma": "CISMA",
    "plomo": "PLOMO",
    "ariete": "ARIETE",
    "vispera": "VÍSPERA",
    "vertice": "VÉRTICE",
    "nemesis": "NÉMESIS",
    "nemesis-192": "NÉMESIS · 192",
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", required=True, help="Directory produced by export_arena_bundle.py")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    bundle = Path(args.bundle).resolve()
    source = json.loads((bundle / "manifest.json").read_text(encoding="utf-8"))
    by_codename = {entry["codename"]: entry for entry in source["models"]}

    missing = [name for name in LADDER_ORDER if name not in by_codename]
    if missing:
        raise SystemExit(f"Bundle is missing generations: {', '.join(missing)}")

    if not args.dry_run:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        for stale in MODELS_DIR.glob("*.onnx"):
            stale.unlink()

    opponents = []
    total_bytes = 0
    print(f"{'model':16s} {'precision':>9s} {'size':>9s}")
    print("-" * 38)

    for codename in LADDER_ORDER:
        entry = by_codename[codename]
        precision = "fp32" if codename in FP32_OVERRIDES else "int8"
        if precision not in entry:
            precision = "fp32"

        artifact = entry[precision]
        source_path = bundle / artifact["file"]
        target_name = f"{codename}.onnx"
        total_bytes += artifact["bytes"]

        if not args.dry_run:
            shutil.copy2(source_path, MODELS_DIR / target_name)

        opponents.append(
            {
                "id": codename,
                "label": LABELS[codename],
                "file": target_name,
                "precision": precision,
                "simulations": SIMULATIONS,
                "version": entry.get("version"),
                "iter": entry.get("iter"),
                "sha256": artifact["sha256"],
            }
        )
        print(f"{codename:16s} {precision:>9s} {artifact['bytes'] / 1e6:8.1f} MB")

    manifest = {
        "schema_version": 1,
        "simulations": SIMULATIONS,
        "opponents": opponents,
    }

    if not args.dry_run:
        (MODELS_DIR / "manifest.json").write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    print("-" * 38)
    print(f"{len(opponents)} models, {total_bytes / 1e6:.1f} MB of weights")
    print("Vercel serverless limit is 250 MB unzipped; onnxruntime + numpy add ~85 MB.")
    if args.dry_run:
        print("(dry run: nothing written)")


if __name__ == "__main__":
    main()
