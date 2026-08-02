import { NextResponse } from "next/server";
import {
  ARENA_SESSION_COOKIE,
  ARENA_SESSION_MAX_AGE_SECONDS,
  createArenaSessionToken,
  verifyArenaSessionToken
} from "@/lib/ataxx/session-token";
import { fetchPlayerWins, upsertArenaPlayer } from "@/lib/supabase/arena";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RequestBody = {
  name?: unknown;
  email?: unknown;
  locale?: unknown;
  consent?: unknown;
  company?: unknown;
};

function normalizeName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 40);
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().slice(0, 254);
}

function sessionCookie(token: string) {
  return {
    name: ARENA_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ARENA_SESSION_MAX_AGE_SECONDS
  };
}

export async function GET(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ARENA_SESSION_COOKIE}=`));
  const token = cookie?.slice(ARENA_SESSION_COOKIE.length + 1);
  const session = verifyArenaSessionToken(
    token ? decodeURIComponent(token) : undefined
  );

  if (!session) {
    return NextResponse.json(
      { player: null, wins: {} },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  try {
    const wins = await fetchPlayerWins(session.playerId);
    return NextResponse.json(
      { player: { displayName: session.displayName }, wins },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Arena session lookup failed", error);
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof body.company === "string" && body.company.trim()) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const displayName = normalizeName(body.name);
  const email = normalizeEmail(body.email);
  const locale = body.locale === "en" ? "en" : "es";

  if (displayName.length < 2) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  try {
    const player = await upsertArenaPlayer({ email, displayName, locale });
    const wins = await fetchPlayerWins(player.id);
    const token = createArenaSessionToken(player.id, player.display_name);

    const response = NextResponse.json(
      { player: { displayName: player.display_name }, wins },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
    response.cookies.set(sessionCookie(token));
    return response;
  } catch (error) {
    console.error("Arena session creation failed", error);
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}

export async function DELETE() {
  const response = NextResponse.json(
    { player: null, wins: {} },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
  response.cookies.set({ ...sessionCookie(""), maxAge: 0 });
  return response;
}
