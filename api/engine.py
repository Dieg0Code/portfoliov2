from __future__ import annotations

import json
import threading
import time
from collections import OrderedDict, deque
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

from nemesis_runtime import (
    NemesisEngine,
    history_to_board,
    move_to_indices,
)
from nemesis_runtime.board import PLAYER_1, PLAYER_2

MODELS_DIR = Path(__file__).resolve().parent / "models"
MANIFEST_PATH = MODELS_DIR / "manifest.json"
MAX_REQUEST_BYTES = 32_768
MAX_REQUESTS_PER_MINUTE = 90
# Measured on Vercel Hobby: past this the move feels like the page hung.
SEARCH_BUDGET_MS = 4_500
SEARCH_SLOT_WAIT_SECONDS = 3.0
# One warm session at a time: every model is a separate ONNX graph and the
# function has far less memory than it would take to hold the whole genealogy.
ENGINE_CACHE_SIZE = 2

_manifest: dict[str, dict[str, Any]] | None = None
_manifest_lock = threading.Lock()
_engines: OrderedDict[str, NemesisEngine] = OrderedDict()
_engine_lock = threading.Lock()
_search_slot = threading.BoundedSemaphore(value=1)
_rate_lock = threading.Lock()
_request_times: deque[float] = deque()


def get_manifest() -> dict[str, dict[str, Any]]:
    """Opponent id -> served artifact. The only ids the function will load."""
    global _manifest
    if _manifest is not None:
        return _manifest
    with _manifest_lock:
        if _manifest is None:
            payload = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
            _manifest = {entry["id"]: entry for entry in payload["opponents"]}
    return _manifest


def get_engine(opponent_id: str) -> NemesisEngine:
    entry = get_manifest()[opponent_id]
    with _engine_lock:
        engine = _engines.get(opponent_id)
        if engine is not None:
            _engines.move_to_end(opponent_id)
            return engine

        engine = NemesisEngine(MODELS_DIR / entry["file"])
        _engines[opponent_id] = engine
        while len(_engines) > ENGINE_CACHE_SIZE:
            _engines.popitem(last=False)
        return engine


def permit_request() -> bool:
    now = time.monotonic()
    with _rate_lock:
        while _request_times and now - _request_times[0] >= 60.0:
            _request_times.popleft()
        if len(_request_times) >= MAX_REQUESTS_PER_MINUTE:
            return False
        _request_times.append(now)
        return True


class handler(BaseHTTPRequestHandler):
    server_version = "AtaxxArena/1.0"

    def _send_json(
        self,
        status: int,
        payload: dict[str, Any],
        *,
        started: float | None = None,
    ) -> None:
        body = json.dumps(
            payload,
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if started is not None:
            duration_ms = (time.perf_counter() - started) * 1_000
            self.send_header("Server-Timing", f"arena;dur={duration_ms:.1f}")
        self.end_headers()
        self.wfile.write(body)

    def _resolve_opponent(self, raw: object) -> str | None:
        if not isinstance(raw, str):
            return None
        return raw if raw in get_manifest() else None

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Allow", "GET, POST, OPTIONS")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def do_GET(self) -> None:
        """Warm a specific opponent so the first move of a match is not the cold one."""
        started = time.perf_counter()
        query = self.path.partition("?")[2]
        requested = None
        for pair in query.split("&"):
            key, _, value = pair.partition("=")
            if key == "opponent":
                requested = value
        opponent_id = self._resolve_opponent(requested)
        if opponent_id is None:
            self._send_json(
                200,
                {"ready": True, "opponents": sorted(get_manifest())},
                started=started,
            )
            return

        if not _search_slot.acquire(blocking=False):
            self._send_json(
                202,
                {"ready": False, "opponent": opponent_id, "reason": "busy"},
                started=started,
            )
            return
        try:
            get_engine(opponent_id).warmup()
            self._send_json(
                200,
                {"ready": True, "opponent": opponent_id},
                started=started,
            )
        except Exception as error:  # noqa: BLE001 - HTTP boundary must fail closed.
            print(f"arena warmup failed [{opponent_id}]: {type(error).__name__}: {error}")
            self._send_json(
                503,
                {"ready": False, "opponent": opponent_id, "reason": "unavailable"},
                started=started,
            )
        finally:
            _search_slot.release()

    def do_POST(self) -> None:
        started = time.perf_counter()
        if not permit_request():
            self._send_json(429, {"error": "rate_limited"}, started=started)
            return

        raw_length = self.headers.get("Content-Length", "0")
        try:
            content_length = int(raw_length)
        except ValueError:
            content_length = -1
        if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
            self._send_json(413, {"error": "invalid_body_size"}, started=started)
            return

        try:
            payload = json.loads(self.rfile.read(content_length))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"error": "invalid_json"}, started=started)
            return

        if not isinstance(payload, dict):
            self._send_json(400, {"error": "invalid_payload"}, started=started)
            return

        opponent_id = self._resolve_opponent(payload.get("opponent"))
        if opponent_id is None:
            self._send_json(
                422,
                {"error": "unknown_opponent", "opponents": sorted(get_manifest())},
                started=started,
            )
            return

        try:
            starting_player = payload.get("startingPlayer", PLAYER_1)
            if isinstance(starting_player, bool) or starting_player not in (
                PLAYER_1,
                PLAYER_2,
            ):
                raise ValueError("startingPlayer must be 1 or -1.")
            board = history_to_board(
                payload.get("history"),
                starting_player=starting_player,
            )
            if board.is_game_over():
                raise ValueError("The submitted game is already over.")
            if board.current_player != PLAYER_2:
                raise ValueError("The engine can only move as player two.")
        except ValueError as error:
            self._send_json(
                422,
                {
                    "error": "invalid_history",
                    "detail": str(error),
                    "opponent": opponent_id,
                },
                started=started,
            )
            return

        entry = get_manifest()[opponent_id]
        simulations = int(entry["simulations"])

        if not _search_slot.acquire(timeout=SEARCH_SLOT_WAIT_SECONDS):
            self._send_json(
                503,
                {"error": "busy", "opponent": opponent_id},
                started=started,
            )
            return

        try:
            result = get_engine(opponent_id).search(
                board,
                max_simulations=simulations,
                time_budget_ms=SEARCH_BUDGET_MS,
            )
            indices = move_to_indices(result.move)
            self._send_json(
                200,
                {
                    "move": list(indices) if indices is not None else None,
                    "pass": indices is None,
                    "opponent": opponent_id,
                    "label": entry.get("label", opponent_id),
                    "value": round(result.value, 6),
                    "simulations": result.simulations,
                    "searchMs": result.duration_ms,
                },
                started=started,
            )
        except Exception as error:  # noqa: BLE001 - HTTP boundary must preserve fallback.
            print(f"arena search failed [{opponent_id}]: {type(error).__name__}: {error}")
            self._send_json(
                503,
                {"error": "inference_failed", "opponent": opponent_id},
                started=started,
            )
        finally:
            _search_slot.release()

    def log_message(self, format: str, *args: object) -> None:
        return
