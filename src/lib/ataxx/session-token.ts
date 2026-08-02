import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed identity for the arena ladder.
 *
 * The email behind it is self-declared and never verified — this cookie says
 * "the same browser that typed this address", nothing stronger. It is fine for
 * a leaderboard among colleagues; it must never gate anything that matters.
 */

const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export const ARENA_SESSION_COOKIE = "ataxx_arena_session";

export type ArenaSessionPayload = {
  playerId: string;
  displayName: string;
  expiresAt: number;
};

function getSecret() {
  const secret =
    process.env.ARENA_SESSION_SECRET ?? process.env.CV_DOWNLOAD_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ARENA_SESSION_SECRET must contain at least 32 characters."
    );
  }
  return secret;
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function createArenaSessionToken(
  playerId: string,
  displayName: string
) {
  const payload: ArenaSessionPayload = {
    playerId,
    displayName,
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyArenaSessionToken(
  token: string | undefined
): ArenaSessionPayload | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = Buffer.from(sign(encodedPayload));
  const received = Buffer.from(signature);
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as ArenaSessionPayload;

    if (
      typeof payload.playerId !== "string" ||
      typeof payload.displayName !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export const ARENA_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
