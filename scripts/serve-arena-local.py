from __future__ import annotations

import argparse
import sys
from http.server import HTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from api.engine import handler


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the portfolio arena inference function locally."
    )
    parser.add_argument("--port", type=int, default=3011)
    args = parser.parse_args()
    print(f"arena listening on http://127.0.0.1:{args.port}")
    HTTPServer(("127.0.0.1", args.port), handler).serve_forever()


if __name__ == "__main__":
    main()
