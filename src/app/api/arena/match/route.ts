import { NextResponse } from "next/server";
import {
  AtaxxBoard,
  MAX_HALF_MOVES,
  PLAYER_1,
  PLAYER_2,
  moveFromIndices
} from "@/lib/ataxx/board";
import { LADDER_BY_ID } from "@/lib/ataxx/ladder";
import {
  ARENA_SESSION_COOKIE,
  verifyArenaSessionToken
} from "@/lib/ataxx/session-token";
import { fetchPlayerWins, recordArenaMatch } from "@/lib/supabase/arena";

export const runtime = "nodejs";

// A legal game can never exceed the ply cap, so anything longer is malformed.
const MAX_SUBMITTED_MOVES = MAX_HALF_MOVES;

type RequestBody = {
  opponentId?: unknown;
  moves?: unknown;
  engineFailures?: unknown;
  durationMs?: unknown;
};

function readSession(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ARENA_SESSION_COOKIE}=`));
  const token = cookie?.slice(ARENA_SESSION_COOKIE.length + 1);
  return verifyArenaSessionToken(token ? decodeURIComponent(token) : undefined);
}

/**
 * Replay the submitted game instead of trusting a reported result.
 *
 * This does not make the ladder tamper-proof — a determined player could still
 * hand-craft a legal game where the engine plays badly — but it does mean every
 * stored row is a real, finished, legal game, which is what makes the match log
 * usable as a training corpus later.
 */
function replay(rawMoves: unknown) {
  if (!Array.isArray(rawMoves) || rawMoves.length > MAX_SUBMITTED_MOVES) {
    throw new Error("invalid_moves");
  }

  const board = new AtaxxBoard();
  const moves: (number[] | null)[] = [];

  for (const entry of rawMoves) {
    if (board.isGameOver()) throw new Error("moves_after_game_over");

    if (entry === null) {
      board.step(null);
      moves.push(null);
      continue;
    }

    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      !Number.isInteger(entry[0]) ||
      !Number.isInteger(entry[1]) ||
      entry[0] < 0 ||
      entry[0] > 48 ||
      entry[1] < 0 ||
      entry[1] > 48
    ) {
      throw new Error("invalid_move_entry");
    }

    const move = moveFromIndices(entry[0], entry[1]);
    const legal = board
      .getValidMoves()
      .some(
        (candidate) =>
          candidate[0] === move[0] &&
          candidate[1] === move[1] &&
          candidate[2] === move[2] &&
          candidate[3] === move[3]
      );
    if (!legal) throw new Error("illegal_move");

    board.step(move);
    moves.push([entry[0], entry[1]]);
  }

  if (!board.isGameOver()) throw new Error("game_not_finished");

  // The human always opens as player one.
  const playerPieces = board.countPieces(PLAYER_1);
  const opponentPieces = board.countPieces(PLAYER_2);
  const result = board.resultForPlayerOne();
  const outcome =
    result === 0 ? "draw" : result === PLAYER_1 ? "win" : "loss";

  return {
    moves,
    outcome,
    playerPieces,
    opponentPieces,
    halfMoves: board.halfMoves
  } as const;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const opponentId =
    typeof body.opponentId === "string" ? body.opponentId : "";
  const rung = LADDER_BY_ID.get(opponentId);
  if (!rung) {
    return NextResponse.json({ error: "unknown_opponent" }, { status: 422 });
  }

  let replayed: ReturnType<typeof replay>;
  try {
    replayed = replay(body.moves);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "invalid_moves" },
      { status: 422 }
    );
  }

  const engineFailures =
    Number.isInteger(body.engineFailures) && (body.engineFailures as number) >= 0
      ? Math.min(body.engineFailures as number, 200)
      : 0;
  const durationMs =
    Number.isInteger(body.durationMs) && (body.durationMs as number) >= 0
      ? Math.min(body.durationMs as number, 24 * 60 * 60 * 1000)
      : null;

  try {
    await recordArenaMatch({
      playerId: session.playerId,
      opponentId: rung.id,
      opponentKind: rung.kind,
      outcome: replayed.outcome,
      playerPieces: replayed.playerPieces,
      opponentPieces: replayed.opponentPieces,
      halfMoves: replayed.halfMoves,
      moves: replayed.moves,
      engineFailures,
      durationMs
    });

    const wins = await fetchPlayerWins(session.playerId);
    return NextResponse.json(
      {
        outcome: replayed.outcome,
        playerPieces: replayed.playerPieces,
        opponentPieces: replayed.opponentPieces,
        wins
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Arena match save failed", error);
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
